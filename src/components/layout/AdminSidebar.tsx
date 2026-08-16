"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { LogOut, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { ADMIN_NAV_GROUPS, isRouteActive } from "@/lib/navigation";

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/auth/login");
  };

  function navItemClass(active: boolean) {
    return cn(
      "group relative flex items-center gap-2.5",
      "min-h-[40px] px-3 py-[11px] rounded-[9px] overflow-hidden",
      "text-[13px] leading-none",
      "transition-all duration-200 outline-none",
      active
        ? "bg-[var(--primary-glow)] text-[var(--foreground)] font-semibold shadow-sm"
        : "font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]"
    );
  }

  function iconClass(active: boolean) {
    return cn(
      "w-[18px] h-[18px] flex-shrink-0 transition-colors duration-150",
      active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)] group-hover:text-[var(--foreground)]"
    );
  }

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden border-r border-[var(--card-border)] bg-[var(--surface)]">
      <div className="flex items-center gap-3 px-4 pt-4 pb-4 flex-shrink-0">
        <div
          className="w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)",
            boxShadow: "0 0 14px rgba(99,102,241,0.35)",
          }}
        >
          <span className="text-[10px] font-black text-white tracking-tight">SC</span>
        </div>
        <div className="flex flex-col gap-[3px]">
          <span className="text-[13px] font-semibold text-[var(--foreground)] leading-none">Shadecode</span>
          <span className="text-[11px] text-[var(--muted-foreground)] leading-none">Admin</span>
        </div>
      </div>

      <div className="mx-4 mb-3 flex-shrink-0 border-t border-[var(--card-border)]" />

      <div className="mx-3 mb-3 flex-shrink-0 flex items-center gap-2 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] px-3 py-3 shadow-sm">
        <ShieldCheck className="w-4 h-4 text-[var(--warning)] flex-shrink-0" />
        <span className="text-[12px] font-semibold text-[var(--foreground)]">Admin access</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 flex flex-col gap-5 py-2 min-h-0">
        {ADMIN_NAV_GROUPS.map((section) => (
          <div key={section.group}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[var(--muted-foreground)] px-3 mb-2 select-none">
              {section.group}
            </p>
            <div className="flex flex-col gap-[2px]">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = isRouteActive(pathname, href);
                return (
                  <Link key={href} href={href} className={navItemClass(active)}>
                    {active && (
                      <span className="absolute left-0 inset-y-0 w-[2px] bg-[var(--primary)]" aria-hidden="true" />
                    )}
                    <Icon className={iconClass(active)} strokeWidth={active ? 2 : 1.8} />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="flex-shrink-0 px-3 pb-4 pt-3 border-t border-[var(--card-border)]">
        <button
          onClick={handleSignOut}
          className={cn(
            "group relative flex items-center gap-2.5",
            "min-h-[40px] px-3 py-[11px] rounded-[9px] w-full text-left cursor-pointer",
            "text-[13px] font-medium leading-none transition-all duration-200",
            "text-[var(--muted-foreground)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)]"
          )}
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0 text-[var(--muted-foreground)] group-hover:text-[var(--danger)] transition-colors duration-150" strokeWidth={1.8} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
