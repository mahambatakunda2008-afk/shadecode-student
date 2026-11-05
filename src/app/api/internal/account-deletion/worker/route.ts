import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_PRIVATE_BUCKETS = new Set([
  "shadecode-backups",
  "community-uploads-pending",
]);
const STORAGE_REMOVE_BATCH_SIZE = 100;
const MAX_ATTEMPTS = 5;

type ClaimedDeletion = {
  request_id: string;
  user_id: string;
  lease_token: string;
  attempt_count: number;
};

function hasWorkerSecret(request: Request): boolean {
  const expected = process.env.ACCOUNT_DELETION_WORKER_SECRET;
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+([^\s]+)$/i);
  if (!expected || !match) return false;

  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(match[1]);
  return expectedBytes.length === providedBytes.length
    && timingSafeEqual(expectedBytes, providedBytes);
}

function safeErrorCode(error: { code?: string | null } | null | undefined): string {
  const code = error?.code;
  return typeof code === "string" && /^[a-zA-Z0-9_.-]{1,64}$/.test(code)
    ? code
    : "worker_error";
}


async function renewLease(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  job: ClaimedDeletion,
) {
  const { data, error } = await admin.rpc("renew_account_deletion_request", {
    p_request_id: job.request_id,
    p_lease_token: job.lease_token,
    p_lease_seconds: 300,
  });
  if (error || data !== true) {
    throw Object.assign(new Error("lease_lost"), { code: error?.code ?? "lease_lost" });
  }
}

async function releaseLease(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  job: ClaimedDeletion,
  retry: boolean,
  errorCode: string,
) {
  await admin.rpc("release_account_deletion_request", {
    p_request_id: job.request_id,
    p_lease_token: job.lease_token,
    p_error_code: errorCode,
    p_retry: retry && job.attempt_count < MAX_ATTEMPTS,
  });
}

export async function POST(request: Request) {
  if (!hasWorkerSecret(request)) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (process.env.ACCOUNT_DELETION_WORKER_ENABLED !== "true") {
    return NextResponse.json(
      { error: "Account deletion worker is disabled." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Account deletion worker is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  let job: ClaimedDeletion | null = null;
  let authDeleted = false;

  try {
    // Recover the narrow crash window where Auth deletion succeeded but the
    // worker died before it could mark the request complete.
    const recovery = await admin.rpc("recover_completed_account_deletion_requests");
    if (recovery.error) throw Object.assign(new Error("recovery_unavailable"), { code: recovery.error.code });

    const claim = await admin.rpc("claim_account_deletion_request", {
      p_lease_seconds: 300,
    });
    if (claim.error) throw Object.assign(new Error("claim_unavailable"), { code: claim.error.code });

    const first = Array.isArray(claim.data) ? claim.data[0] : null;
    if (!first) {
      return NextResponse.json(
        { processed: false, reason: "no_pending_request" },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    job = first as ClaimedDeletion;
    if (
      !job.request_id
      || !job.user_id
      || !job.lease_token
      || !Number.isInteger(job.attempt_count)
    ) {
      throw Object.assign(new Error("invalid_claim_payload"), { code: "invalid_claim_payload" });
    }

    await renewLease(admin, job);

    // The preview is read-only. Refuse to continue if the inventory RPC is
    // missing or malformed, rather than guessing what data to remove.
    const preview = await admin.rpc("preview_account_deletion", {
      p_user_id: job.user_id,
    });
    if (preview.error || !Array.isArray(preview.data) || preview.data.length === 0) {
      throw Object.assign(new Error("inventory_unavailable"), {
        code: preview.error?.code ?? "inventory_unavailable",
      });
    }

    await renewLease(admin, job);
    const manifest = await admin.rpc("account_deletion_storage_manifest", {
      p_user_id: job.user_id,
    });
    if (manifest.error || !Array.isArray(manifest.data)) {
      throw Object.assign(new Error("storage_manifest_unavailable"), {
        code: manifest.error?.code ?? "storage_manifest_unavailable",
      });
    }

    const objectsByBucket = new Map<string, Set<string>>();
    for (const item of manifest.data as Array<{ bucket_id?: string; object_name?: string }>) {
      const bucket = item.bucket_id;
      const objectName = item.object_name;
      if (
        !bucket
        || !objectName
        || !ALLOWED_PRIVATE_BUCKETS.has(bucket)
        || !objectName.startsWith(`${job.user_id}/`)
        || objectName.split("/").some((segment) => segment === ".." || segment === ".")
      ) {
        throw Object.assign(new Error("unsafe_storage_manifest"), { code: "unsafe_storage_manifest" });
      }
      const names = objectsByBucket.get(bucket) ?? new Set<string>();
      names.add(objectName);
      objectsByBucket.set(bucket, names);
    }

    // Remove exact objects through the Storage API. Shared past-papers is not
    // in the allowlist and can never be deleted by this worker.
    for (const [bucket, names] of objectsByBucket) {
      const objectNames = [...names];
      for (let offset = 0; offset < objectNames.length; offset += STORAGE_REMOVE_BATCH_SIZE) {
        await renewLease(admin, job);
        const batch = objectNames.slice(offset, offset + STORAGE_REMOVE_BATCH_SIZE);
        const { error } = await admin.storage.from(bucket).remove(batch);
        if (error) throw Object.assign(new Error("storage_cleanup_failed"), { code: error.code });
      }
    }

    // This is one database transaction, bound to the active lease. It removes
    // NO ACTION blockers and account-owned non-FK rows but deliberately leaves
    // Auth deletion until after database and Storage cleanup have succeeded.
    await renewLease(admin, job);
    const cleanup = await admin.rpc("execute_account_deletion_cleanup", {
      p_request_id: job.request_id,
      p_lease_token: job.lease_token,
    });
    if (cleanup.error) {
      throw Object.assign(new Error("database_cleanup_failed"), { code: cleanup.error.code });
    }

    // Auth deletion is the final destructive step. The queue FK sets user_id
    // to NULL, allowing the completion RPC and crash-recovery RPC to verify it.
    await renewLease(admin, job);
    const deletion = await admin.auth.admin.deleteUser(job.user_id);
    if (deletion.error) {
      throw Object.assign(new Error("auth_deletion_failed"), { code: deletion.error.code });
    }
    authDeleted = true;

    const completion = await admin.rpc("complete_account_deletion_request", {
      p_request_id: job.request_id,
      p_lease_token: job.lease_token,
    });
    if (completion.error || completion.data !== true) {
      // Auth is already gone. Do not requeue a null-user request; the recovery
      // RPC on the next invocation will finalize it.
      await admin.rpc("recover_completed_account_deletion_requests");
      return NextResponse.json(
        { processed: true, completed: false, recoveryRequired: true },
        { status: 202, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { processed: true, completed: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const code = safeErrorCode(error as { code?: string | null });
    console.error("[AccountDeletionWorker] Job failed", { code });

    if (job && !authDeleted) {
      await releaseLease(admin, job, true, code);
    } else if (authDeleted) {
      await admin.rpc("recover_completed_account_deletion_requests");
    }

    return NextResponse.json(
      { error: "Account deletion processing did not finish. The request remains safely recoverable." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
