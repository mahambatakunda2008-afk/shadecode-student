import { redirect } from "next/navigation";

// There is no standalone subjects-management screen — subjects are already
// listed and managed inline on /learn. This route exists solely to stop
// `/learn/subjects` from falling through to the [lessonId] dynamic route,
// which was sending the literal string "subjects" to /api/learn?lessonId=subjects
// and crashing the lesson loader with a Postgres UUID cast error (22P02).
export default function LearnSubjectsRedirect() {
  redirect("/learn");
}
