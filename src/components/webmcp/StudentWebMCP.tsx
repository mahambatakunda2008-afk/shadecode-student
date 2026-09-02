"use client";

import { useEffect } from "react";
import {
  buildStudyCapabilities,
  createStudyPlan,
  finishStudySession,
  setStudyGoal,
  startStudySession,
} from "@/lib/capabilities/study";

type Tool = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean };
  execute: (input: Record<string, unknown>, context?: { signal?: AbortSignal }) => Promise<unknown> | unknown;
};

type ModelContext = {
  registerTool: (tool: Tool) => Promise<void> | void;
};

type WebMCPDocument = Document & { modelContext?: ModelContext };
type WebMCPWindow = Window & {
  __shadecodeWebMCPRegistered?: boolean;
  __shadecodeWebMCPRegistering?: boolean;
  __shadecodeWebMCPToolCount?: number;
};

/**
 * WebMCP is a progressive enhancement. The learning app never depends on it.
 * Agents get workflow-level capabilities that share the same local-first action
 * layer as the rest of the product instead of a second, MCP-only state store.
 */
export default function StudentWebMCP() {
  useEffect(() => {
    const doc = document as WebMCPDocument;
    const modelContext = doc.modelContext;
    if (!modelContext) return;

    const win = window as WebMCPWindow;
    if (win.__shadecodeWebMCPRegistered || win.__shadecodeWebMCPRegistering) return;
    win.__shadecodeWebMCPRegistering = true;

    const capabilities = buildStudyCapabilities();
    const safe = (action: () => unknown) => {
      try {
        return Promise.resolve(action());
      } catch (error) {
        return Promise.reject(error instanceof Error ? error : new Error("Study action failed"));
      }
    };

    const tools: Tool[] = [
      {
        name: "get_student_study_state",
        title: "Get student study state",
        description:
          "Read the student's current local-first study context before recommending an action. Returns goals, available time, plan, active session and latest completion.",
        inputSchema: { type: "object", properties: {} },
        annotations: { readOnlyHint: true },
        execute: async () => safe(() => ({
          source: "Shadecode Student local-first capability layer",
          online: navigator.onLine,
          state: capabilities.get_student_study_state(),
        })),
      },
      {
        name: "set_study_goal",
        title: "Set study goal",
        description: "Set the student's immediate study outcome, subject and available time. The change is persisted locally.",
        inputSchema: {
          type: "object",
          properties: {
            goal: { type: "string", description: "Concrete study outcome." },
            subject: { type: "string", description: "Subject, if known." },
            minutes: { type: "number", minimum: 1, maximum: 1440, description: "Available study minutes." },
          },
          required: ["goal"],
        },
        execute: async (input) => safe(() => setStudyGoal({
          goal: String(input.goal ?? ""),
          subject: input.subject ? String(input.subject) : undefined,
          minutes: typeof input.minutes === "number" ? input.minutes : undefined,
        })),
      },
      {
        name: "create_study_plan",
        title: "Create a study plan",
        description: "Create and save an ordered, executable revision plan for a subject and topic.",
        inputSchema: {
          type: "object",
          properties: {
            subject: { type: "string" },
            topic: { type: "string" },
            steps: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 20 },
            minutes: { type: "number", minimum: 1, maximum: 1440 },
          },
          required: ["subject", "topic", "steps"],
        },
        execute: async (input) => safe(() => createStudyPlan({
          subject: String(input.subject ?? ""),
          topic: String(input.topic ?? ""),
          steps: Array.isArray(input.steps) ? input.steps.map(String) : [],
          minutes: typeof input.minutes === "number" ? input.minutes : undefined,
        })),
      },
      {
        name: "start_study_session",
        title: "Start a study session",
        description: "Start a focused local study session. The tool records the session, then opens the matching Shadecode learning workspace.",
        inputSchema: {
          type: "object",
          properties: {
            subject: { type: "string" },
            topic: { type: "string" },
            minutes: { type: "number", minimum: 1, maximum: 1440 },
          },
          required: ["subject", "topic"],
        },
        execute: async (input) => safe(() => {
          const subject = String(input.subject ?? "");
          const topic = String(input.topic ?? "");
          const state = startStudySession({
            subject,
            topic,
            minutes: typeof input.minutes === "number" ? input.minutes : undefined,
          });
          window.location.assign(`/learn?subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(topic)}`);
          return state;
        }),
      },
      {
        name: "open_exam_hub",
        title: "Open Exam Hub",
        description: "Open the exam workspace with optional subject and topic context so the student can practise and review.",
        inputSchema: {
          type: "object",
          properties: { subject: { type: "string" }, topic: { type: "string" } },
        },
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
        inputSchema: {
          type: "object",
          properties: {
            outcome: { type: "string" },
            mastery: { type: "number", minimum: 0, maximum: 100 },
          },
        },
        execute: async (input) => safe(() => finishStudySession({
          outcome: input.outcome ? String(input.outcome) : undefined,
          mastery: typeof input.mastery === "number" ? input.mastery : undefined,
        })),
      },
    ];

    // Register independently so one malformed/unsupported tool cannot prevent
    // the remaining workflow from becoming available to an agent. Only mark the
    // adapter ready after at least one registration succeeds, allowing a retry
    // when a browser exposes modelContext late or temporarily rejects a tool.
    void Promise.allSettled(
      tools.map((tool) => Promise.resolve().then(() => modelContext.registerTool(tool))),
    ).then((results) => {
      const registered = results.filter((result) => result.status === "fulfilled").length;
      win.__shadecodeWebMCPToolCount = registered;
      win.__shadecodeWebMCPRegistered = registered > 0;
      win.__shadecodeWebMCPRegistering = false;
    });

    return () => {
      // Current WebMCP registration has no portable unregister contract.
      // Keep the page-lifetime registration alive instead of inventing cleanup semantics.
    };
  }, []);

  return null;
}
