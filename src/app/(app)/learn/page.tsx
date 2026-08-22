import { Suspense } from "react";
import LearnPageClient from "./LearnPageClient";
import LearnPrefillBridge from "@/components/learn/LearnPrefillBridge";
import AdaptiveLessonContext from "@/components/learn/AdaptiveLessonContext";

export default function LearnPage() {
  return (
    <Suspense>
      <LearnPrefillBridge />
      <AdaptiveLessonContext />
      <LearnPageClient />
    </Suspense>
  );
}
