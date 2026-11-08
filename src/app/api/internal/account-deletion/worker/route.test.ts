import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpcMock, removeMock, storageFromMock, deleteUserMock, adminClient } = vi.hoisted(() => {
  const rpcMock = vi.fn();
  const removeMock = vi.fn();
  const storageFromMock = vi.fn(() => ({ remove: removeMock }));
  const deleteUserMock = vi.fn();
  const adminClient = {
    rpc: rpcMock,
    storage: { from: storageFromMock },
    auth: { admin: { deleteUser: deleteUserMock } },
  };
  return { rpcMock, removeMock, storageFromMock, deleteUserMock, adminClient };
});

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => adminClient,
}));

import { POST } from "./route";

const JOB = {
  request_id: "request-1",
  user_id: "user-1",
  lease_token: "lease-1",
  attempt_count: 1,
};

function request(authorization = "Bearer worker-secret") {
  return new Request("https://shadecodestudent.vercel.app/api/internal/account-deletion/worker", {
    method: "POST",
    headers: { authorization },
  });
}

function configureSuccessfulJob() {
  rpcMock.mockImplementation(async (name: string) => {
    switch (name) {
      case "recover_completed_account_deletion_requests":
        return { data: 0, error: null };
      case "claim_account_deletion_request":
        return { data: [JOB], error: null };
      case "renew_account_deletion_request":
        return { data: true, error: null };
      case "preview_account_deletion":
        return { data: [{ resource: "profiles", matching_rows: 1 }], error: null };
      case "account_deletion_storage_manifest":
        return {
          data: [
            { bucket_id: "shadecode-backups", object_name: "user-1/latest.scsync", source: "user_uid_prefix" },
            { bucket_id: "community-uploads-pending", object_name: "user-1/upload.pdf", source: "user_uid_prefix" },
            { bucket_id: "community-uploads-pending", object_name: "contributor-files/upload-77.pdf", source: "community_uploads.file_path" },
          ],
          error: null,
        };
      case "execute_account_deletion_cleanup":
        return { data: { database_cleanup: "completed" }, error: null };
      case "complete_account_deletion_request":
        return { data: true, error: null };
      case "release_account_deletion_request":
        return { data: true, error: null };
      default:
        throw new Error(`Unexpected RPC: ${name}`);
    }
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ACCOUNT_DELETION_WORKER_SECRET = "worker-secret";
  process.env.ACCOUNT_DELETION_WORKER_ENABLED = "true";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";
  removeMock.mockResolvedValue({ data: [], error: null });
  deleteUserMock.mockResolvedValue({ data: {}, error: null });
  configureSuccessfulJob();
});

describe("POST /api/internal/account-deletion/worker", () => {
  it("rejects an invalid worker secret", async () => {
    const response = await POST(request("Bearer wrong-secret"));
    expect(response.status).toBe(401);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("does not run while the worker feature flag is disabled", async () => {
    process.env.ACCOUNT_DELETION_WORKER_ENABLED = "false";
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("returns cleanly when there is no pending request", async () => {
    rpcMock.mockImplementation(async (name: string) => {
      if (name === "recover_completed_account_deletion_requests") return { data: 0, error: null };
      if (name === "claim_account_deletion_request") return { data: [], error: null };
      throw new Error(`Unexpected RPC: ${name}`);
    });

    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ processed: false, reason: "no_pending_request" });
    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it("removes only allowlisted private objects, cleans the database, then deletes Auth last", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ processed: true, completed: true });

    expect(storageFromMock).toHaveBeenCalledWith("shadecode-backups");
    expect(storageFromMock).toHaveBeenCalledWith("community-uploads-pending");
    expect(storageFromMock).not.toHaveBeenCalledWith("past-papers");

    const cleanupIndex = rpcMock.mock.calls.findIndex(([name]) => name === "execute_account_deletion_cleanup");
    const completeIndex = rpcMock.mock.calls.findIndex(([name]) => name === "complete_account_deletion_request");
    expect(cleanupIndex).toBeGreaterThan(-1);
    expect(deleteUserMock).toHaveBeenCalledWith("user-1");
    expect(completeIndex).toBeGreaterThan(cleanupIndex);
    expect(rpcMock).toHaveBeenCalledWith("execute_account_deletion_cleanup", {
      p_request_id: "request-1",
      p_lease_token: "lease-1",
    });
  });

  it("treats already-missing private objects as an idempotent success", async () => {
    removeMock.mockResolvedValue({ data: null, error: { code: "404", statusCode: "404", message: "Object not found" } });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(deleteUserMock).toHaveBeenCalledWith("user-1");
  });

  it("fails closed on an unexpected Storage bucket and never reaches Auth deletion", async () => {
    rpcMock.mockImplementation(async (name: string) => {
      if (name === "recover_completed_account_deletion_requests") return { data: 0, error: null };
      if (name === "claim_account_deletion_request") return { data: [JOB], error: null };
      if (name === "renew_account_deletion_request") return { data: true, error: null };
      if (name === "preview_account_deletion") return { data: [{ resource: "profiles" }], error: null };
      if (name === "account_deletion_storage_manifest") {
        return { data: [{ bucket_id: "past-papers", object_name: "shared/paper.pdf", source: "user_uid_prefix" }], error: null };
      }
      if (name === "release_account_deletion_request") return { data: true, error: null };
      throw new Error(`Unexpected RPC: ${name}`);
    });

    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(storageFromMock).not.toHaveBeenCalled();
    expect(deleteUserMock).not.toHaveBeenCalled();
    expect(rpcMock).toHaveBeenCalledWith("release_account_deletion_request", expect.objectContaining({
      p_request_id: "request-1",
      p_retry: true,
    }));
  });

  it("rejects object keys outside the claimed account prefix", async () => {
    rpcMock.mockImplementation(async (name: string) => {
      if (name === "recover_completed_account_deletion_requests") return { data: 0, error: null };
      if (name === "claim_account_deletion_request") return { data: [JOB], error: null };
      if (name === "renew_account_deletion_request") return { data: true, error: null };
      if (name === "preview_account_deletion") return { data: [{ resource: "profiles" }], error: null };
      if (name === "account_deletion_storage_manifest") {
        return { data: [{ bucket_id: "shadecode-backups", object_name: "another-user/latest.scsync", source: "user_uid_prefix" }], error: null };
      }
      if (name === "release_account_deletion_request") return { data: true, error: null };
      throw new Error(`Unexpected RPC: ${name}`);
    });

    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(storageFromMock).not.toHaveBeenCalled();
    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it("does not delete Auth if Storage cleanup fails", async () => {
    removeMock.mockResolvedValue({ data: null, error: { code: "storage_unavailable" } });
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(deleteUserMock).not.toHaveBeenCalled();
    expect(rpcMock).toHaveBeenCalledWith("release_account_deletion_request", expect.objectContaining({
      p_error_code: "storage_unavailable",
    }));
  });

  it("uses crash recovery rather than requeueing after Auth deletion", async () => {
    rpcMock.mockImplementation(async (name: string) => {
      if (name === "recover_completed_account_deletion_requests") return { data: 0, error: null };
      if (name === "claim_account_deletion_request") return { data: [JOB], error: null };
      if (name === "renew_account_deletion_request") return { data: true, error: null };
      if (name === "preview_account_deletion") return { data: [{ resource: "profiles" }], error: null };
      if (name === "account_deletion_storage_manifest") return { data: [], error: null };
      if (name === "execute_account_deletion_cleanup") return { data: {}, error: null };
      if (name === "complete_account_deletion_request") return { data: false, error: null };
      throw new Error(`Unexpected RPC: ${name}`);
    });

    const response = await POST(request());
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({ processed: true, completed: false, recoveryRequired: true });
    expect(deleteUserMock).toHaveBeenCalledWith("user-1");
    expect(rpcMock).toHaveBeenCalledTimes(11);
    expect(rpcMock).not.toHaveBeenCalledWith("release_account_deletion_request", expect.anything());
  });
});
