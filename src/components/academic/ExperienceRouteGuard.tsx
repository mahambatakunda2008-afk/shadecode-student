"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { getAcademicExperience, normalizeStudyLevel } from "@/lib/academic/experience";

function routeAllowed(pathname: string, allowedRoutes: string[]) {
  return allowedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

/** Keeps the product surface coherent with the learner's academic stage. */
export default function ExperienceRouteGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, loading } = useUser();
  const experience = getAcademicExperience(normalizeStudyLevel(profile?.study_level));
  const hasBiologySubject = JSON.stringify([
    profile?.subjects,
    profile?.curriculum_subjects,
  ]).toLowerCase().includes("biology");
  const isBiologyPracticalRoute =
    pathname === "/practical-practice" || pathname.startsWith("/practical-practice/");

  useEffect(() => {
    if (loading || !profile || pathname === "/dashboard") return;
    const allowedByStage = routeAllowed(pathname, experience.allowedRoutes);
    const allowedByBiologySubject = isBiologyPracticalRoute && hasBiologySubject;
    if (!allowedByStage && !allowedByBiologySubject) router.replace("/dashboard");
  }, [experience.allowedRoutes, hasBiologySubject, isBiologyPracticalRoute, loading, pathname, profile, router]);

  return null;
}
