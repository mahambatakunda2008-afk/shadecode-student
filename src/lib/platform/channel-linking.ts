/**
 * Server-side channel-linking primitives.
 *
 * This module only creates and consumes opaque, short-lived linking codes.
 * It never maps an external identifier to a Shadecode account by guessing.
 */
import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/platform/relationships";
import type { ClientRole } from "@/lib/channels/types";

const LINK_CODE_TTL_MINUTES = 10;

function digest(code: string): string {
  return createHash("sha256").update(code, "utf8").digest("hex");
}

export async function createWhatsAppLinkCode(
  userId: string,
  role: ClientRole,
): Promise<{ code: string; expiresAt: string }> {
  if (!userId?.trim()) throw new Error("A userId is required.");
  const code = randomBytes(5).toString("hex").toUpperCase();
  const expiresAt = new Date(Date.now() + LINK_CODE_TTL_MINUTES * 60_000);
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from("platform_channel_link_codes").insert({
    user_id: userId,
    channel: "whatsapp",
    role,
    code_digest: digest(code),
    expires_at: expiresAt.toISOString(),
  });
  if (error) throw new Error(error.message);
  return { code, expiresAt: expiresAt.toISOString() };
}

export async function consumeWhatsAppLinkCode(input: {
  code: string;
  externalUserId: string;
}) {
  const code = input.code.trim().toUpperCase();
  if (!/^[A-F0-9]{10}$/.test(code)) throw new Error("Invalid WhatsApp link code.");
  if (!input.externalUserId?.trim()) throw new Error("A WhatsApp identity is required.");

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("platform_channel_link_codes")
    .select("id, user_id, role, expires_at, used_at")
    .eq("channel", "whatsapp")
    .eq("code_digest", digest(code))
    .gt("expires_at", now)
    .is("used_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Invalid, expired, or already-used WhatsApp link code.");

  const { data: claimed, error: claimError } = await supabase
    .from("platform_channel_link_codes")
    .update({ used_at: now })
    .eq("id", data.id)
    .is("used_at", null)
    .select("id")
    .maybeSingle();
  if (claimError) throw new Error(claimError.message);
  if (!claimed) throw new Error("WhatsApp link code has already been consumed.");

  return {
    userId: data.user_id as string,
    role: data.role as ClientRole,
    externalUserId: input.externalUserId.trim(),
  };
}
