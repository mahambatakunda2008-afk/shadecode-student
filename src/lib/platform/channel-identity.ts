/**
 * Transport-neutral channel identity contract.
 *
 * External channel identifiers are opaque values. This module intentionally
 * does not infer a Shadecode account from a phone number or other provider
 * identifier. A trusted linking workflow must establish the user association.
 */
import "server-only";

import type { ClientChannel, ClientRole } from "@/lib/channels/types";

export interface ChannelIdentityRecord {
  id: string;
  channel: ClientChannel;
  externalUserId: string;
  userId: string;
  role: ClientRole;
  status: "active" | "blocked" | "unlinked";
  linkedAt: string;
}

export function normalizeChannelExternalId(value: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > 255) {
    throw new Error("Invalid external channel identity.");
  }
  return normalized;
}

export function isActiveChannelIdentity(
  identity: ChannelIdentityRecord | null,
): identity is ChannelIdentityRecord {
  return identity?.status === "active";
}
