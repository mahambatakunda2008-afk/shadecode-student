"use client";

import { useLayoutEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import LearnPageResilient from "./LearnPageResilient";

const LAST_REQUEST_KEY = "shadecode:learn:last-request";
const SUBJECT_ALIASES = new Set([
  "p", "phys", "physics",
  "m", "math", "maths", "mathematics",
  "cs", "comp sci", "computer science",
  "chem", "chemistry", "bio", "biology",
  "econ", "economics",
]);

function isSubjectAlias(value: string) {
  return SUBJECT_ALIASES.has(value.trim().toLowerCase());
}

function sanitizeTopic(value: unknown) {
  if (typeof value !== "string") return "";
  const topic = value.trim();
  if (!topic || isSubjectAlias(topic) || /^(study session|general study|focused study)$/i.test(topic)) return "";
  return topic;
}

export default function LearnPrefillGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  useLayoutEffect(() => {
    const queryTopic = params.get("topic")?.trim() ?? "";
    const querySubject = params.get("subject")?.trim() ?? "";

    let saved: { subject?: string; topic?: string; mode?: string } | null = null;
    try {
      const raw = localStorage.getItem(LAST_REQUEST_KEY);
      saved = raw ? JSON.parse(raw) : null;
    } catch {
      localStorage.removeItem(LAST_REQUEST_KEY);
    }

    const safeQueryTopic = sanitizeTopic(queryTopic);
    const safeSavedTopic = sanitizeTopic(saved?.topic);
    const badQueryTopic = Boolean(queryTopic) && !safeQueryTopic;
    const badSavedTopic = Boolean(saved?.topic) && !safeSavedTopic;

    if (badSavedTopic) {
      const cleaned = saved ? { ...saved, topic: "" } : null;
      if (cleaned) localStorage.setItem(LAST_REQUEST_KEY, JSON.stringify(cleaned));
    }

    if (!badQueryTopic) return;

    const next = new URLSearchParams(params.toString());
    next.delete("topic");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [params, pathname, router]);

  return <LearnPageResilient />;
}
