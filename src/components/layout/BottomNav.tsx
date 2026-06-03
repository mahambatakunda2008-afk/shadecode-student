"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { X, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { BOTTOM_PRIMARY, BOTTOM_MORE, isRouteActive } from "@/lib/navigation";

export function BottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const anyMoreActive = BOTTOM_MORE.some(({ href }) => isRouteActive(pathname, href));

  return (
    <>
      {/* ── Bottom bar ──────────────────────────────────────────────────── */}
      <nav className="w-full bg-[#0e0e18]/95 backdrop-blur-xl border-t border-white/[0.07] flex items-stretch px-1">
        {BOTTOM_PRIMARY.map(({ href, label, icon: Icon, badge, urgent }) => {
          const active = isRouteActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 relative"
            >
              <div className="relative">
                <Icon
                  className={cn(
                    "w-[22px] h-[22px] transition-colors",
                    active ? "text-indigo-400" : "text-white/30"
                  )}
                  strokeWidth={active ? 2.5 : 1.8}
                />
                {badge && (
                  <span
                    className={cn(
                      "absolute -top-1.5 -right-2.5",
                      "min-w-[16px] h-4 px-1 rounded-full",
                      "text-[9px] font-bold flex items-center justify-center leading-none",
                      urgent ? "bg-red-500 text-white" : "bg-indigo-500 text-white"
                    )}
                  >
                    {badge}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors",
                  active ? "text-indigo-400" : "text-white/30"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 cursor-pointer"
        >
          <MoreHorizontal
            className={cn(
              "w-[22px] h-[22px] transition-colors",
              anyMoreActive || open ? "text-indigo-400" : "text-white/30"
            )}
            strokeWidth={1.8}
          />
          <span
            className={cn(
              "text-[10px] font-medium transition-colors",
              anyMoreActive || open ? "text-indigo-400" : "text-white/30"
            )}
          >
            More
          </span>
        </button>
      </nav>

      {/* ── Backdrop ────────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
          style={{ animation: "fadeIn 0.18s ease" }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── More drawer ─────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed bottom-0 left-0 right-0 z-[9999] bg-[#0a0a10]/98 backdrop-blur-2xl border-t border-white/[0.08] rounded-t-[24px] px-5 pt-5 pb-8"
          style={{ animation: "slideUp 0.22s ease" }}
        >
          {/* Handle bar */}
          <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-5" />

          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <span className="text-[15px] font-bold text-white/80">More</span>
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 text-white/50" />
            </button>
          </div>

          {/* 3-col grid */}
          <div className="grid grid-cols-3 gap-3">
            {BOTTOM_MORE.map(({ href, label, icon: Icon, badge, urgent }) => {
              const active = isRouteActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "relative flex flex-col items-center justify-center",
                    "gap-2 py-4 px-2 rounded-2xl border transition-colors",
                    active
                      ? "bg-indigo-500/[0.15] border-indigo-500/30"
                      : "bg-white/[0.03] border-white/[0.06] active:bg-white/[0.08]"
                  )}
                >
                  {badge && (
                    <span
                      className={cn(
                        "absolute top-2.5 right-2.5",
                        "min-w-[18px] h-[18px] px-1 rounded-full",
                        "text-[9px] font-bold flex items-center justify-center",
                        urgent ? "bg-red-500/20 text-red-400" : "bg-indigo-500/20 text-indigo-400"
                      )}
                    >
                      {badge}
                    </span>
                  )}
                  <Icon
                    className={cn(
                      "w-[22px] h-[22px]",
                      active ? "text-indigo-400" : "text-white/45"
                    )}
                    strokeWidth={active ? 2.2 : 1.8}
                  />
                  <span
                    className={cn(
                      "text-[11px] font-semibold text-center",
                      active ? "text-indigo-400" : "text-white/50"
                    )}
                  >
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Animations ──────────────────────────────────────────────────── */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  );
}