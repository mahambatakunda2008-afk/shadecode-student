import {
  House,
  Timer,
  ListChecks,
  BookOpen,
  BarChart3,
  Trophy,
  Target,
  CalendarDays,
  Play,
  Settings,
  Award,
  GraduationCap,
  Route,
  Files,
  UploadCloud,
  ClipboardCheck,
  Tags,
  Globe,
  MessageSquare,
  Settings2,
  Share2,
  BriefcaseBusiness,
  FolderKanban,
  LibraryBig,
  Code2,
  Smartphone,
  Calculator,
  Lightbulb,
  UserRound,
  FlaskConical,
  LayoutDashboard,
} from "lucide-react";
import type { AcademicExperience } from "@/lib/academic/experience";

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

export const NAV_ITEMS: Record<string, NavItem> = {
  dashboard: { href: "/dashboard", label: "Home", icon: House },
  focus: { href: "/focus", label: "Focus", icon: Target },
  tasks: { href: "/tasks", label: "Tasks", icon: ListChecks },
  exams: { href: "/exams", label: "Assessments", icon: ClipboardCheck },
  examHub: { href: "/exam-hub", label: "Past Papers", icon: Files },
  examSim: { href: "/exam-sim", label: "Exam Sim", icon: ClipboardCheck },
  mathChecker: { href: "/math-checker", label: "Math Checker", icon: Calculator },
  learn: { href: "/learn", label: "Learn", icon: BookOpen },
  compLab: { href: "/comp-lab", label: "Code Lab", icon: Code2 },
  curriculum: { href: "/curriculum", label: "Courses", icon: BookOpen },
  workmate: { href: "/workmate", label: "Workmate", icon: BriefcaseBusiness },
  projects: { href: "/projects", label: "Projects", icon: FolderKanban },
  studyspace: { href: "/studyspace", label: "StudySpace", icon: LibraryBig },
  timetable: { href: "/timetable", label: "Timetable", icon: CalendarDays },
  studyPlan: { href: "/study-plan", label: "Study Plan", icon: Route },
  analytics: { href: "/analytics", label: "Progress", icon: BarChart3 },
  leaderboard: { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  cortex: { href: "/insights/history", label: "Insights", icon: Lightbulb },
  study: { href: "/study", label: "Study Session", icon: GraduationCap },
  achievements: { href: "/achievements", label: "Achievements", icon: Award },
  share: { href: "/share", label: "Share", icon: Share2 },
  whatsapp: { href: "/whatsapp", label: "WhatsApp", icon: Smartphone },
  profile: { href: "/settings", label: "Profile", icon: UserRound },
  virtualLab: { href: "/virtual-lab", label: "Virtual Lab", icon: FlaskConical },
  settings: { href: "/settings", label: "Settings", icon: Settings },

  adminDashboard: { href: "/admin", label: "Overview", icon: LayoutDashboard },
  adminAnalytics: { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  adminUpload: { href: "/admin/exam-hub/upload", label: "Upload Papers", icon: UploadCloud },
  adminModeration: { href: "/admin/exam-hub/moderation", label: "Moderation", icon: ClipboardCheck },
  adminQuestions: { href: "/admin/exam-hub/questions", label: "Tag Questions", icon: Tags },
  adminManage: { href: "/admin/exam-hub/manage", label: "Manage Papers", icon: Settings2 },
  adminBoards: { href: "/admin/exam-hub/boards", label: "Exam Boards", icon: Globe },
  adminFeedback: { href: "/admin/feedback", label: "Feedback", icon: MessageSquare },
};

export const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    group: "Admin",
    items: [
      NAV_ITEMS.adminDashboard,
      NAV_ITEMS.adminAnalytics,
      NAV_ITEMS.examHub,
      NAV_ITEMS.adminUpload,
      NAV_ITEMS.adminManage,
      NAV_ITEMS.adminModeration,
      NAV_ITEMS.adminQuestions,
      NAV_ITEMS.adminBoards,
      NAV_ITEMS.adminFeedback,
      NAV_ITEMS.settings,
    ],
  },
];

export function getExperienceNavGroups(
  experience: AcademicExperience,
  _curriculumSubjects?: unknown,
  _profileSubjects?: unknown,
): NavGroup[] {
  const foundation: NavGroup[] = [
    { group: "Start here", items: [NAV_ITEMS.dashboard, NAV_ITEMS.learn] },
    {
      group: "Keep exploring",
      items: [
        NAV_ITEMS.tasks,
        NAV_ITEMS.timetable,
        NAV_ITEMS.studyPlan,
        NAV_ITEMS.achievements,
        NAV_ITEMS.whatsapp,
      ],
    },
  ];

  const school: NavGroup[] = [
    {
      group: "Study",
      items: [
        NAV_ITEMS.dashboard,
        NAV_ITEMS.learn,
        NAV_ITEMS.curriculum,
        NAV_ITEMS.study,
        NAV_ITEMS.studyPlan,
      ],
    },
    { group: "Comp Lab", items: [NAV_ITEMS.compLab] },
    {
      group: "Practice",
      items: [
        NAV_ITEMS.examHub,
        NAV_ITEMS.examSim,
        NAV_ITEMS.exams,
        NAV_ITEMS.mathChecker,
        NAV_ITEMS.tasks,
        NAV_ITEMS.focus,
        NAV_ITEMS.timetable,
      ],
    },
    { group: "Connect", items: [NAV_ITEMS.whatsapp] },
    {
      group: "Tools",
      items: [NAV_ITEMS.studyspace, NAV_ITEMS.cortex, NAV_ITEMS.share, NAV_ITEMS.virtualLab],
    },
    {
      group: "Progress",
      items: [NAV_ITEMS.analytics, NAV_ITEMS.achievements, NAV_ITEMS.leaderboard],
    },
  ];

  const beyond: NavGroup[] = [
    {
      group: "Workspace",
      items: [
        NAV_ITEMS.dashboard,
        NAV_ITEMS.curriculum,
        NAV_ITEMS.studyspace,
        NAV_ITEMS.learn,
        NAV_ITEMS.studyPlan,
      ],
    },
    { group: "Comp Lab", items: [NAV_ITEMS.compLab] },
    {
      group: "Work",
      items: [
        NAV_ITEMS.workmate,
        NAV_ITEMS.projects,
        NAV_ITEMS.tasks,
        NAV_ITEMS.focus,
        NAV_ITEMS.timetable,
      ],
    },
    { group: "Connect", items: [NAV_ITEMS.whatsapp] },
    {
      group: "Growth",
      items: [NAV_ITEMS.analytics, NAV_ITEMS.cortex, NAV_ITEMS.achievements, NAV_ITEMS.share],
    },
  ];

  const groups =
    experience.family === "foundation"
      ? foundation
      : experience.family === "school"
        ? school
        : beyond;

  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => experience.allowedRoutes.includes(item.href) || item.href === "/whatsapp",
      ),
    }))
    .filter((group) => group.items.length > 0);
}

export const SIDEBAR_GROUPS: NavGroup[] = [
  {
    group: "Core",
    items: [
      NAV_ITEMS.dashboard,
      NAV_ITEMS.focus,
      NAV_ITEMS.study,
      NAV_ITEMS.timetable,
      NAV_ITEMS.studyPlan,
    ],
  },
  { group: "Comp Lab", items: [NAV_ITEMS.compLab] },
  {
    group: "Practice",
    items: [NAV_ITEMS.examHub, NAV_ITEMS.tasks, NAV_ITEMS.exams, NAV_ITEMS.examSim, NAV_ITEMS.mathChecker],
  },
  {
    group: "Tools",
    items: [
      NAV_ITEMS.learn,
      NAV_ITEMS.curriculum,
      NAV_ITEMS.projects,
      NAV_ITEMS.workmate,
      NAV_ITEMS.studyspace,
      NAV_ITEMS.cortex,
      NAV_ITEMS.share,
      NAV_ITEMS.virtualLab,
    ],
  },
  { group: "Connect", items: [NAV_ITEMS.whatsapp] },
  {
    group: "Progress",
    items: [NAV_ITEMS.analytics, NAV_ITEMS.leaderboard, NAV_ITEMS.achievements],
  },
];

export const BOTTOM_PRIMARY: NavItem[] = [
  NAV_ITEMS.dashboard,
  NAV_ITEMS.learn,
  NAV_ITEMS.compLab,
  NAV_ITEMS.tasks,
  NAV_ITEMS.focus,
];

export const BOTTOM_MORE: NavItem[] = [
  NAV_ITEMS.curriculum,
  NAV_ITEMS.timetable,
  NAV_ITEMS.studyPlan,
  NAV_ITEMS.study,
  NAV_ITEMS.exams,
  NAV_ITEMS.examSim,
  NAV_ITEMS.examHub,
  NAV_ITEMS.mathChecker,
  NAV_ITEMS.studyspace,
  NAV_ITEMS.workmate,
  NAV_ITEMS.projects,
  NAV_ITEMS.analytics,
  NAV_ITEMS.leaderboard,
  NAV_ITEMS.achievements,
  NAV_ITEMS.cortex,
  NAV_ITEMS.virtualLab,
  NAV_ITEMS.share,
  NAV_ITEMS.whatsapp,
  NAV_ITEMS.settings,
];

export function isRouteActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
