"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";

const primaryNavItems = [
  { label: "Home", href: "/", icon: Home, id: "nav-home" },
  { label: "Learn", href: "/learn", icon: Brain, id: "nav-learn" },
  { label: "Tasks", href: "/tasks", icon: CheckSquare, id: "nav-tasks" },
  { label: "Focus", href: "/focus", icon: Timer, id: "nav-focus" },
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    id: "nav-dashboard",
  },
];

const sidebarNavItems = [
  { label: "Home", href: "/", icon: Home, id: "nav-home" },
  { label: "Focus", href: "/focus", icon: Timer, id: "nav-focus" },
  { label: "Learn", href: "/learn", icon: Brain, id: "nav-learn" },
  { label: "Tasks", href: "/tasks", icon: CheckSquare, id: "nav-tasks" },
  {
    label: "Timetable",
    href: "/timetable",
    icon: Calendar,
    id: "nav-timetable",
  },
  { label: "Exams", href: "/exams", icon: BookOpen, id: "nav-exams" },
  {
    label: "Exam Sim",
    href: "/exam-sim",
    icon: GraduationCap,
    id: "nav-exam-sim",
  },
  {
    label: "Math",
    href: "/math-checker",
    icon: PenLine,
    id: "nav-math",
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart2,
    id: "nav-analytics",
  },
  {
    label: "Ranks",
    href: "/leaderboard",
    icon: Trophy,
    id: "nav-leaderboard",
  },
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    id: "nav-dashboard",
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    id: "nav-settings",
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  const isRouteActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      <style>{`
        :root {
          --sidebar-width: 240px;
        }

        * {
          box-sizing: border-box;
        }

        .nav-bottom {
          display: flex;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(8, 8, 14, 0.92);
          backdrop-filter: blur(20px);
          border-top: 1px solid rgba(99, 102, 241, 0.12);
          justify-content: space-around;
          align-items: center;
          padding: 10px 8px 18px;
          z-index: 999;
        }

        .nav-bottom-link {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          text-decoration: none;
          min-width: 58px;
          transition: all 0.18s cubic-bezier(.2,.8,.2,1);
        }

        .nav-bottom-link:active {
          transform: scale(0.96);
        }

        .nav-bottom-label {
          font-size: 11px;
          line-height: 1;
        }

        .nav-left {
          display: none;
        }

        .sidebar-logo {
          position: relative;
          margin-bottom: 28px;
          padding: 0 12px 24px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .sidebar-logo::before {
          content: "";
          position: absolute;
          left: 12px;
          top: 2px;
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: var(--primary);
          box-shadow:
            0 0 12px var(--primary),
            0 0 28px var(--primary);
          animation: pulseOrb 2.8s infinite;
        }

        @keyframes pulseOrb {
          0% {
            transform: scale(1);
            opacity: 1;
          }

          50% {
            transform: scale(1.5);
            opacity: 0.7;
          }

          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .sidebar-kicker {
          font-size: 11px;
          color: var(--primary);
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-left: 18px;
        }

        .sidebar-title {
          font-size: 18px;
          font-weight: 800;
          margin-top: 4px;
          margin-left: 18px;
          color: var(--foreground);
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .sidebar-link {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 14px;
          text-decoration: none;
          overflow: hidden;
          transition: all 0.18s cubic-bezier(.2,.8,.2,1);
          border: 1px solid transparent;
        }

        .sidebar-link:hover {
          transform: translateX(4px);
          background: rgba(255,255,255,0.03);
        }

        .sidebar-link.active {
          background: rgba(99,102,241,0.12);
          border: 1px solid rgba(99,102,241,0.18);
          box-shadow:
            inset 3px 0 0 var(--primary),
            0 0 24px rgba(99,102,241,0.08);
        }

        .sidebar-link.active::before {
          content: "";
          position: absolute;
          left: 0;
          top: 10%;
          width: 3px;
          height: 80%;
          border-radius: 999px;
          background: var(--primary);
          box-shadow: 0 0 12px var(--primary);
        }

        @media (min-width: 900px) {
          .nav-bottom {
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
            background: rgba(8, 8, 14, 0.82);
            backdrop-filter: blur(24px);
            border-right: 1px solid rgba(99,102,241,0.08);
            padding: 28px 14px;
            z-index: 999;
          }
        }
      `}</style>

      {/* Mobile Navigation */}
      <nav className="nav-bottom">
        {primaryNavItems.map(({ label, href, icon: Icon, id }) => {
          const isActive = isRouteActive(href);

          return (
            <Link
              key={href}
              id={id}
              href={href}
              className="nav-bottom-link"
              style={{
                color: isActive
                  ? "var(--primary)"
                  : "var(--muted-foreground)",
              }}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.6 : 1.9}
              />

              <span
                className="nav-bottom-label"
                style={{
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                {label}
              </span>
            </Link>
          );
        })}

        <button
          aria-label="More"
          style={{
            border: "none",
            background: "transparent",
            color: "var(--muted-foreground)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
            cursor: "pointer",
          }}
        >
          <MoreHorizontal size={22} />
          <span
            style={{
              fontSize: "11px",
            }}
          >
            More
          </span>
        </button>
      </nav>

      {/* Desktop Sidebar */}
      <nav className="nav-left">
        <div className="sidebar-logo">
          <div className="sidebar-kicker">Shadecode</div>
          <div className="sidebar-title">Student</div>
        </div>

        <div className="sidebar-nav">
          {sidebarNavItems.map(({ label, href, icon: Icon, id }) => {
            const isActive = isRouteActive(href);

            return (
              <Link
                key={href}
                id={id}
                href={href}
                title={label}
                className={`sidebar-link ${isActive ? "active" : ""}`}
                style={{
                  color: isActive
                    ? "var(--foreground)"
                    : "var(--muted-foreground)",
                  fontWeight: isActive ? 650 : 500,
                  fontSize: "14px",
                }}
              >
                <Icon
                  size={18}
                  strokeWidth={isActive ? 2.5 : 1.9}
                  color={isActive ? "var(--primary)" : undefined}
                />

                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
