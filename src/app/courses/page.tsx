import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { CoursesWorkspace } from "@/components/academic/CoursesWorkspace";

export default async function CoursesPage() {
  const jar = await cookies();
  if (jar.get("onboarding_complete")?.value !== "1") redirect("/onboarding");
  return <CoursesWorkspace />;
}
