"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function LearnPromptBridge() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  useEffect(() => {
    const prompt = params.get("prompt")?.trim();
    const topic = params.get("topic")?.trim();
    if (!prompt || topic) return;

    const next = new URLSearchParams(params.toString());
    next.set("topic", prompt);
    next.delete("prompt");
    router.replace(`${pathname}?${next.toString()}`);
  }, [params, pathname, router]);

  return null;
}
