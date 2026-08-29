"use client";

import AcademicExperienceHero from "@/components/academic/AcademicExperienceHero";
import AcademicExperienceActions from "@/components/academic/AcademicExperienceActions";
import DashboardWatchdog from "@/components/dashboard/DashboardWatchdog";

export default function Dashboard() {
  return (
    <>
      <AcademicExperienceHero />
      <AcademicExperienceActions />
      <DashboardWatchdog />
    </>
  );
}
