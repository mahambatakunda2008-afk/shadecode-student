import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export const metadata = {
  title: "Get Started — Shadecode Student",
  description: "Set up your personalised learning path.",
};

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  // If already onboarded, skip to dashboard
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("onboarding_completed")
    .eq("user_id", user.id)
    .single();

  if (profile?.onboarding_completed) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <OnboardingFlow />
    </main>
  );
}
