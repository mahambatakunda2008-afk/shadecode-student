"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { setPendingChallenge } from "@/lib/challenge/pending";

/** Remembers the challenge before navigating, so signup and onboarding can resume it. */
export default function AcceptChallengeLink({ id, href, className, children }: { id: string; href: string; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={className} onClick={() => setPendingChallenge(id)}>
      {children}
    </Link>
  );
}
