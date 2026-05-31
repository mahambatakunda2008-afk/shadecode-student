"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Brain, CheckSquare, Timer, LayoutDashboard, Grid } from "lucide-react";
import { cn } from "@/lib/utils";

const BOTTOM_NAV_ITEMS = [
  { href: "/",          label: "Home",      icon: Home },
  { href: "/learn",     label: "Learn",     icon: Brain },
  { href: "/tasks",     label: "Tasks",     icon: CheckSquare },
  { href: "/focus",     label: "Focus",     icon: Timer },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50
      bg-[#0e0e18]/95 backdrop-blur border-t border-white/[0.06]
      flex items-center px-2 pb-safe">
      {BOTTOM_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href ||
          (href !== "/" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-1 flex-col items-center gap-1 py-2.5 rounded-lg
              transition-colors"
          >
            <Icon className={cn(
              "w-5 h-5",
              isActive ? "text-indigo-400" : "text-white/30"
            )} />
            <span className={cn(
              "text-[10px]",
              isActive ? "text-indigo-400 font-medium" : "text-white/30"
            )}>
              {label}
            </span>
          </Link>
        );
      })}
      {/* More button — placeholder for drawer */}
      <button className="flex flex-1 flex-col items-center gap-1 py-2.5">
        <Grid className="w-5 h-5 text-white/30" />
        <span className="text-[10px] text-white/30">More</span>
      </button>
    </nav>
  );
}
