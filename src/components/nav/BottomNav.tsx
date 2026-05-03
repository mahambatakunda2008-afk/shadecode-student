"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, CheckSquare, LayoutDashboard, BookOpen, Brain, PenLine, Trophy } from "lucide-react";

const navItems = [
  { label: "Home", href: "/", icon: Home, id: "nav-home" },
  { label: "Timetable", href: "/timetable", icon: Calendar, id: "nav-timetable" },
  { label: "Tasks", href: "/tasks", icon: CheckSquare, id: "nav-tasks" },
  { label: "Exams", href: "/exams", icon: BookOpen, id: "nav-exams" },
  { label: "Learn", href: "/learn", icon: Brain, id: "nav-learn" },
  { label: "Math", href: "/math-checker", icon: PenLine, id: "nav-math" },
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, id: "nav-dashboard" },
  { label: "Ranks", href: "/leaderboard", icon: Trophy, id: "nav-leaderboard" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      <style>{`
        /* Mobile - bottom nav */
        .nav-bottom {
          display: flex;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: var(--card);
          border-top: 1px solid var(--card-border);
          justify-content: space-around;
          align-items: center;
          padding: 12px 0 20px;
          z-index: 50;
        }

        .nav-left {
          display: none;
        }

        /* Desktop - left sidebar nav */
        @media (min-width: 900px) {
          .nav-bottom {
            display: none;
          }

          .nav-left {
            display: flex;
            position: fixed;
            top: 0;
            left: 0;
            width: 220px;
            height: 100vh;
            flex-direction: column;
            background: rgba(8, 8, 14, 0.85);
            backdrop-filter: blur(20px);
            border-right: 1px solid rgba(99, 102, 241, 0.1);
            padding: 32px 16px;
            gap: 4px;
            z-index: 50;
          }
        }
      `}</style>

      {/* Mobile bottom nav */}
      <nav className="nav-bottom">
        {navItems.map(({ label, href, icon: Icon, id }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              id={id}
              href={href}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
                textDecoration: "none",
                color: isActive ? "var(--primary)" : "var(--muted-foreground)",
                transition: "color 0.2s",
              }}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span style={{ fontSize: "11px", fontWeight: isActive ? 600 : 400 }}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Desktop left sidebar nav */}
      <nav className="nav-left">
        {/* Logo */}
        <div style={{ marginBottom: "32px", paddingLeft: "12px" }}>
          <p style={{ fontSize: "11px", color: "var(--primary)", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>
            Shadecode
          </p>
          <p style={{ fontSize: "16px", fontWeight: 800, marginTop: "2px" }}>
            Student
          </p>
        </div>

        {/* Nav items */}
        {navItems.map(({ label, href, icon: Icon, id }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              id={id}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 12px",
                borderRadius: "10px",
                textDecoration: "none",
                color: isActive ? "var(--foreground)" : "var(--muted-foreground)",
                background: isActive ? "rgba(99,102,241,0.12)" : "transparent",
                border: isActive ? "1px solid rgba(99,102,241,0.2)" : "1px solid transparent",
                transition: "all 0.2s",
                fontWeight: isActive ? 600 : 400,
                fontSize: "14px",
              }}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} color={isActive ? "var(--primary)" : undefined} />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
