import { getReviewer } from "@/lib/exam/curated/reviewAccess";
import { redirect } from "next/navigation";
import { TutorialReviewClient } from "./TutorialReviewClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tutorial review · Shadecode Student" };

export default async function TutorialReviewPage() {
  const reviewer = await getReviewer();
  if (!reviewer) redirect("/");
  return <TutorialReviewClient isAdmin={reviewer.isAdmin} />;
}
