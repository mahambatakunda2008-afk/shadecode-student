import { Suspense } from "react";
import LearnPageClient from "./LearnPageClient";

function LearnFallback() {
  return <main className="min-h-[60vh] grid place-items-center bg-[var(--background)]"><div className="text-sm text-[var(--muted-foreground)]">Loading Learn…</div></main>;
}

export default function LearnPage() {
  return <Suspense fallback={<LearnFallback />}><LearnPageClient /></Suspense>;
}
