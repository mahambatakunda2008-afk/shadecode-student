import { Suspense } from "react";
import StudySpaceClient from "./StudySpaceClient";

export default function StudySpacePage() {
  return (
    <Suspense>
      <StudySpaceClient />
    </Suspense>
  );
}
