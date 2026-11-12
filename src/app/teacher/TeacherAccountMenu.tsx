"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Way out of the teacher shell: back to the student app, or sign out (clearing cached pages like the student shell does). */
export function TeacherAccountMenu({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await createClient().auth.signOut();
      if (typeof window !== "undefined" && "caches" in window) {
        await Promise.allSettled([caches.delete("shadecode-pages"), caches.delete("shadecode-rsc"), caches.delete("shadecode-api")]);
      }
    } finally {
      router.replace("/auth/login");
    }
  }

  const link = "rounded-xl px-3 py-2 text-xs text-[var(--muted-foreground)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]";
  return (
    <div className="flex items-center gap-1">
      {isAdmin && <Link href="/admin" className={link}>Admin</Link>}
      <Link href="/dashboard" className={link}>Student app</Link>
      <button type="button" onClick={signOut} disabled={busy} className={`${link} disabled:opacity-50`}>{busy ? "Signing out…" : "Sign out"}</button>
    </div>
  );
}
