"use client";

import { useRouter } from "next/navigation";
import { setOnboardingComplete } from "@/lib/onboarding";

export default function OnboardingPage() {
  const router = useRouter();

  const startFirstSession = () => {
    setOnboardingComplete();
    router.replace("/dashboard");
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#0a0a10] text-white px-6">
      <h1 className="text-2xl font-semibold mb-2">
        Welcome to Shadecode
      </h1>

      <p className="text-gray-400 text-center mb-8 max-w-md">
        Let’s get you started with your first study session. This takes less than 30 seconds.
      </p>

      <button
        onClick={startFirstSession}
        className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition"
      >
        Start your first session
      </button>
    </div>
  );
}
