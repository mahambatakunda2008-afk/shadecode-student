/**
 * Shared platform request context.
 *
 * Every Shadecode client eventually enters the same platform boundary:
 * identity -> role -> channel -> education context -> relationships -> services.
 *
 * This file is intentionally transport-agnostic. HTTP, WhatsApp, mobile and
 * future integrations can construct the same context without duplicating
 * learning or authorization logic.
 */

import type { EducationContext } from "@/lib/academic/educationContext";
import type { ClientChannel, ClientRole } from "@/lib/channels/types";

export interface PlatformRelationships {
  /** Authorized student ids visible to this principal. */
  studentIds: string[];
  /** Authorized class/group ids visible to this principal. */
  groupIds: string[];
  /** Authorized school/institution ids visible to this principal. */
  institutionIds: string[];
}

export interface PlatformIdentity {
  userId: string;
  role: ClientRole;
  channel: ClientChannel;
}

export interface PlatformRequestContext {
  identity: PlatformIdentity;
  education: EducationContext | null;
  relationships: PlatformRelationships;
  locale: string | null;
  metadata: Record<string, unknown>;
}

export function createPlatformContext(input: {
  userId: string;
  role: ClientRole;
  channel: ClientChannel;
  education?: EducationContext | null;
  relationships?: Partial<PlatformRelationships>;
  locale?: string | null;
  metadata?: Record<string, unknown>;
}): PlatformRequestContext {
  return {
    identity: {
      userId: input.userId,
      role: input.role,
      channel: input.channel,
    },
    education: input.education ?? null,
    relationships: {
      studentIds: [...new Set(input.relationships?.studentIds ?? [])],
      groupIds: [...new Set(input.relationships?.groupIds ?? [])],
      institutionIds: [...new Set(input.relationships?.institutionIds ?? [])],
    },
    locale: input.locale ?? null,
    metadata: input.metadata ?? {},
  };
}
