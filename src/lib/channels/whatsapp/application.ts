import "server-only";
import type { ChannelResponse } from "@/lib/channels/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveLearnerSubjects, type LearnerSubject } from "@/lib/subjects/resolveLearnerSubjects";
import { resolveChannelIdentity } from "@/lib/platform/channel-identity-store";
import { CortexCore } from "@/lib/cortex/core";
import type { ParsedWhatsAppTextEvent } from "@/lib/channels/whatsapp/webhook";
import { inactiveWhatsAppResponse, unlinkedWhatsAppResponse } from "@/lib/channels/whatsapp/response";
import { bestSnippet, search as searchLessonLibrary } from "@/lib/library/bm25";
import { loadLibrary } from "@/lib/library/store";

export interface WhatsAppApplicationResult {
  event: ParsedWhatsAppTextEvent;
  response: ChannelResponse;
  userId: string | null;
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function parseLearningRequest(text: string): { type: "learn"; topic: string; requestedSubject?: string } | null {
  const match = text.trim().match(/^(LEARN|EXPLAIN|TEACH)\s+(.+)$/i);
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
    text: `Choose the subject for this request. Your subjects are: ${subjects.map((subject) => subject.name).join(", ")}. Example: \`LEARN Mathematics: quadratic functions\`.`,
    metadata: { status: "subject_required", subjects: subjects.map((subject) => subject.name) },
  };
}

async function findLibraryResources(event: ParsedWhatsAppTextEvent, rawRequest: string, userId: string | null): Promise<WhatsAppApplicationResult> {
  const colonIndex = rawRequest.indexOf(":");
  const requestedSubject = colonIndex > 0 ? rawRequest.slice(0, colonIndex).trim() : undefined;
  const query = (colonIndex > 0 ? rawRequest.slice(colonIndex + 1) : rawRequest).trim().slice(0, 120);
  if (!query) {
    return {
      event, userId,
      response: { text: "Tell me what to search for, for example FIND momentum or FIND Mathematics: vectors.", metadata: { status: "query_required", channel: "whatsapp" } },
    };
  }

  const supabase = await createSupabaseServerClient();
  const library = await loadLibrary(supabase as never);
  const hits = searchLessonLibrary(library.index, query, { subject: requestedSubject, limit: 3 });
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://shadecodestudent.vercel.app")).replace(/\/$/, "");

  if (!hits.length) {
    return {
      event, userId,
      response: {
        text: `I couldn't find a matching saved lesson for "${query}"${requestedSubject ? ` in ${requestedSubject}` : ""} yet. That's a content gap, not proof the topic is unsupported. Try another keyword. You can search without an account; linking Shadecode is only needed for personal learning features.`,
        metadata: { status: "library_no_match", channel: "whatsapp", subject: requestedSubject ?? null, query },
      },
    };
  }

  const lines = hits.flatMap((hit, index) => {
    const row = library.rows.get(hit.id);
    if (!row) return [];
    const snippet = bestSnippet(row.blocks, query);
    return [`${index + 1}. ${row.title}${row.subject ? ` [${row.subject}]` : ""}\n${snippet?.text ? `${snippet.text}\n` : ""}${baseUrl}/learn/${encodeURIComponent(row.id)}`];
  });

  return {
    event, userId,
    response: {
      text: `Found these existing lesson resources for "${query}":\n\n${lines.join("\n\n")}\n\nThese are library matches, not a claim that the resource is an official past paper or examiner-approved.`,
      metadata: { status: "library_results", channel: "whatsapp", subject: requestedSubject ?? null, count: lines.length },
    },
  };
}

export async function dispatchWhatsAppTextEvent(event: ParsedWhatsAppTextEvent): Promise<WhatsAppApplicationResult> {
  const text = event.text.trim();

  // Public, read-only entry points give a student immediate value before asking
  // them to create or link an account. Personal learning remains authenticated.
  if (normalize(text) === "help") {
    return {
      event,
      userId: null,
      response: {
        text: "Shadecode WhatsApp commands:\n\n• FIND <topic> (search saved lesson resources, no account needed)\n• FIND <subject>: <topic>\n• LEARN <topic>\n• LEARN <subject>: <topic>\n• EXPLAIN <topic>\n• TEACH <topic>\n\nExamples: FIND momentum | FIND Mathematics: vectors | LEARN Mathematics: quadratic functions",
        metadata: { status: "help", channel: "whatsapp" },
      },
    };
  }

  const findMatch = text.match(/^FIND\s+(.+)$/i);
  if (findMatch) return findLibraryResources(event, findMatch[1].trim(), null);

  const identity = await resolveChannelIdentity("whatsapp", event.externalUserId);
  if (!identity) return { event, userId: null, response: unlinkedWhatsAppResponse() };
  if (identity.status !== "active") return { event, userId: identity.userId, response: inactiveWhatsAppResponse(identity.status) };

  const request = parseLearningRequest(text);
  if (!request) {
    return {
      event,
      userId: identity.userId,
      response: {
        text: "I’m connected to your Shadecode account. Try LEARN algebra, LEARN Mathematics: quadratic functions, EXPLAIN photosynthesis, TEACH momentum, FIND momentum, or HELP.",
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
