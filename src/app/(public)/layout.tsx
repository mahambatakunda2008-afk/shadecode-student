// src/app/(public)/layout.tsx
//
// Layout for all PUBLIC routes: landing page, /auth/login, /auth/signup.
// Intentionally minimal — no sidebar, no UserProvider, no auth context.
// This ensures unauthenticated visitors never see any user-specific data.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Shadecode Student",
  description:
    "AI-powered learning platform for students. Study smarter with Cortex.",
};

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Already-logged-in visitors should never land back on the marketing
  // page or a login/signup form -- send them straight to the app. This
  // runs server-side (before any client bundle ships), so there's no
  // flash of landing-page content for a returning, authenticated user.
  // (app)/dashboard/layout.tsx already redirects to /onboarding if the
  // user hasn't completed it, so this doesn't need to duplicate that
  // check -- just "has a session -> send to /dashboard" is sufficient.
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    // Full-height, dark background — auth pages and landing use this as their canvas.
    // No sidebar, no nav injection, no context providers here.
    <div className="min-h-screen bg-[#0a0a10] text-white antialiased">
      {children}
    </div>
  );
}
