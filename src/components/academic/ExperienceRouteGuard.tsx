"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { hasComputerScienceCurriculum } from "@/lib/academic/code-lab";
import { getAcademicExperience, normalizeStudyLevel } from "@/lib/academic/experience";

function routeAllowed(pathname: string, allowedRoutes: string[]) {
  return allowedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

/** Keeps the product surface coherent with the learner's academic stage and enrolled subjects. */
export default function ExperienceRouteGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, loading } = useUser();
  const experience = getAcademicExperience(normalizeStudyLevel(profile?.study_level));
  const subjects = [profile?.subjects, profile?.curriculum_subjects];
  const hasBiologySubject = JSON.stringify(subjects).toLowerCase().includes("biology");
  const hasComputingSubject = hasComputerScienceCurriculum(subjects);
  const isBiologyPracticalRoute =
    pathname === "/practical-practice" || pathname.startsWith("/practical-practice/");
  const isCompLabRoute = pathname === "/comp-lab" || pathname.startsWith("/comp-lab/");

  useEffect(() => {
    if (loading || !profile || pathname === "/dashboard") return;
    const allowedByStage = routeAllowed(pathname, experience.allowedRoutes);
    const allowedByBiologySubject = isBiologyPracticalRoute && hasBiologySubject;
    const allowedByComputingSubject = isCompLabRoute && hasComputingSubject;
    if (!allowedByStage && !allowedByBiologySubject && !allowedByComputingSubject) router.replace("/dashboard");
  }, [experience.allowedRoutes, hasBiologySubject, hasComputingSubject, isBiologyPracticalRoute, isCompLabRoute, loading, pathname, profile, router]);

  return null;
}
