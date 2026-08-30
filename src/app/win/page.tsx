"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { markFirstSessionComplete } from "@/lib/session";

export default function WinPage() {
  const router = useRouter();

  useEffect(() => {
    markFirstSessionComplete();
  }, []);

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-[var(--background)] text-white px-6 text-center">
      <div className="text-4xl mb-4">🎉</div>

      <h1 className="text-2xl font-semibold mb-2">
        First Win Unlocked
      </h1>

      <p className="text-gray-400 max-w-md mb-6">
        You just completed your first study session. This is your first step toward consistent learning momentum.
      </p>

      <button
        onClick={() => router.replace("/")}
        className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition"
      >
        Continue
      </button>
    </div>
  );
}
