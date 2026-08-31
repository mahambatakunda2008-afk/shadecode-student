"use client";

import { useEffect, useState } from "react";
import type { ExperienceProfile } from "@/lib/education/experience";
import { getLocalExperienceProfile } from "@/lib/education/localProfile";
import type { LocalEducationProfile } from "@/lib/local-first/store";

export function useEducationExperience(userId: string | null) {
  const [profile, setProfile] = useState<LocalEducationProfile | null>(null);
  const [experience, setExperience] = useState<ExperienceProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    setReady(false);
    if (!userId) {
      setProfile(null);
      setExperience(null);
      setReady(true);
      return () => { alive = false; };
    }

    void getLocalExperienceProfile(userId).then((result) => {
      if (!alive) return;
      setProfile(result.profile);
      setExperience(result.experience);
      setReady(true);
    }).catch(() => {
      if (!alive) return;
      setProfile(null);
      setExperience(null);
      setReady(true);
    });

    return () => { alive = false; };
  }, [userId]);

  return { profile, experience, ready };
}
