import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { ClientChannel, ClientRole } from "@/lib/channels/types";
import { normalizeChannelExternalId } from "@/lib/platform/channel-identity";

export interface StoredChannelIdentity {
  id: string;
  channel: ClientChannel;
  externalUserId: string;
  userId: string;
  role: ClientRole;
  status: "active" | "blocked" | "unlinked";
  linkedAt: string;
}

function getServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing server database configuration.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function mapIdentity(data: Record<string, unknown>): StoredChannelIdentity {
  return {
    id: data.id as string,
    channel: data.channel as ClientChannel,
    externalUserId: data.external_user_id as string,
    userId: data.user_id as string,
    role: data.role as ClientRole,
    status: data.status as StoredChannelIdentity["status"],
    linkedAt: data.linked_at as string,
  };
}

export async function resolveChannelIdentity(channel: ClientChannel, externalUserId: string): Promise<StoredChannelIdentity | null> {
  const external = normalizeChannelExternalId(externalUserId);
  const { data, error } = await getServerClient().from("platform_channel_identities").select("id, channel, external_user_id, user_id, role, status, linked_at").eq("channel", channel).eq("external_user_id", external).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapIdentity(data) : null;
}

export async function resolveUserChannelIdentity(channel: ClientChannel, userId: string): Promise<StoredChannelIdentity | null> {
  const client = getServerClient();
  const columns = "id, channel, external_user_id, user_id, role, status, linked_at";
  const active = await client.from("platform_channel_identities").select(columns).eq("channel", channel).eq("user_id", userId).eq("status", "active").order("linked_at", { ascending: false }).limit(1).maybeSingle();
  if (active.error) throw new Error(active.error.message);
  if (active.data) return mapIdentity(active.data);
  const latest = await client.from("platform_channel_identities").select(columns).eq("channel", channel).eq("user_id", userId).order("linked_at", { ascending: false }).limit(1).maybeSingle();
  if (latest.error) throw new Error(latest.error.message);
  return latest.data ? mapIdentity(latest.data) : null;
}

export async function unlinkUserChannelIdentity(channel: ClientChannel, userId: string): Promise<void> {
  const { error } = await getServerClient().from("platform_channel_identities").update({ status: "unlinked", updated_at: new Date().toISOString() }).eq("channel", channel).eq("user_id", userId).eq("status", "active");
  if (error) throw new Error(error.message);
}

export async function linkChannelIdentity(input: { channel: ClientChannel; externalUserId: string; userId: string; role: ClientRole }): Promise<StoredChannelIdentity> {
  const external = normalizeChannelExternalId(input.externalUserId);
  if (!input.userId.trim()) throw new Error("A userId is required.");
  const existing = await resolveChannelIdentity(input.channel, external);
  if (existing && existing.userId !== input.userId) throw new Error("This external channel identity is already linked to another account.");
  const client = getServerClient();
  const { data, error } = await client.from("platform_channel_identities").upsert({ channel: input.channel, external_user_id: external, user_id: input.userId, role: input.role, status: "active", linked_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: "channel,external_user_id" }).select("id, channel, external_user_id, user_id, role, status, linked_at").single();
  if (error) throw new Error(error.message);
  return mapIdentity(data);
}
