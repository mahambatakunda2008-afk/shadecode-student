"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import {
  Home, Calendar, CheckSquare, LayoutDashboard, BookOpen, Brain,
  PenLine, GraduationCap, BarChart2, Trophy, Settings, Timer, Menu, ChevronDown
} from "lucide-react";

const coreNavItems = [
  { label: "Home", href: "/", icon: Home },
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
];

const groupedNavItems = {
  Exams: [
    { label: "Exams", href: "/exams", icon: BookOpen },
    { label: "Exam Sim", href: "/exam-sim", icon: GraduationCap },
  ],
  Learning: [
    { label: "Learn", href: "/learn", icon: Brain },
    { label: "Math", href: "/math-checker", icon: PenLine },
    { label: "Focus", href: "/focus", icon: Timer },
  ],
  Extras: [
    { label: "Timetable", href: "/timetable", icon: Calendar },
    { label: "Analytics", href: "/analytics", icon: BarChart2 },
    { label: "Ranks", href: "/leaderboard", icon: Trophy },
    { label: "Settings", href: "/settings", icon: Settings },
  ],
};

type SectionKey = keyof typeof groupedNavItems;

export default function BottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState<Record<SectionKey, boolean>>({
    Exams: false,
    Learning: false,
    Extras: false,
  });
  const [dragY, setDragY] = React.useState(0);
  const touchStartY = React.useRef<number | null>(null);

  const toggleSection = (section: SectionKey) => {
    setExpanded((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Swipe + drag handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setDragY(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;
    if (deltaY > 0) {
      setDragY(deltaY); // drawer follows finger downward
    }
  };

  const handleTouchEnd = () => {
    if (dragY > 80) {
      setOpen(false); // close if dragged far enough
    }
    setDragY(0);
    touchStartY.current = null;
  };

  return (
    <>
      <style>{`
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
        .overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.4);
          z-index: 40;
          pointer-events: ${open ? "auto" : "none"};
        }
        @keyframes bounceOpen {
          0% { transform: translateY(100%); }
          60% { transform: translateY(-10px); }
          80% { transform: translateY(5px); }
          100% { transform: translateY(0); }
        }
        .drawer {
          position: fixed;
          bottom: 60px;
          left: 0;
          right: 0;
          background: var(--card);
          border-top: 1px solid var(--card-border);
          max-height: 70vh;
          overflow-y: auto;
          transform: translateY(${open ? (dragY > 0 ? dragY + "px" : "0") : "100%"});
          transition: ${dragY === 0 ? "transform 0.3s ease-in-out" : "none"};
          padding: 10px;
          z-index: 50;
          border-radius: 12px 12px 0 0;
          animation: ${open && dragY === 0 ? "bounceOpen 0.5s ease" : "none"};
        }
        .drawer-handle {
          width: 40px;
          height: 5px;
          background: var(--card-border);
          border-radius: 3px;
          margin: 8px auto;
        }
        .drawer-section {
          margin-bottom: 10px;
        }
        .drawer-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px;
          cursor: pointer;
          font-weight: bold;
        }
        .drawer a {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
        }
      `}</style>

      <div className="nav-bottom">
        {coreNavItems.map(({ label, href, icon: Icon }) => (
          <Link key={href} href={href} className={pathname === href ? "active" : ""}>
            <Icon />
          </Link>
        ))}
        <button onClick={() => setOpen(!open)}>
          <Menu />
        </button>
      </div>

      {open && <div className="overlay" onClick={() => setOpen(false)} />}

      <div
        className="drawer"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="drawer-handle"></div>
        {Object.entries(groupedNavItems).map(([section, items]) => (
          <div key={section} className="drawer-section">
            <div className="drawer-section-header" onClick={() => toggleSection(section as SectionKey)}>
              {section}
              <ChevronDown
                style={{
                  transform: expanded[section as SectionKey] ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}
              />
            </div>
            {expanded[section as SectionKey] &&
              items.map(({ label, href, icon: Icon }) => (
                <Link key={href} href={href}>
                  <Icon /> {label}
                </Link>
              ))}
          </div>
        ))}
      </div>
    </>
  );
}
