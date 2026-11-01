import { Suspense } from "react";
import StudySpacePageClient from "./StudySpacePageClient";

export default function StudySpacePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 24 }}>Loading StudySpace…</div>}>
      <StudySpacePageClient />
    </Suspense>
  );
}
