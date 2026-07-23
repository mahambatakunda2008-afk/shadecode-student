import {
  LayoutDashboard,
  Timer,
  CheckSquare,
  BookOpen,
  Brain,
  Calculator,
  BarChart3,
  Trophy,
  BrainCircuit,
  Calendar,
  Gamepad2,
  Settings,
  Award,
  GraduationCap,
  FileText,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: any;
  badge?: string;
  urgent?: boolean;
}

export interface NavGroup {
  group: string;
  items: NavItem[];
}

export const NAV_ITEMS = {
  dashboard: { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  focus: { href: "/focus", label: "Focus", icon: Timer },
  tasks: { href: "/tasks", label: "Tasks", icon: CheckSquare, badge: "3", urgent: false },
  exams: { href: "/exams", label: "Exams", icon: BookOpen, badge: "2d", urgent: true },
  examHub: { href: "/exam-hub", label: "Exam Hub", icon: FileText },
  examSim: { href: "/exam-sim", label: "Exam Sim", icon: Gamepad2 },
  learn: { href: "/learn", label: "Learn", icon: Brain },
  curriculum: { href: "/curriculum", label: "Curriculum", icon: BookOpen },
  mathChecker: { href: "/math-checker", label: "Math", icon: Calculator },
  timetable: { href: "/timetable", label: "Timetable", icon: Calendar },
  analytics: { href: "/analytics", label: "Analytics", icon: BarChart3 },
  leaderboard: { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  cortex: { href: "/insights/history", label: "Cortex", icon: BrainCircuit },
  study: { href: "/study", label: "Study Session", icon: GraduationCap },
  achievements: { href: "/achievements", label: "Achievements", icon: Award },
  settings: { href: "/settings", label: "Settings", icon: Settings },
};

// Sidebar groups (all items accessible on desktop)
export const SIDEBAR_GROUPS: NavGroup[] = [
  {
    group: "Core",
    items: [NAV_ITEMS.dashboard, NAV_ITEMS.focus, NAV_ITEMS.study, NAV_ITEMS.timetable],
  },
  {
    group: "Practice",
    items: [NAV_ITEMS.examHub, NAV_ITEMS.tasks, NAV_ITEMS.exams, NAV_ITEMS.examSim],
  },
  {
    group: "Tools",
    items: [NAV_ITEMS.learn, NAV_ITEMS.curriculum, NAV_ITEMS.mathChecker],
  },
  {
    group: "Progress",
    items: [NAV_ITEMS.analytics, NAV_ITEMS.leaderboard, NAV_ITEMS.achievements, NAV_ITEMS.cortex],
  },
];

// BottomNav items for mobile layout
export const BOTTOM_PRIMARY: NavItem[] = [
  NAV_ITEMS.dashboard,
  NAV_ITEMS.learn,
  NAV_ITEMS.tasks,
  NAV_ITEMS.focus,
  NAV_ITEMS.examHub,
];

export const BOTTOM_MORE: NavItem[] = [
  NAV_ITEMS.timetable,
  NAV_ITEMS.study,
  NAV_ITEMS.exams,
  NAV_ITEMS.examSim,
  NAV_ITEMS.curriculum,
  NAV_ITEMS.mathChecker,
  NAV_ITEMS.analytics,
  NAV_ITEMS.leaderboard,
  NAV_ITEMS.achievements,
  NAV_ITEMS.cortex,
  NAV_ITEMS.settings,
];

export function isRouteActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

