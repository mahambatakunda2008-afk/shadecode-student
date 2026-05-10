"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "cmdk";

import {
  Home,
  Brain,
  CheckSquare,
  Timer,
  LayoutDashboard,
  Calendar,
  BookOpen,
  GraduationCap,
  PenLine,
  BarChart2,
  Trophy,
  Settings,
  Search,
  X,
  LucideIcon,
} from "lucide-react";

type CommandItemType = {
  name: string;
  href: string;
  icon: LucideIcon;
};

const pages: CommandItemType[] = [
  { name: "Home", href: "/", icon: Home },
  { name: "Learn", href: "/learn", icon: Brain },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Focus", href: "/focus", icon: Timer },
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Timetable", href: "/timetable", icon: Calendar },
  { name: "Exams", href: "/exams", icon: BookOpen },
  { name: "Exam Sim", href: "/exam-sim", icon: GraduationCap },
  { name: "Math Checker", href: "/math-checker", icon: PenLine },
  { name: "Analytics", href: "/analytics", icon: BarChart2 },
  { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function CommandPalette() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // detect mobile safely
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();

    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Ctrl + K support (desktop)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }

      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const run = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      {/* MOBILE FLOATING BUTTON */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: "fixed",
            right: "18px",
            bottom: "90px",
            width: "58px",
            height: "58px",
            borderRadius: "999px",
            border: "1px solid rgba(99,102,241,0.25)",
            background: "rgba(99,102,241,0.18)",
            backdropFilter: "blur(18px)",
            display: isMobile ? "flex" : "none",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            zIndex: 1500,
            boxShadow: "0 10px 30px rgba(99,102,241,0.3)",
          }}
        >
          <Search size={22} />
        </button>
      )}

      {/* OVERLAY */}
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(10px)",
              zIndex: 2000,
            }}
          />

          {/* MODAL */}
          <div
            style={{
              position: "fixed",
              top: isMobile ? "10%" : "14%",
              left: "50%",
              transform: "translateX(-50%)",
              width: "min(680px, 92vw)",
              zIndex: 2001,
              borderRadius: "24px",
              overflow: "hidden",
              border: "1px solid rgba(99,102,241,0.15)",
              background: "rgba(10,10,16,0.96)",
              backdropFilter: "blur(30px)",
              boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
            }}
          >
            <Command>
              <CommandInput
                placeholder="Search pages, tools, actions..."
                style={{
                  width: "100%",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: "white",
                  padding: "18px 18px",
                  fontSize: "15px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
              />

              <CommandList
                style={{
                  maxHeight: "420px",
                  overflowY: "auto",
                  padding: "10px",
                }}
              >
                <CommandEmpty
                  style={{
                    padding: "20px",
                    textAlign: "center",
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  Nothing found.
                </CommandEmpty>

                <CommandGroup heading="Navigation">
                  {pages.map(({ name, href, icon: Icon }) => (
                    <CommandItem
                      key={href}
                      value={name}
                      onSelect={() => run(href)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "12px 14px",
                        borderRadius: "14px",
                        cursor: "pointer",
                        color: "white",
                        marginBottom: "6px",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div
                        style={{
                          width: "38px",
                          height: "38px",
                          borderRadius: "12px",
                          background: "rgba(99,102,241,0.12)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "rgb(129,140,248)",
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={18} />
                      </div>

                      <div>
                        <div style={{ fontWeight: 700 }}>
                          {name}
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            opacity: 0.6,
                          }}
                        >
                          {href}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>

            {/* CLOSE BUTTON (mobile-friendly) */}
            <button
              onClick={() => setOpen(false)}
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                background: "rgba(255,255,255,0.06)",
                border: "none",
                borderRadius: "10px",
                padding: "6px",
                cursor: "pointer",
                color: "white",
              }}
            >
              <X size={18} />
            </button>
          </div>
        </>
      )}
    </>
  );
}
