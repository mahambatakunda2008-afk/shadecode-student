import { CoursesWorkspace } from "@/components/academic/CoursesWorkspace";

/**
 * Authentication and onboarding are enforced centrally by middleware.
 * Do not read the client-writable onboarding cookie here.
 */
export default function CoursesPage() {
  return <CoursesWorkspace />;
}
