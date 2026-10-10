import { Suspense } from "react";
import RevisionHub from "@/components/study/RevisionHub";

export const metadata = { title: "Revise by syllabus | Shadecode Student" };

export default function RevisePage() {
  return (
    <Suspense fallback={null}>
      <RevisionHub />
    </Suspense>
  );
}
