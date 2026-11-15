import { redirect } from "next/navigation";
import { getTeacherWorkspace } from "@/lib/exam/curated/reviewAccess";
import { EducatorRequestInbox } from "@/components/educators/EducatorRequestInbox";

export const dynamic = "force-dynamic";
export default async function TeacherRequestsPage(){
  const workspace=await getTeacherWorkspace();
  if(!workspace?.canAuthorTutorials) redirect("/");
  return <EducatorRequestInbox/>;
}
