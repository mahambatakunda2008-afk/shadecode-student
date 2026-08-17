import { redirect } from "next/navigation";

export default function CortexVerifyPage() {
  redirect("/math-checker?tool=verify");
}
