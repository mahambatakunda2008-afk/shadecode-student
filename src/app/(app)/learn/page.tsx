import { Suspense } from "react";
import LearnPageResilient from "./LearnPageResilient";

function LearnFallback() {
  return <div style={{ minHeight: "70vh", display: "grid", placeItems: "center", color: "var(--muted-foreground)" }}>Loading Learn…</div>;
}

export default function LearnPage() {
  return <Suspense fallback={<LearnFallback />}><LearnPageResilient /></Suspense>;
}
