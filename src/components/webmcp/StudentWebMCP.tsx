"use client";

import { useEffect } from "react";
import { buildCapabilityRegistry } from "@/lib/capabilities";

type Tool = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean };
  execute: (input: Record<string, unknown>, context?: { signal?: AbortSignal }) => Promise<unknown> | unknown;
};

type ModelContext = { registerTool: (tool: Tool) => Promise<void> | void };
type WebMCPDocument = Document & { modelContext?: ModelContext };
type WebMCPWindow = Window & {
  __shadecodeWebMCPRegistered?: boolean;
  __shadecodeWebMCPRegistering?: boolean;
  __shadecodeWebMCPToolCount?: number;
};

/**
 * WebMCP is progressive enhancement. Shadecode never depends on it.
 * The adapter waits for browsers that expose modelContext after hydration,
 * then registers each workflow capability independently and retries failures.
 */
export default function StudentWebMCP() {
  useEffect(() => {
    const doc = document as WebMCPDocument;
    const win = window as WebMCPWindow;
    const { study } = buildCapabilityRegistry();

    const safe = (action: () => unknown) => {
      try { return Promise.resolve(action()); }
      catch (error) { return Promise.reject(error instanceof Error ? error : new Error("Study action failed")); }
    };

    const tools: Tool[] = [
      {
        name: "get_student_study_state",
        title: "Get student study state",
        description: "Read the student's current local-first study context before recommending an action. Returns goals, available time, plan, active session and latest completion.",
        inputSchema: { type: "object", properties: {} },
        annotations: { readOnlyHint: true },
        execute: async () => safe(() => ({ source: "Shadecode Student local-first capability layer", online: navigator.onLine, state: study.get_student_study_state() })),
      },
      {
        name: "set_study_goal",
        title: "Set study goal",
        description: "Set the student's immediate study outcome, subject and available time. The change is persisted locally.",
        inputSchema: { type: "object", properties: { goal: { type: "string", description: "Concrete study outcome." }, subject: { type: "string", description: "Subject, if known." }, minutes: { type: "number", minimum: 1, maximum: 1440, description: "Available study minutes." } }, required: ["goal"] },
        execute: async (input) => safe(() => study.set_study_goal({ goal: String(input.goal ?? ""), subject: input.subject ? String(input.subject) : undefined, minutes: typeof input.minutes === "number" ? input.minutes : undefined })),
      },
      {
        name: "create_study_plan",
        title: "Create a study plan",
        description: "Create and save an ordered, executable revision plan for a subject and topic.",
        inputSchema: { type: "object", properties: { subject: { type: "string" }, topic: { type: "string" }, steps: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 20 }, minutes: { type: "number", minimum: 1, maximum: 1440 } }, required: ["subject", "topic", "steps"] },
        execute: async (input) => safe(() => study.create_study_plan({ subject: String(input.subject ?? ""), topic: String(input.topic ?? ""), steps: Array.isArray(input.steps) ? input.steps.map(String) : [], minutes: typeof input.minutes === "number" ? input.minutes : undefined })),
      },
      {
        name: "start_study_session",
        title: "Start a study session",
        description: "Start a focused local study session and open the matching Shadecode learning workspace.",
        inputSchema: { type: "object", properties: { subject: { type: "string" }, topic: { type: "string" }, minutes: { type: "number", minimum: 1, maximum: 1440 } }, required: ["subject", "topic"] },
        execute: async (input) => safe(() => {
          const subject = String(input.subject ?? "");
          const topic = String(input.topic ?? "");
          const state = study.start_study_session({ subject, topic, minutes: typeof input.minutes === "number" ? input.minutes : undefined });
          window.location.assign(`/learn?subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(topic)}`);
          return state;
        }),
      },
      {
        name: "open_exam_hub",
        title: "Open Exam Hub",
        description: "Open the exam workspace with optional subject and topic context so the student can practise and review.",
        inputSchema: { type: "object", properties: { subject: { type: "string" }, topic: { type: "string" } } },
        execute: async (input) => safe(() => {
          const params = new URLSearchParams();
          if (input.subject) params.set("subject", String(input.subject));
          if (input.topic) params.set("topic", String(input.topic));
          const url = `/exam-hub${params.toString() ? `?${params.toString()}` : ""}`;
          window.location.assign(url);
          return { opened: url };
        }),
      },
      {
        name: "finish_study_session",
        title: "Finish study session",
        description: "Finish the active session and persist the outcome and optional mastery score locally for future adaptation.",
        inputSchema: { type: "object", properties: { outcome: { type: "string" }, mastery: { type: "number", minimum: 0, maximum: 100 } } },
        execute: async (input) => safe(() => study.finish_study_session({ outcome: input.outcome ? String(input.outcome) : undefined, mastery: typeof input.mastery === "number" ? input.mastery : undefined })),
      },
    ];

    let stopped = false;
    let attempts = 0;
    const maxAttempts = 120;

    const register = async () => {
      if (stopped || win.__shadecodeWebMCPRegistered || win.__shadecodeWebMCPRegistering) return;
      const modelContext = doc.modelContext;
      if (!modelContext) return;
      win.__shadecodeWebMCPRegistering = true;
      const results = await Promise.allSettled(tools.map((tool) => Promise.resolve().then(() => modelContext.registerTool(tool))));
      if (stopped) return;
      const registered = results.filter((result) => result.status === "fulfilled").length;
      win.__shadecodeWebMCPToolCount = registered;
      win.__shadecodeWebMCPRegistered = registered === tools.length;
      win.__shadecodeWebMCPRegistering = false;
    };

    const timer = window.setInterval(() => {
      attempts += 1;
      void register();
      if (win.__shadecodeWebMCPRegistered || attempts >= maxAttempts) window.clearInterval(timer);
    }, 250);

    void register();

    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
