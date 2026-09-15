import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { ClientRole } from "@/lib/channels/types";

const CODE_LENGTH = 8;
const DEFAULT_TTL_MS = 10 * 60 * 1000;

function getServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing server database configuration.");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function digest(code: string): string {
  return createHash("sha256").update(code.trim().toUpperCase(), "utf8").digest("hex");
}

function createCode(): string {
  return randomBytes(5).toString("hex").slice(0, CODE_LENGTH).toUpperCase();
}

export async function createWhatsAppLinkCode(input: {
  userId: string;
  role: ClientRole;
  ttlMs?: number;
}): Promise<{ code: string; expiresAt: string }> {
  if (!input.userId.trim()) throw new Error("A userId is required.");
  const ttlMs = Math.min(Math.max(input.ttlMs ?? DEFAULT_TTL_MS, 60_000), 30 * 60 * 1000);
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = createCode();
    const { error } = await getServerClient().from("platform_channel_link_codes").insert({
      user_id: input.userId,
      channel: "whatsapp",
      role: input.role,
      code_digest: digest(code),
      expires_at: expiresAt,
    });
    if (!error) return { code, expiresAt };
    if (!/duplicate|unique/i.test(error.message)) throw new Error(error.message);
  }

  throw new Error("Unable to generate a unique WhatsApp link code.");
}

export async function consumeWhatsAppLinkCode(input: {
  code: string;
  externalUserId: string;
}): Promise<{ userId: string; role: ClientRole } | null> {
  const normalized = input.code.trim().toUpperCase();
  if (!/^[A-Z0-9]{8}$/.test(normalized)) return null;

  const client = getServerClient();
  const { data, error } = await client
    .from("platform_channel_link_codes")
    .select("id, user_id, role, expires_at, used_at")
    .eq("code_digest", digest(normalized))
    .eq("channel", "whatsapp")
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const { error: consumeError } = await client
    .from("platform_channel_link_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("id", data.id)
    .is("used_at", null);
  if (consumeError) throw new Error(consumeError.message);

  return { userId: data.user_id as string, role: data.role as ClientRole };
}
