"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, CheckSquare, LayoutDashboard } from "lucide-react";

const navItems = [
  { label: "Home", href: "/", icon: Home, id: "nav-home" },
  { label: "Timetable", href: "/timetable", icon: Calendar, id: "nav-timetable" },
  { label: "Tasks", href: "/tasks", icon: CheckSquare, id: "nav-tasks" },
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, id: "nav-dashboard" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "var(--card)",
        borderTop: "1px solid var(--card-border)",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        padding: "12px 0 20px",
        zIndex: 50,
        maxWidth: "448px",
        margin: "0 auto",
      }}
    >
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
  );
}