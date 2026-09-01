"use client";

import { useEffect } from "react";

type Tool = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean };
  execute: (input: Record<string, unknown>) => Promise<unknown> | unknown;
};

type ModelContext = {
  registerTool: (tool: Tool, options?: { signal?: AbortSignal }) => Promise<void> | void;
};

type WebMCPDocument = Document & { modelContext?: ModelContext };

const STORAGE_KEY = "shadecode:webmcp:study-state";

function readState() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") as Record<string, unknown>;
  } catch {
    return {};
  }
}

function writeState(patch: Record<string, unknown>) {
  const next = { ...readState(), ...patch, updatedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("shadecode:webmcp-state", { detail: next }));
  return next;
}

/**
 * Progressive WebMCP enhancement for agent-native study workflows.
 * The app remains fully functional when WebMCP is unavailable.
 */
export default function StudentWebMCP() {
  useEffect(() => {
    const doc = document as WebMCPDocument;
    const modelContext = doc.modelContext;
    if (!modelContext) return;

    const tools: Tool[] = [
      {
        name: "get_student_study_state",
        title: "Get student study state",
        description:
          "Read the student's local study state, including the current goal, subject, plan, and active session. Use this before making recommendations so the agent works with the student's current context.",
        inputSchema: { type: "object", properties: {} },
        annotations: { readOnlyHint: true },
        execute: async () => ({
          source: "Shadecode Student local-first state",
          online: navigator.onLine,
          state: readState(),
        }),
      },
      {
        name: "set_study_goal",
        title: "Set study goal",
        description:
          "Set or update the student's immediate study goal. This is a local action and does not require a cloud AI service.",
        inputSchema: {
          type: "object",
          properties: {
            goal: { type: "string", description: "The concrete study outcome the student wants." },
            subject: { type: "string", description: "The subject involved, if known." },
            minutes: { type: "number", description: "Available study time in minutes, if known." },
          },
          required: ["goal"],
        },
        annotations: { readOnlyHint: false },
        execute: async (input) =>
          writeState({
            goal: String(input.goal),
            subject: input.subject ? String(input.subject) : undefined,
            availableMinutes: typeof input.minutes === "number" ? input.minutes : undefined,
          }),
      },
      {
        name: "create_study_plan",
        title: "Create a study plan",
        description:
          "Save a concrete study plan for the current student. Provide short ordered steps that can be executed in the Shadecode learning experience.",
        inputSchema: {
          type: "object",
          properties: {
            subject: { type: "string" },
            topic: { type: "string" },
            steps: { type: "array", items: { type: "string" } },
            minutes: { type: "number" },
          },
          required: ["subject", "topic", "steps"],
        },
        annotations: { readOnlyHint: false },
        execute: async (input) => {
          const steps = Array.isArray(input.steps) ? input.steps.map(String) : [];
          return writeState({
            plan: {
              subject: String(input.subject),
              topic: String(input.topic),
              steps,
              minutes: typeof input.minutes === "number" ? input.minutes : undefined,
              createdAt: new Date().toISOString(),
            },
          });
        },
      },
      {
        name: "start_study_session",
        title: "Start a study session",
        description:
          "Start a focused study session using the student's saved plan. This updates local state and opens the learning workspace.",
        inputSchema: {
          type: "object",
          properties: {
            subject: { type: "string" },
            topic: { type: "string" },
            minutes: { type: "number" },
          },
          required: ["subject", "topic"],
        },
        annotations: { readOnlyHint: false },
        execute: async (input) => {
          const session = writeState({
            activeSession: {
              subject: String(input.subject),
              topic: String(input.topic),
              minutes: typeof input.minutes === "number" ? input.minutes : 25,
              startedAt: new Date().toISOString(),
            },
          });
          window.location.assign(`/learn?subject=${encodeURIComponent(String(input.subject))}&topic=${encodeURIComponent(String(input.topic))}`);
          return session;
        },
      },
      {
        name: "open_exam_hub",
        title: "Open Exam Hub",
        description:
          "Open Shadecode Student's exam and question workspace for the student to practice, review questions, or use Cortex help.",
        inputSchema: {
          type: "object",
          properties: { subject: { type: "string" }, topic: { type: "string" } },
        },
        annotations: { readOnlyHint: false },
        execute: async (input) => {
          const params = new URLSearchParams();
          if (input.subject) params.set("subject", String(input.subject));
          if (input.topic) params.set("topic", String(input.topic));
          const url = `/exam-hub${params.toString() ? `?${params.toString()}` : ""}`;
          window.location.assign(url);
          return { opened: url };
        },
      },
      {
        name: "finish_study_session",
        title: "Finish study session",
        description:
          "Finish the active study session and record a local completion event for the student's progress history.",
        inputSchema: {
          type: "object",
          properties: {
            outcome: { type: "string", description: "What the student accomplished." },
            mastery: { type: "number", minimum: 0, maximum: 100 },
          },
        },
        annotations: { readOnlyHint: false },
        execute: async (input) => {
          const state = readState();
          const completion = {
            outcome: input.outcome ? String(input.outcome) : "Session completed",
            mastery: typeof input.mastery === "number" ? input.mastery : undefined,
            completedAt: new Date().toISOString(),
            session: state.activeSession ?? null,
          };
          return writeState({ activeSession: null, lastCompletion: completion });
        },
      },
    ];

    const controller = new AbortController();
    Promise.all(tools.map((tool) => Promise.resolve(modelContext.registerTool(tool, { signal: controller.signal })))).catch(() => undefined);

    return () => controller.abort();
  }, []);

  return null;
}
