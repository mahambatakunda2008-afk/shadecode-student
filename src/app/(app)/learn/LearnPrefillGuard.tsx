"use client";

import { useLayoutEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
      let profileResolved = false;
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("subjects, onboarding_completed")
            .eq("id", user.id)
            .maybeSingle();
          if (profile) {
            profileResolved = true;
            if (Array.isArray(profile.subjects)) allowedSubjects = profile.subjects;
          }
        }
      } catch {
        // If profile lookup fails, do not manufacture a subject. The API remains authoritative.
      }

      if (cancelled) return;

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

      // If onboarding has resolved, make the URL carry a canonical subject whenever
      // an invalid/legacy subject was supplied. This also forces LearnPageResilient's
      // state to update instead of leaving a stale "General" selection on screen.
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
    };

    void sanitize();
    return () => { cancelled = true; };
  }, [params, pathname, router]);

  return <LearnPageResilient />;
}
