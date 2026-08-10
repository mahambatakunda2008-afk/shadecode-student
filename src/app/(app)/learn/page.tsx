import { Suspense } from "react";
import LearnPageClient from "./LearnPageClient";
import LearnPrefillBridge from "@/components/learn/LearnPrefillBridge";

export default function LearnPage() {
  return (
    <Suspense>
      <LearnPrefillBridge />
      <LearnPageClient />
    </Suspense>
  );
}
