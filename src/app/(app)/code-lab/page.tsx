import { redirect } from "next/navigation";

/** Legacy route. Comp Lab is now the canonical student-facing computing environment. */
export default function CodeLabPage() {
  redirect("/comp-lab");
}
