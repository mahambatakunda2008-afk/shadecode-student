"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
  Flame,
  ChevronLeft,
  Search,
} from "lucide-react";

const primaryNavItems = [
  {
    label: "Home",
    href: "/",
    icon: Home,
  },
  {
    label: "Learn",
    href: "/learn",
    icon: Brain,
    badge: "AI",
  },
  {
    label: "Tasks",
    href: "/tasks",
    icon: CheckSquare,
    badge: "3",
    danger: true,
  },
  {
    label: "Focus",
    href: "/focus",
    icon: Timer,
    glow: true,
  },
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
];

const moreNavItems = [
  {
    label: "Timetable",
    href: "/timetable",
    icon: Calendar,
  },
  {
    label: "Exams",
    href: "/exams",
    icon: BookOpen,
    badge: "2d",
  },
  {
    label: "Exam Sim",
    href: "/exam-sim",
    icon: GraduationCap,
  },
  {
    label: "Math",
    href: "/math-checker",
    icon: PenLine,
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart2,
  },
  {
    label: "Ranks",
    href: "/leaderboard",
    icon: Trophy,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

const sidebarItems = [
  ...primaryNavItems,
  ...moreNavItems,
];

export default function BottomNav() {
  const pathname = usePathname();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const saved = localStorage.getItem("shade-sidebar");

    if (saved === "collapsed") {
      setCollapsed(true);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    localStorage.setItem(
      "shade-sidebar",
      collapsed ? "collapsed" : "expanded"
    );
  }, [collapsed, mounted]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const greeting = useMemo(() => {
    const hour = new Date().getHours();

    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";

    return "Good evening";
  }, []);

  return (
    <>
      <style>{`
        :root {
          --sidebar-width: 250px;
          --sidebar-collapsed-width: 82px;
        }

        * {
          box-sizing: border-box;
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
          position: relative;
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
          font-weight: 600;
        }

        .mobile-badge {
          position: absolute;
          top: -4px;
          right: 4px;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 800;
          background: var(--primary);
          color: white;
        }

        .mobile-badge.danger {
          background: #ef4444;
        }

        .mobile-glow {
          position: absolute;
          inset: -8px;
          border-radius: 999px;
          background: rgba(99,102,241,0.18);
          filter: blur(18px);
          animation: pulseGlow 2s infinite;
          z-index: -1;
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
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(6px);
          z-index: 998;
          animation: fadeIn 0.2s ease;
        }

        .drawer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(10,10,16,0.97);
          backdrop-filter: blur(30px);
          border-top-left-radius: 28px;
          border-top-right-radius: 28px;
          border-top: 1px solid rgba(99,102,241,0.12);
          padding: 20px;
          z-index: 999;
          animation: slideUp 0.25s ease;
        }

        .drawer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .drawer-title {
          font-size: 20px;
          font-weight: 800;
        }

        .drawer-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }

        .drawer-link {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 18px 10px;
          border-radius: 18px;
          text-decoration: none;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          transition: all 0.18s ease;
        }

        .drawer-link.active {
          background: rgba(99,102,241,0.12);
          border: 1px solid rgba(99,102,241,0.2);
        }

        .drawer-link:active {
          transform: scale(0.96);
        }

        .drawer-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          min-width: 18px;
          height: 18px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 5px;
          font-size: 9px;
          font-weight: 800;
          background: var(--primary);
          color: white;
        }

        .sidebar {
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

        @keyframes pulseGlow {
          0% {
            opacity: 0.5;
            transform: scale(0.9);
          }

          50% {
            opacity: 1;
            transform: scale(1.05);
          }

          100% {
            opacity: 0.5;
            transform: scale(0.9);
          }
        }

        @media (min-width: 900px) {
          .nav-bottom,
          .drawer,
          .drawer-backdrop {
            display: none;
          }

          .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            width: ${
              collapsed
                ? "var(--sidebar-collapsed-width)"
                : "var(--sidebar-width)"
            };
            height: 100vh;
            display: flex;
            flex-direction: column;
            background: rgba(8,8,14,0.84);
            backdrop-filter: blur(24px);
            border-right: 1px solid rgba(99,102,241,0.08);
            padding: 18px 12px;
            z-index: 999;
            transition: width 0.22s ease;
            overflow: hidden;
          }

          .sidebar-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
          }

          .logo-wrap {
            overflow: hidden;
            white-space: nowrap;
          }

          .logo-kicker {
            font-size: 11px;
            color: var(--primary);
            letter-spacing: 2px;
            text-transform: uppercase;
            font-weight: 700;
          }

          .logo-title {
            font-size: 18px;
            font-weight: 800;
            margin-top: 4px;
          }

          .collapse-btn {
            border: none;
            background: rgba(255,255,255,0.04);
            width: 36px;
            height: 36px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--foreground);
            cursor: pointer;
            flex-shrink: 0;
          }

          .streak-card {
            position: relative;
            overflow: hidden;
            margin-bottom: 20px;
            border-radius: 20px;
            padding: 16px;
            background:
              radial-gradient(circle at top right,
              rgba(249,115,22,0.22),
              transparent 45%),
              rgba(255,255,255,0.03);

            border: 1px solid rgba(255,255,255,0.05);
          }

          .streak-row {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .streak-flame {
            width: 42px;
            height: 42px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(249,115,22,0.16);
            color: #fb923c;
          }

          .streak-title {
            font-size: 13px;
            font-weight: 700;
          }

          .streak-sub {
            font-size: 12px;
            color: var(--muted-foreground);
            margin-top: 2px;
          }

          .greeting {
            margin-bottom: 16px;
            padding: 0 4px;
          }

          .greeting-title {
            font-size: 13px;
            color: var(--muted-foreground);
          }

          .greeting-main {
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
            position: relative;
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 14px;
            border-radius: 14px;
            text-decoration: none;
            border: 1px solid transparent;
            transition: all 0.18s ease;
            overflow: hidden;
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
              0 0 18px rgba(99,102,241,0.08);
          }

          .sidebar-label {
            font-size: 14px;
            font-weight: 600;
            white-space: nowrap;
          }

          .sidebar-badge {
            margin-left: auto;
            min-width: 18px;
            height: 18px;
            padding: 0 5px;
            border-radius: 999px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 9px;
            font-weight: 800;
            background: var(--primary);
            color: white;
          }

          .sidebar-badge.danger {
            background: #ef4444;
          }

          .command-bar {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 14px;
            border-radius: 14px;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.05);
            margin-bottom: 18px;
            color: var(--muted-foreground);
          }

          .command-shortcut {
            margin-left: auto;
            font-size: 11px;
            padding: 4px 6px;
            border-radius: 8px;
            background: rgba(255,255,255,0.05);
          }
        }
      `}</style>

      {/* MOBILE NAV */}
      <nav className="nav-bottom">
        {primaryNavItems.map(
          ({ label, href, icon: Icon, badge, danger, glow }) => {
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
                {glow && <div className="mobile-glow" />}

                {badge && (
                  <div
                    className={`mobile-badge ${
                      danger ? "danger" : ""
                    }`}
                  >
                    {badge}
                  </div>
                )}

                <Icon size={22} strokeWidth={active ? 2.6 : 1.9} />

                <span className="mobile-label">{label}</span>
              </Link>
            );
          }
        )}

        <button
          className="more-btn"
          onClick={() => setDrawerOpen(true)}
        >
          <MoreHorizontal size={22} />
          <span className="mobile-label">More</span>
        </button>
      </nav>

      {/* MOBILE DRAWER */}
      {drawerOpen && (
        <>
          <div
            className="drawer-backdrop"
            onClick={() => setDrawerOpen(false)}
          />

          <div className="drawer">
            <div className="drawer-header">
              <div className="drawer-title">More</div>

              <button
                onClick={() => setDrawerOpen(false)}
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
              {moreNavItems.map(
                ({ label, href, icon: Icon, badge }) => {
                  const active = isActive(href);

                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`drawer-link ${
                        active ? "active" : ""
                      }`}
                      onClick={() => setDrawerOpen(false)}
                      style={{
                        color: active
                          ? "var(--primary)"
                          : "var(--foreground)",
                      }}
                    >
                      {badge && (
                        <div className="drawer-badge">
                          {badge}
                        </div>
                      )}

                      <Icon size={22} />

                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          textAlign: "center",
                        }}
                      >
                        {label}
                      </span>
                    </Link>
                  );
                }
              )}
            </div>
          </div>
        </>
      )}

      {/* DESKTOP SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-top">
          {!collapsed && (
            <div className="logo-wrap">
              <div className="logo-kicker">Shadecode</div>
              <div className="logo-title">Student</div>
            </div>
          )}

          <button
            className="collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronLeft
              size={18}
              style={{
                transform: collapsed
                  ? "rotate(180deg)"
                  : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            />
          </button>
        </div>

        {!collapsed && (
          <>
            <div className="streak-card">
              <div className="streak-row">
                <div className="streak-flame">
                  <Flame size={20} />
                </div>

                <div>
                  <div className="streak-title">
                    12 Day Streak
                  </div>

                  <div className="streak-sub">
                    Your momentum is dangerous.
                  </div>
                </div>
              </div>
            </div>

            <div className="greeting">
              <div className="greeting-title">
                {greeting},
              </div>

              <div className="greeting-main">
                Takunda.
              </div>
            </div>

            <div className="command-bar">
              <Search size={16} />
              <span>Search anything...</span>

              <div className="command-shortcut">
                Ctrl K
              </div>
            </div>
          </>
        )}

        <div className="sidebar-nav">
          {sidebarItems.map(
            ({
              label,
              href,
              icon: Icon,
              badge,
              danger,
            }) => {
              const active = isActive(href);

              return (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  className={`sidebar-link ${
                    active ? "active" : ""
                  }`}
                  style={{
                    color: active
                      ? "var(--foreground)"
                      : "var(--muted-foreground)",
                    justifyContent: collapsed
                      ? "center"
                      : "flex-start",
                  }}
                >
                  <Icon
                    size={19}
                    strokeWidth={active ? 2.5 : 1.9}
                    color={active ? "var(--primary)" : undefined}
                  />

                  {!collapsed && (
                    <>
                      <span className="sidebar-label">
                        {label}
                      </span>

                      {badge && (
                        <div
                          className={`sidebar-badge ${
                            danger ? "danger" : ""
                          }`}
                        >
                          {badge}
                        </div>
                      )}
                    </>
                  )}
                </Link>
              );
            }
          )}
        </div>
      </aside>
    </>
  );
}
