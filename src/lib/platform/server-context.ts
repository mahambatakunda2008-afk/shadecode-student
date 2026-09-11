/**
 * Server-only platform request context boundary.
 *
 * This is the point where an authenticated principal becomes a Shadecode
 * platform request. Transport adapters (HTTP, WhatsApp, mobile integrations)
 * must resolve identity first, then enter this boundary instead of inventing
 * their own relationship or authorization model.
 */

import "server-only";

import {
  createPlatformContext,
  type PlatformRequestContext,
} from "@/lib/platform/context";
import { resolvePlatformRelationships } from "@/lib/platform/relationships";
import type { ClientChannel, ClientRole } from "@/lib/channels/types";
import type { EducationContext } from "@/lib/academic/educationContext";

export interface BuildPlatformRequestContextInput {
  userId: string;
  role: ClientRole;
  channel: ClientChannel;
  education?: EducationContext | null;
  locale?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Build a fully contextualized platform request from an already-authenticated
 * Shadecode user.
 *
 * Deliberately does not infer roles, identities, or relationships from profile
 * fields. Callers must supply a role established by a trusted authorization
 * boundary, and relationships come only from the explicit relationship layer.
 */
export async function buildPlatformRequestContext(
  input: BuildPlatformRequestContextInput,
): Promise<PlatformRequestContext> {
  if (!input.userId?.trim()) throw new Error("A userId is required.");

  const relationships = await resolvePlatformRelationships(input.userId);

  return createPlatformContext({
    userId: input.userId,
    role: input.role,
    channel: input.channel,
    education: input.education,
    relationships,
    locale: input.locale,
    metadata: input.metadata,
  });
}
