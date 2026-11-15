import { redirect } from "next/navigation";
import { getReviewer } from "@/lib/exam/curated/reviewAccess";
import { TutorialsClient } from "./TutorialsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tutorial studio · Shadecode Student" };

export default async function TeacherTutorialsPage() {
  const reviewer = await getReviewer();
  if (!reviewer) redirect("/teacher");
  return <TutorialsClient />;
}
