"use client";

import { useLayoutEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { matchAllowedSubject } from "@/lib/academic/subjectContract";
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
    let cancelled = false;

    const sanitize = async () => {
      const queryTopic = params.get("topic")?.trim() ?? "";
      const querySubject = params.get("subject")?.trim() ?? "";

      let saved: { subject?: string; topic?: string; mode?: string } | null = null;
      try {
        const raw = localStorage.getItem(LAST_REQUEST_KEY);
        saved = raw ? JSON.parse(raw) : null;
      } catch {
        localStorage.removeItem(LAST_REQUEST_KEY);
      }

      let allowedSubjects: string[] = [];
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("subjects, onboarding_completed")
            .eq("id", user.id)
            .maybeSingle();
          if (Array.isArray(profile?.subjects)) allowedSubjects = profile.subjects;
        }
      } catch {
        // Keep the deterministic General guard even if profile lookup is unavailable.
      }

      if (cancelled) return;

      const safeQueryTopic = sanitizeTopic(queryTopic);
      const safeSavedTopic = sanitizeTopic(saved?.topic);
      const querySubjectMatch = matchAllowedSubject(querySubject, allowedSubjects);
      const savedSubjectMatch = matchAllowedSubject(saved?.subject, allowedSubjects);
      const badQueryTopic = Boolean(queryTopic) && !safeQueryTopic;
      const badSavedTopic = Boolean(saved?.topic) && !safeSavedTopic;
      const badQuerySubject = Boolean(querySubject) && !querySubjectMatch;
      const badSavedSubject = Boolean(saved?.subject) && !savedSubjectMatch;

      if (saved && (badSavedTopic || badSavedSubject)) {
        const cleaned = {
          ...saved,
          topic: safeSavedTopic,
          ...(savedSubjectMatch ? { subject: savedSubjectMatch } : { subject: "" }),
        };
        localStorage.setItem(LAST_REQUEST_KEY, JSON.stringify(cleaned));
      }

      if (!badQueryTopic && !badQuerySubject) return;

      const next = new URLSearchParams(params.toString());
      if (badQueryTopic) next.delete("topic");
      if (badQuerySubject) next.delete("subject");
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    };

    void sanitize();
    return () => { cancelled = true; };
  }, [params, pathname, router]);

  return <LearnPageResilient />;
}
