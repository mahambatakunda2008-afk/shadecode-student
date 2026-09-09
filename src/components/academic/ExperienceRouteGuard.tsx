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

  useEffect(() => {
    if (loading || !profile || pathname === "/dashboard") return;
    if (!routeAllowed(pathname, experience.allowedRoutes)) router.replace("/dashboard");
  }, [experience.allowedRoutes, loading, pathname, profile, router]);

  return null;
}
