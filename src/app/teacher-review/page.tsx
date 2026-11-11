import { redirect } from "next/navigation";

// Old address kept so existing bookmarks and links keep working.
export default function LegacyTeacherReviewRedirect() {
  redirect("/teacher/review");
}
