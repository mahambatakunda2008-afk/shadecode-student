"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";
import { SIDEBAR_GROUPS, isRouteActive } from "@/lib/navigation";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useUser();

  const firstName =
    profile?.first_name ??
    profile?.full_name?.split(" ")[0] ??
    "Student";

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


  return (
    <aside className="flex flex-col h-full w-full bg-[#0e0e18] border-r border-white/[0.08] px-[10px] py-4">
      {/* Logo */}
      <div className="px-[10px] pb-4 mb-4 border-b border-white/[0.07]">
        <p className="text-[14px] font-semibold text-white">Shadecode</p>
        <p className="text-[10px] text-white/30">Student</p>
      </div>

      {/* NAV */}
      <nav className="flex-1 flex flex-col gap-4 overflow-y-auto">
        {SIDEBAR_GROUPS.map((section) => (
          <div key={section.group}>
            <p className="text-[10px] text-white/25 uppercase px-[10px] mb-2">
              {section.group}
            </p>

            <div className="flex flex-col gap-[2px]">
              {section.items.map(({ href, label, icon: Icon, badge, urgent }) => {
                const active = isRouteActive(pathname, href);

                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center justify-between px-[10px] py-[8px] rounded-lg text-[13px] transition-colors",
                      active
                        ? "bg-indigo-500/15 text-indigo-300"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{label}</span>
                    </div>
                    {badge && (
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[9px] font-bold leading-none",
                          urgent
                            ? "bg-red-500/20 text-red-400"
                            : "bg-indigo-500/20 text-indigo-400"
                        )}
                      >
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-white/[0.07] pt-3 flex flex-col gap-2">
        <Link
          href="/settings"
          className="text-[13px] text-white/50 hover:text-white px-[10px] transition-colors"
        >
          Settings
        </Link>

        <button
          onClick={handleSignOut}
          className="text-[13px] text-red-400/60 hover:text-red-400 px-[10px] text-left transition-colors cursor-pointer"
        >
          Sign out
        </button>

        <div className="px-[10px] pt-2 text-[11px] text-white/30">
          {firstName}
        </div>
      </div>
    </aside>
  );
}
