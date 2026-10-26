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
    text: `Choose the subject for this request. Your subjects are: ${subjects.map((subject) => subject.name).join(", ")}. Example: \`LEARN Mathematics: quadratic functions\` or \`FIND Mathematics: vectors\`.`,
    metadata: { status: "subject_required", subjects: subjects.map((subject) => subject.name) },
  };
}

export async function dispatchWhatsAppTextEvent(event: ParsedWhatsAppTextEvent): Promise<WhatsAppApplicationResult> {
  const identity = await resolveChannelIdentity("whatsapp", event.externalUserId);
  if (!identity) return { event, userId: null, response: unlinkedWhatsAppResponse() };
  if (identity.status !== "active") return { event, userId: identity.userId, response: inactiveWhatsAppResponse(identity.status) };

  const text = event.text.trim();
  if (normalize(text) === "help") {
    return {
      event,
      userId: identity.userId,
      response: {
        text: "Shadecode WhatsApp commands:\n\n• FIND <topic> (search saved lesson resources)\n• FIND <subject>: <topic>\n• LEARN <topic>\n• LEARN <subject>: <topic>\n• EXPLAIN <topic>\n• TEACH <topic>\n\nExamples: FIND momentum | LEARN Mathematics: quadratic functions",
        metadata: { status: "help", role: identity.role, channel: "whatsapp" },
      },
    };
  }

  const findMatch = text.match(/^FIND\s+(.+)$/i);
  const request = parseLearningRequest(text);
  if (!findMatch && !request) {
    return {
      event,
      userId: identity.userId,
      response: {
        text: "I’m connected to your Shadecode account. Try FIND momentum, LEARN algebra, LEARN Mathematics: quadratic functions, EXPLAIN photosynthesis, or HELP.",
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

  const rawRequest = (findMatch?.[1] ?? "").trim();
  const colonIndex = rawRequest.indexOf(":");
  const requestedSubject = request?.requestedSubject ?? (findMatch && colonIndex > 0 ? rawRequest.slice(0, colonIndex).trim() : undefined);
  const query = findMatch ? (colonIndex > 0 ? rawRequest.slice(colonIndex + 1).trim() : rawRequest).slice(0, 120) : "";
  const selectedSubject = findSubject(resolved.subjects, requestedSubject);
  if (requestedSubject && !selectedSubject) {
    return { event, userId: identity.userId, response: subjectRequiredResponse(resolved.subjects) };
  }

  if (!selectedSubject && resolved.subjects.length > 1) {
    return { event, userId: identity.userId, response: subjectRequiredResponse(resolved.subjects) };
  }

  const subject = selectedSubject ?? resolved.subjects[0];

  if (findMatch) {
    if (!query) {
      return { event, userId: identity.userId, response: { text: "Tell me what to search for, for example FIND Mathematics: vectors.", metadata: { status: "query_required" } } };
    }

    const library = await loadLibrary(supabase as never);
    const hits = searchLessonLibrary(library.index, query, { subject: subject.name, limit: 3 });
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://shadecodestudent.vercel.app")).replace(/\/$/, "");

    if (!hits.length) {
      return {
        event,
        userId: identity.userId,
        response: {
          text: `I couldn't find a matching saved lesson for "${query}" in your ${subject.name} library yet. That's a content gap, not proof the topic is unsupported. Try another keyword or use Student to ask Cortex.`,
          metadata: { status: "library_no_match", channel: "whatsapp", subject: subject.name, query },
        },
      };
    }

    const lines = hits.flatMap((hit, index) => {
      const row = library.rows.get(hit.id);
      if (!row) return [];
      const snippet = bestSnippet(row.blocks, query);
      return [`${index + 1}. ${row.title}\n${snippet?.text ? `${snippet.text}\n` : ""}${baseUrl}/learn/${encodeURIComponent(row.id)}`];
    });

    return {
      event,
      userId: identity.userId,
      response: {
        text: `Found these existing ${subject.name} resources for "${query}":\n\n${lines.join("\n\n")}\n\nThese are library matches, not a claim that the resource is an official past paper or examiner-approved.`,
        metadata: { status: "library_results", channel: "whatsapp", subject: subject.name, count: lines.length },
      },
    };
  }

  if (!request) {
    return { event, userId: identity.userId, response: { text: "Try FIND <topic> to search saved resources, or LEARN <topic> for Cortex study help.", metadata: { status: "command_required", channel: "whatsapp" } } };
  }

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
