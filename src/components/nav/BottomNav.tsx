"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  Home,
  Calendar,
  CheckSquare,
  LayoutDashboard,
  BookOpen,
  Brain,
  PenLine,
  GraduationCap,
  BarChart2,
  Trophy,
  Settings,
  Timer,
  MoreHorizontal,
  X,
} from "lucide-react";

const primaryNavItems = [
  { label: "Home", href: "/", icon: Home },
  { label: "Learn", href: "/learn", icon: Brain },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Focus", href: "/focus", icon: Timer },
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
];

const moreNavItems = [
  { label: "Timetable", href: "/timetable", icon: Calendar },
  { label: "Exams", href: "/exams", icon: BookOpen },
  { label: "Exam Sim", href: "/exam-sim", icon: GraduationCap },
  { label: "Math", href: "/math-checker", icon: PenLine },
  { label: "Analytics", href: "/analytics", icon: BarChart2 },
  { label: "Ranks", href: "/leaderboard", icon: Trophy },
  { label: "Settings", href: "/settings", icon: Settings },
];

const sidebarNavItems = [
  ...primaryNavItems,
  ...moreNavItems,
];

export default function BottomNav() {
  const pathname = usePathname();

  const [open, setOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      <style>{`
        :root {
          --sidebar-width: 240px;
        }

        .nav-bottom {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          display: flex;
          justify-content: space-around;
          align-items: center;
          padding: 10px 8px 18px;
          background: rgba(8,8,14,0.92);
          backdrop-filter: blur(24px);
          border-top: 1px solid rgba(99,102,241,0.12);
          z-index: 999;
        }

        .mobile-link {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          text-decoration: none;
          min-width: 58px;
          transition: all 0.18s ease;
        }

        .mobile-link:active {
          transform: scale(0.94);
        }

        .mobile-label {
          font-size: 11px;
        }

        .more-btn {
          border: none;
          background: transparent;
          color: var(--muted-foreground);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          cursor: pointer;
        }

        .drawer-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(6px);
          z-index: 998;
          animation: fadeIn 0.2s ease;
        }

        .drawer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(12,12,18,0.96);
          backdrop-filter: blur(30px);
          border-top-left-radius: 24px;
          border-top-right-radius: 24px;
          border-top: 1px solid rgba(99,102,241,0.12);
          padding: 20px;
          z-index: 999;
          animation: slideUp 0.25s ease;
        }

        .drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .drawer-title {
          font-size: 18px;
          font-weight: 700;
        }

        .drawer-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }

        .drawer-link {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 18px 10px;
          border-radius: 18px;
          text-decoration: none;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.04);
          transition: all 0.18s ease;
        }

        .drawer-link:active {
          transform: scale(0.96);
        }

        .drawer-link.active {
          background: rgba(99,102,241,0.12);
          border: 1px solid rgba(99,102,241,0.2);
        }

        .nav-left {
          display: none;
        }

        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }

          to {
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        @media (min-width: 900px) {
          .nav-bottom,
          .drawer,
          .drawer-backdrop {
            display: none;
          }

          .nav-left {
            display: flex;
            position: fixed;
            top: 0;
            left: 0;
            width: var(--sidebar-width);
            height: 100vh;
            flex-direction: column;
            padding: 28px 14px;
            background: rgba(8,8,14,0.84);
            backdrop-filter: blur(24px);
            border-right: 1px solid rgba(99,102,241,0.08);
            z-index: 999;
          }

          .sidebar-logo {
            margin-bottom: 30px;
            padding: 0 12px 20px;
            border-bottom: 1px solid rgba(255,255,255,0.05);
          }

          .sidebar-logo p:first-child {
            font-size: 11px;
            color: var(--primary);
            letter-spacing: 2px;
            text-transform: uppercase;
            font-weight: 700;
          }

          .sidebar-logo p:last-child {
            font-size: 18px;
            font-weight: 800;
            margin-top: 4px;
          }

          .sidebar-nav {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .sidebar-link {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 14px;
            border-radius: 14px;
            text-decoration: none;
            transition: all 0.18s ease;
            border: 1px solid transparent;
          }

          .sidebar-link:hover {
            transform: translateX(4px);
            background: rgba(255,255,255,0.03);
          }

          .sidebar-link.active {
            background: rgba(99,102,241,0.12);
            border: 1px solid rgba(99,102,241,0.18);
            box-shadow: inset 3px 0 0 var(--primary);
          }
        }
      `}</style>

      {/* MOBILE NAV */}
      <nav className="nav-bottom">
        {primaryNavItems.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);

          return (
            <Link
              key={href}
              href={href}
              className="mobile-link"
              style={{
                color: active
                  ? "var(--primary)"
                  : "var(--muted-foreground)",
              }}
            >
              <Icon size={22} strokeWidth={active ? 2.6 : 1.9} />

              <span
                className="mobile-label"
                style={{
                  fontWeight: active ? 700 : 500,
                }}
              >
                {label}
              </span>
            </Link>
          );
        })}

        <button className="more-btn" onClick={() => setOpen(true)}>
          <MoreHorizontal size={22} />
          <span className="mobile-label">More</span>
        </button>
      </nav>

      {/* MOBILE DRAWER */}
      {open && (
        <>
          <div
            className="drawer-backdrop"
            onClick={() => setOpen(false)}
          />

          <div className="drawer">
            <div className="drawer-header">
              <div className="drawer-title">More</div>

              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--foreground)",
                  cursor: "pointer",
                }}
              >
                <X size={22} />
              </button>
            </div>

            <div className="drawer-grid">
              {moreNavItems.map(({ label, href, icon: Icon }) => {
                const active = isActive(href);

                return (
                  <Link
                    key={href}
                    href={href}
                    className={`drawer-link ${active ? "active" : ""}`}
                    onClick={() => setOpen(false)}
                    style={{
                      color: active
                        ? "var(--primary)"
                        : "var(--foreground)",
                    }}
                  >
                    <Icon size={22} />
                    <span
                      style={{
                        fontSize: "12px",
                        textAlign: "center",
                        fontWeight: 600,
                      }}
                    >
                      {label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* DESKTOP SIDEBAR */}
      <nav className="nav-left">
        <div className="sidebar-logo">
          <p>Shadecode</p>
          <p>Student</p>
        </div>

        <div className="sidebar-nav">
          {sidebarNavItems.map(({ label, href, icon: Icon }) => {
            const active = isActive(href);

            return (
              <Link
                key={href}
                href={href}
                className={`sidebar-link ${active ? "active" : ""}`}
                style={{
                  color: active
                    ? "var(--foreground)"
                    : "var(--muted-foreground)",
                }}
              >
                <Icon
                  size={18}
                  strokeWidth={active ? 2.5 : 1.9}
                  color={active ? "var(--primary)" : undefined}
                />

                <span
                  style={{
                    fontWeight: active ? 650 : 500,
                    fontSize: "14px",
                  }}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
