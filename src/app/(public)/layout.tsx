// src/app/(public)/layout.tsx
//
// Layout for all PUBLIC routes: landing page, /auth/login, /auth/signup.
// Intentionally minimal: no sidebar, UserProvider, or auth context.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: {
    default: "Shadecode Student | Your learning workspace",
    template: "%s | Shadecode Student",
  },
  description:
    "Learn, practise, and plan in one workspace. Shadecode Student helps Cambridge and ZIMSEC learners build understanding, practise exam-style questions, and organise study.",
  applicationName: "Shadecode Student",
  category: "education",
  openGraph: {
    type: "website",
    siteName: "Shadecode Student",
    title: "Shadecode Student | Your learning workspace",
    description:
      "Learn, practise, and plan in one workspace. Built for Cambridge and ZIMSEC learners.",
  },
  twitter: {
    card: "summary",
    title: "Shadecode Student | Your learning workspace",
    description:
      "Learn, practise, and plan in one workspace. Built for Cambridge and ZIMSEC learners.",
  },
};

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Keep authenticated visitors inside the product, not on public auth pages.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased">
      {children}
    </div>
  );
}
