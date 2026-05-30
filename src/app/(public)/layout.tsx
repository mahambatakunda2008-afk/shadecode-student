// src/app/(public)/layout.tsx
//
// Layout for all PUBLIC routes: landing page, /auth/login, /auth/signup.
// Intentionally minimal — no sidebar, no UserProvider, no auth context.
// This ensures unauthenticated visitors never see any user-specific data.

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shadecode Student",
  description:
    "AI-powered learning platform for students. Study smarter with Cortex.",
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Full-height, dark background — auth pages and landing use this as their canvas.
    // No sidebar, no nav injection, no context providers here.
    <div className="min-h-screen bg-[#0a0a10] text-white antialiased">
      {children}
    </div>
  );
}
