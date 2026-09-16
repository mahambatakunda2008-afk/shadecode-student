import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

interface ReceiptRow {
  id: string;
  status: "processing" | "ready" | "delivered";
  response_text: string | null;
  lease_until: string;
}

export type WhatsAppReceiptClaim =
  | { kind: "claimed"; id: string }
  | { kind: "duplicate"; status: ReceiptRow["status"]; responseText: string | null };

function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase server credentials are not configured.");
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function claimWhatsAppMessage(input: {
  messageId: string;
  externalUserId: string;
}): Promise<WhatsAppReceiptClaim> {
  const messageId = input.messageId.trim();
  const externalUserId = input.externalUserId.trim();
  if (!messageId || !externalUserId) throw new Error("WhatsApp receipt requires message and user ids.");

  const supabase = getSupabaseAdmin();
  const now = new Date();
  const leaseUntil = new Date(now.getTime() + 2 * 60 * 1000).toISOString();

  const { data: inserted, error: insertError } = await supabase
    .from("platform_channel_message_receipts")
    .insert({
      channel: "whatsapp",
      external_message_id: messageId,
      external_user_id: externalUserId,
      status: "processing",
      lease_until: leaseUntil,
    })
    .select("id")
    .maybeSingle();

  if (!insertError && inserted?.id) return { kind: "claimed", id: inserted.id };

  if (insertError?.code !== "23505") {
    throw new Error(`Failed to claim WhatsApp message: ${insertError?.message ?? "unknown error"}`);
  }

  const { data: existing, error: existingError } = await supabase
    .from("platform_channel_message_receipts")
    .select("id,status,response_text,lease_until")
    .eq("channel", "whatsapp")
    .eq("external_message_id", messageId)
    .maybeSingle();

  if (existingError || !existing) {
    throw new Error(`Failed to read WhatsApp message receipt: ${existingError?.message ?? "not found"}`);
  }

  const leaseExpired = new Date(existing.lease_until).getTime() <= now.getTime();
  if (existing.status === "processing" && leaseExpired) {
    const { data: reclaimed, error: reclaimError } = await supabase
      .from("platform_channel_message_receipts")
      .update({ lease_until: leaseUntil, updated_at: now.toISOString() })
      .eq("id", existing.id)
      .eq("status", "processing")
      .lte("lease_until", now.toISOString())
      .select("id")
      .maybeSingle();

    if (!reclaimError && reclaimed?.id) return { kind: "claimed", id: reclaimed.id };
  }

  return {
    kind: "duplicate",
    status: existing.status,
    responseText: existing.response_text,
  };
}

export async function markWhatsAppMessageReady(input: {
  receiptId: string;
  responseText: string;
}): Promise<void> {
  const responseText = input.responseText.trim();
  if (!input.receiptId || !responseText) throw new Error("A receipt id and response are required.");

  const { error } = await getSupabaseAdmin()
    .from("platform_channel_message_receipts")
    .update({
      status: "ready",
      response_text: responseText,
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.receiptId)
    .eq("status", "processing");

  if (error) throw new Error(`Failed to persist WhatsApp response: ${error.message}`);
}

export async function markWhatsAppMessageDelivered(receiptId: string): Promise<void> {
  if (!receiptId) throw new Error("A receipt id is required.");

  const { error } = await getSupabaseAdmin()
    .from("platform_channel_message_receipts")
    .update({
      status: "delivered",
      delivered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", receiptId)
    .in("status", ["ready", "delivered"]);

  if (error) throw new Error(`Failed to persist WhatsApp delivery state: ${error.message}`);
}
