"use client";

import { useLayoutEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { matchAllowedSubject, isGeneralSubject } from "@/lib/academic/subjectContract";
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

  const { profile } = useUser();

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

    // The signed-in layout restores this profile from the device cache. Reading it
    // locally keeps Learn's prefill/sanitisation gate from making a network-only
    // auth/profile request before cached lessons can be opened offline.
    const profileResolved = profile !== null;
    const allowedSubjects = Array.isArray(profile?.subjects) ? profile.subjects : [];
    const safeQueryTopic = sanitizeTopic(queryTopic);
    const safeSavedTopic = sanitizeTopic(saved?.topic);
    const querySubjectMatch = matchAllowedSubject(querySubject, allowedSubjects);
    const savedSubjectMatch = matchAllowedSubject(saved?.subject, allowedSubjects);
    const badQueryTopic = Boolean(queryTopic) && !safeQueryTopic;
    const badSavedTopic = Boolean(saved?.topic) && !safeSavedTopic;
    const badQuerySubject = Boolean(querySubject) && (isGeneralSubject(querySubject) || (profileResolved && !querySubjectMatch));
    const badSavedSubject = Boolean(saved?.subject) && (isGeneralSubject(saved?.subject) || (profileResolved && !savedSubjectMatch));

    if (saved && (badSavedTopic || badSavedSubject || (profileResolved && savedSubjectMatch && saved.subject !== savedSubjectMatch))) {
      const cleaned = {
        ...saved,
        topic: safeSavedTopic,
        ...(savedSubjectMatch ? { subject: savedSubjectMatch } : { subject: "" }),
      };
      localStorage.setItem(LAST_REQUEST_KEY, JSON.stringify(cleaned));
      saved = cleaned;
    }

    if (profileResolved && allowedSubjects.length > 0) {
      const canonicalSubject = querySubjectMatch ?? (badQuerySubject ? allowedSubjects[0] : null);
      if (canonicalSubject && querySubject !== canonicalSubject) {
        const next = new URLSearchParams(params.toString());
        next.set("subject", canonicalSubject);
        if (badQueryTopic) next.delete("topic");
        router.replace(`${pathname}?${next.toString()}`);
        return;
      }

      if (!querySubject && saved?.subject) {
        const savedCanonical = matchAllowedSubject(saved.subject, allowedSubjects);
        if (savedCanonical) {
          const next = new URLSearchParams(params.toString());
          next.set("subject", savedCanonical);
          router.replace(`${pathname}?${next.toString()}`);
          return;
        }
      }
    }

    if (!badQueryTopic && !badQuerySubject) return;

    const next = new URLSearchParams(params.toString());
    if (badQueryTopic) next.delete("topic");
    if (badQuerySubject) {
      if (allowedSubjects.length > 0) next.set("subject", allowedSubjects[0]);
      else next.delete("subject");
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [params, pathname, profile, router]);

  return <LearnPageResilient />;
}
