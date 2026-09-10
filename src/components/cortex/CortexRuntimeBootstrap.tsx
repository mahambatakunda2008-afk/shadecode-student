"use client";

import { useEffect } from "react";
import { registerLocalWebCortexRuntime } from "@/lib/cortex/runtime/registerLocalWebRuntime";
import { lessonCompletedEvent } from "@/lib/intelligence/emitLearningEvent";
import CortexDeviceSetup from "@/components/cortex/CortexDeviceSetup";

let completionObserverInstalled = false;

function installLessonCompletionObserver() {
  if (typeof window === "undefined" || completionObserverInstalled) return;
  completionObserverInstalled = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await originalFetch(input, init);

    try {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
      if (method !== "PATCH" || !url.includes("/api/learn")) return response;

      const body = init?.body;
      if (typeof body !== "string") return response;
      const payload = JSON.parse(body) as { lessonId?: unknown; progress?: unknown };
      if (typeof payload.lessonId !== "string" || payload.progress !== 100 || !response.ok) return response;

      const lessonResponse = await originalFetch(`/api/learn?lessonId=${encodeURIComponent(payload.lessonId)}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!lessonResponse.ok) return response;

      const data = await lessonResponse.json().catch(() => null) as {
        lesson?: { id?: string; subject?: string; topic?: string };
      } | null;
      const lesson = data?.lesson;
      if (lesson?.id && lesson.subject && lesson.topic) {
        void lessonCompletedEvent(lesson.id, lesson.subject, lesson.topic);
      }
    } catch {
      // Learning telemetry must never break the lesson progress request.
    }

    return response;
  };
}

export default function CortexRuntimeBootstrap() {
  useEffect(() => {
    registerLocalWebCortexRuntime();
    installLessonCompletionObserver();
  }, []);

  return <CortexDeviceSetup />;
}
