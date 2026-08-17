import {
  LayoutDashboard,
  Timer,
  CheckSquare,
  BookOpen,
  Brain,
  Calculator,
  Sparkles,
  BarChart3,
  Trophy,
  BrainCircuit,
  Calendar,
  Gamepad2,
  Settings,
  Award,
  GraduationCap,
  Route,
  FileText,
  UploadCloud,
  ClipboardCheck,
  Tags,
  Globe,
  MessageSquare,
  Settings2,
  Share2,
} from "lucide-react";

export interface NavItem { href: string; label: string; icon: any; badge?: string; urgent?: boolean; }
export interface NavGroup { group: string; items: NavItem[]; }

export const NAV_ITEMS = {
  dashboard: { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  focus: { href: "/focus", label: "Focus", icon: Timer },
  tasks: { href: "/tasks", label: "Tasks", icon: CheckSquare },
  exams: { href: "/exams", label: "Exams", icon: BookOpen },
  examHub: { href: "/exam-hub", label: "Exam Hub", icon: FileText },
  examSim: { href: "/exam-sim", label: "Exam Sim", icon: Gamepad2 },
  learn: { href: "/learn", label: "Learn", icon: Brain },
  curriculum: { href: "/curriculum", label: "Curriculum", icon: BookOpen },
  mathChecker: { href: "/math-checker", label: "Math", icon: Calculator },
  cortexVerify: { href: "/cortex-verify", label: "Cortex Verify", icon: Sparkles, badge: "New" },
  timetable: { href: "/timetable", label: "Timetable", icon: Calendar },
  studyPlan: { href: "/study-plan", label: "Study Plan", icon: Route },
  analytics: { href: "/analytics", label: "Analytics", icon: BarChart3 },
  leaderboard: { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  cortex: { href: "/insights/history", label: "Cortex", icon: BrainCircuit },
  study: { href: "/study", label: "Study Session", icon: GraduationCap },
  achievements: { href: "/achievements", label: "Achievements", icon: Award },
  share: { href: "/share", label: "Share", icon: Share2 },
  settings: { href: "/settings", label: "Settings", icon: Settings },
  adminDashboard: { href: "/admin", label: "Overview", icon: LayoutDashboard },
  adminUpload: { href: "/admin/exam-hub/upload", label: "Upload Papers", icon: UploadCloud },
  adminModeration: { href: "/admin/exam-hub/moderation", label: "Moderation", icon: ClipboardCheck },
  adminQuestions: { href: "/admin/exam-hub/questions", label: "Tag Questions", icon: Tags },
  adminManage: { href: "/admin/exam-hub/manage", label: "Manage Papers", icon: Settings2 },
  adminBoards: { href: "/admin/exam-hub/boards", label: "Exam Boards", icon: Globe },
  adminFeedback: { href: "/admin/feedback", label: "Feedback", icon: MessageSquare },
};

export const ADMIN_NAV_GROUPS: NavGroup[] = [{
  group: "Admin",
  items: [NAV_ITEMS.adminDashboard, NAV_ITEMS.examHub, NAV_ITEMS.adminUpload, NAV_ITEMS.adminManage, NAV_ITEMS.adminModeration, NAV_ITEMS.adminQuestions, NAV_ITEMS.adminBoards, NAV_ITEMS.adminFeedback, NAV_ITEMS.settings],
}];

export const SIDEBAR_GROUPS: NavGroup[] = [
  { group: "Core", items: [NAV_ITEMS.dashboard, NAV_ITEMS.focus, NAV_ITEMS.study, NAV_ITEMS.timetable, NAV_ITEMS.studyPlan] },
  { group: "Practice", items: [NAV_ITEMS.examHub, NAV_ITEMS.tasks, NAV_ITEMS.exams, NAV_ITEMS.examSim] },
  { group: "Tools", items: [NAV_ITEMS.learn, NAV_ITEMS.curriculum, NAV_ITEMS.mathChecker, NAV_ITEMS.cortexVerify] },
  { group: "Progress", items: [NAV_ITEMS.analytics, NAV_ITEMS.leaderboard, NAV_ITEMS.achievements, NAV_ITEMS.cortex, NAV_ITEMS.share] },
];

export const BOTTOM_PRIMARY: NavItem[] = [NAV_ITEMS.dashboard, NAV_ITEMS.learn, NAV_ITEMS.tasks, NAV_ITEMS.focus, NAV_ITEMS.examHub];
export const BOTTOM_MORE: NavItem[] = [NAV_ITEMS.timetable, NAV_ITEMS.studyPlan, NAV_ITEMS.study, NAV_ITEMS.exams, NAV_ITEMS.examSim, NAV_ITEMS.curriculum, NAV_ITEMS.mathChecker, NAV_ITEMS.analytics, NAV_ITEMS.leaderboard, NAV_ITEMS.achievements, NAV_ITEMS.cortex, NAV_ITEMS.share, NAV_ITEMS.settings];

export function isRouteActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
