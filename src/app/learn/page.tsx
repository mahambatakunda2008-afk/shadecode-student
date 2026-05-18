import { Suspense } from "react";
import LearnPageClient from "./LearnPageClient";

export default function LearnPage() {
  return (
    <Suspense>
      <LearnPageClient />
    </Suspense>
  );
}
