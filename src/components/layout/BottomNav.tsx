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

  const anyMoreActive = BOTTOM_MORE.some(({ href }) =>
    isRouteActive(pathname, href)
  );

  return (
    <>
      {/* ── Bottom tab bar ──────────────────────────────────────────── */}
      <nav
        className="w-full bg-[#0e0e18]/96 backdrop-blur-2xl border-t border-white/[0.07] flex items-stretch"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {BOTTOM_PRIMARY.map(({ href, label, icon: Icon, badge, urgent }) => {
          const active = isRouteActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center justify-center gap-[5px] pt-[10px] pb-[9px] relative"
            >
              {/* Icon with pill indicator */}
              <div
                className={cn(
                  "relative w-10 h-[26px] rounded-full flex items-center justify-center transition-all duration-200",
                  active ? "bg-indigo-500/[0.18]" : "bg-transparent"
                )}
              >
                <Icon
                  className={cn(
                    "w-[20px] h-[20px] transition-all duration-200",
                    active ? "text-indigo-400" : "text-white/[0.3]"
                  )}
                  strokeWidth={active ? 2.2 : 1.8}
                />
                {badge && (
                  <span
                    className={cn(
                      "absolute -top-[5px] -right-[7px]",
                      "min-w-[15px] h-[15px] px-[3px] rounded-full",
                      "text-[8px] font-bold flex items-center justify-center leading-none",
                      urgent
                        ? "bg-red-500 text-white"
                        : "bg-indigo-500 text-white"
                    )}
                  >
                    {badge}
                  </span>
                )}
              </div>
              {/* Label */}
              <span
                className={cn(
                  "text-[10px] font-medium leading-none transition-colors duration-200",
                  active ? "text-indigo-400" : "text-white/[0.26]"
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
          className="flex flex-1 flex-col items-center justify-center gap-[5px] pt-[10px] pb-[9px] cursor-pointer"
        >
          <div
            className={cn(
              "w-10 h-[26px] rounded-full flex items-center justify-center transition-all duration-200",
              anyMoreActive || open ? "bg-indigo-500/[0.18]" : "bg-transparent"
            )}
          >
            <MoreHorizontal
              className={cn(
                "w-[20px] h-[20px] transition-colors duration-200",
                anyMoreActive || open ? "text-indigo-400" : "text-white/[0.3]"
              )}
              strokeWidth={1.8}
            />
          </div>
          <span
            className={cn(
              "text-[10px] font-medium leading-none transition-colors duration-200",
              anyMoreActive || open ? "text-indigo-400" : "text-white/[0.26]"
            )}
          >
            More
          </span>
        </button>
      </nav>

      {/* ── Backdrop ────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm"
          style={{ animation: "ssc-fadeIn 0.15s ease forwards" }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── More drawer ─────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed bottom-0 left-0 right-0 z-[9999] bg-[#0d0d17]/98 backdrop-blur-2xl border-t border-white/[0.07] rounded-t-[22px]"
          style={{
            animation: "ssc-slideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            paddingBottom:
              "max(env(safe-area-inset-bottom, 0px), 20px)",
          }}
        >
          {/* Drag handle */}
          <div className="w-8 h-[3px] bg-white/[0.1] rounded-full mx-auto mt-[14px] mb-[18px]" />

          {/* Header */}
          <div className="flex items-center justify-between px-5 mb-[18px]">
            <span className="text-[14px] font-semibold text-white/70 tracking-[-0.01em]">
              More
            </span>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] active:bg-white/[0.14] transition-colors cursor-pointer"
            >
              <X className="w-[14px] h-[14px] text-white/[0.45]" />
            </button>
          </div>

          {/* 3-column grid */}
          <div className="grid grid-cols-3 gap-[10px] px-4 pb-2">
            {BOTTOM_MORE.map(({ href, label, icon: Icon, badge, urgent }) => {
              const active = isRouteActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-2",
                    "py-[18px] px-2 rounded-2xl border transition-all duration-150",
                    active
                      ? "bg-indigo-500/[0.12] border-indigo-500/[0.22]"
                      : "bg-white/[0.025] border-white/[0.05] active:bg-white/[0.06]"
                  )}
                >
                  {badge && (
                    <span
                      className={cn(
                        "absolute top-2 right-2",
                        "min-w-[16px] h-4 px-1 rounded-full",
                        "text-[8px] font-bold flex items-center justify-center leading-none",
                        urgent
                          ? "bg-red-500/[0.15] text-red-400"
                          : "bg-indigo-500/[0.15] text-indigo-400"
                      )}
                    >
                      {badge}
                    </span>
                  )}
                  <Icon
                    className={cn(
                      "w-[21px] h-[21px] transition-colors duration-150",
                      active ? "text-indigo-400" : "text-white/[0.42]"
                    )}
                    strokeWidth={active ? 2.2 : 1.8}
                  />
                  <span
                    className={cn(
                      "text-[11px] font-medium text-center leading-tight",
                      active ? "text-indigo-300" : "text-white/[0.48]"
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

      {/* ── Keyframes ───────────────────────────────────────────────── */}
      <style>{`
        @keyframes ssc-slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes ssc-fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  );
}
