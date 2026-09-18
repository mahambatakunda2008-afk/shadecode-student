import "server-only";
import type { ChannelResponse } from "@/lib/channels/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveLearnerSubjects, type LearnerSubject } from "@/lib/subjects/resolveLearnerSubjects";
import { resolveChannelIdentity } from "@/lib/platform/channel-identity-store";
import { CortexCore } from "@/lib/cortex/core";
import type { ParsedWhatsAppTextEvent } from "@/lib/channels/whatsapp/webhook";
import { inactiveWhatsAppResponse, unlinkedWhatsAppResponse } from "@/lib/channels/whatsapp/response";

export interface WhatsAppApplicationResult {
  event: ParsedWhatsAppTextEvent;
  response: ChannelResponse;
  userId: string | null;
}

const LEARNING_COMMANDS = new Set(["LEARN", "EXPLAIN", "TEACH"]);

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function parseLearningRequest(text: string): { type: "learn"; topic: string; requestedSubject?: string } | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(LEARN|EXPLAIN|TEACH)\s+(.+)$/i);
  if (!match) return null;

  const remainder = match[2].trim();
  const colonIndex = remainder.indexOf(":");
  if (colonIndex > 0) {
    const requestedSubject = remainder.slice(0, colonIndex).trim();
    const topic = remainder.slice(colonIndex + 1).trim();
    if (requestedSubject && topic) return { type: "learn", topic, requestedSubject };
  }

  return { type: "learn", topic: remainder };
}

function findSubject(subjects: LearnerSubject[], requested?: string) {
  if (!requested) return null;
  const target = normalize(requested);
  return subjects.find((subject) => {
    const name = normalize(subject.name);
    const code = normalize(subject.code ?? "");
    return name === target || (!!code && code === target);
  }) ?? null;
}

function subjectRequiredResponse(subjects: LearnerSubject[]): ChannelResponse {
  return {
    text: `Choose the subject for this question. Your subjects are: ${subjects.map((subject) => subject.name).join(", ")}. Example: \`LEARN Mathematics: quadratic functions\`.`,
    metadata: { status: "subject_required", subjects: subjects.map((subject) => subject.name) },
  };
}

export async function dispatchWhatsAppTextEvent(event: ParsedWhatsAppTextEvent): Promise<WhatsAppApplicationResult> {
  const identity = await resolveChannelIdentity("whatsapp", event.externalUserId);
  if (!identity) return { event, userId: null, response: unlinkedWhatsAppResponse() };
  if (identity.status !== "active") return { event, userId: identity.userId, response: inactiveWhatsAppResponse(identity.status) };

  if (normalize(event.text) === "help") {
    return {
      event,
      userId: identity.userId,
      response: {
        text: "Shadecode WhatsApp commands:\n\n• LEARN <topic>\n• LEARN <subject>: <topic>\n• EXPLAIN <topic>\n• TEACH <topic>\n\nExample: LEARN Mathematics: quadratic functions",
        metadata: { status: "help", role: identity.role, channel: "whatsapp" },
      },
    };
  }

  const request = parseLearningRequest(event.text);
  if (!request) {
    return {
      event,
      userId: identity.userId,
      response: {
        text: "I’m connected to your Shadecode account. Try `LEARN algebra`, `LEARN Mathematics: quadratic functions`, `EXPLAIN photosynthesis`, or `HELP`.",
        metadata: { status: "authenticated", role: identity.role, channel: "whatsapp" },
      },
    };
  }

  const supabase = await createSupabaseServerClient();
  const resolved = await resolveLearnerSubjects(supabase, identity.userId);
  if (!resolved.subjects.length) {
    return {
      event,
      userId: identity.userId,
      response: {
        text: "I can help you learn, but your Shadecode subjects are not configured yet. Choose your subjects in Student first.",
        metadata: { status: "subjects_required", role: identity.role },
      },
    };
  }

  const selectedSubject = findSubject(resolved.subjects, request.requestedSubject);
  if (request.requestedSubject && !selectedSubject) {
    return { event, userId: identity.userId, response: subjectRequiredResponse(resolved.subjects) };
  }

  if (!selectedSubject && resolved.subjects.length > 1) {
    return { event, userId: identity.userId, response: subjectRequiredResponse(resolved.subjects) };
  }

  const subject = selectedSubject ?? resolved.subjects[0];
  const result = await CortexCore({
    userId: identity.userId,
    type: request.type,
    payload: { topic: request.topic, subjectId: subject.id, subjectName: subject.name },
  });

  return {
    event,
    userId: identity.userId,
    response: {
      text: result.response,
      metadata: { status: "learning", role: identity.role, channel: "whatsapp", subject: subject.name },
      actions: result.nextAction ? [{ id: "next", label: "Continue", type: "reply", value: result.nextAction }] : undefined,
    },
  };
}
