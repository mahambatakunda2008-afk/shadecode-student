import { Suspense } from "react";
import LearnPageClient from "./LearnPageClient";
import LearnPrefillBridge from "@/components/learn/LearnPrefillBridge";
import AdaptiveLessonContext from "@/components/learn/AdaptiveLessonContext";
import AcademicLearnContext from "@/components/learn/AcademicLearnContext";

export default function LearnPage() {
  return (
    <Suspense>
      <LearnPrefillBridge />
      <AcademicLearnContext />
      <AdaptiveLessonContext />
      <LearnPageClient />
    </Suspense>
  );
}
