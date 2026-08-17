"use client";

import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { AdminBottomNav } from "@/components/layout/AdminBottomNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <aside className="hidden h-screen w-[240px] flex-shrink-0 md:flex"><AdminSidebar /></aside>
      <main className="min-w-0 flex-1 overflow-y-auto pb-[80px] md:pb-0">{children}</main>
      <div className="fixed bottom-0 left-0 right-0 z-[9999] md:hidden"><AdminBottomNav /></div>
    </div>
  );
}
