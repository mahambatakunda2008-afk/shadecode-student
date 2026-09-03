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

/** WebMCP is progressive enhancement. Shadecode remains fully usable without it. */
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
        description: "Read the authoritative local-first study context before deciding what to do. Returns goal, time budget, plan, active session, completion and a recommended next action.",
        inputSchema: { type: "object", properties: {} },
        annotations: { readOnlyHint: true },
        execute: async () => safe(() => ({ source: "Shadecode Student local-first capability layer", online: navigator.onLine, state: study.get_student_study_state() })),
      },
      {
        name: "set_study_goal",
        title: "Set study goal",
        description: "Persist a concrete study outcome and optional subject/time budget. Use this before planning when the agent has a new goal. Returns updated state plus guidance.",
        inputSchema: { type: "object", properties: { goal: { type: "string", description: "Concrete outcome the student wants by the end of the session." }, subject: { type: "string", description: "Subject, if known." }, minutes: { type: "number", minimum: 1, maximum: 1440, description: "Minutes available for this study block." } }, required: ["goal"] },
        execute: async (input) => safe(() => study.set_study_goal({ goal: String(input.goal ?? ""), subject: input.subject ? String(input.subject) : undefined, minutes: typeof input.minutes === "number" ? input.minutes : undefined })),
      },
      {
        name: "create_study_plan",
        title: "Create an executable study plan",
        description: "Build and persist a time-budgeted revision workflow. If steps are omitted, Shadecode generates a deterministic diagnose → learn → practise → correct → retrieve sequence and allocates the available minutes. Returns success criteria and next action.",
        inputSchema: { type: "object", properties: { subject: { type: "string", description: "Subject to study." }, topic: { type: "string", description: "Specific topic or skill." }, steps: { type: "array", items: { type: "string" }, maxItems: 8, description: "Optional agent-authored steps. Omit to let Shadecode generate the workflow." }, minutes: { type: "number", minimum: 1, maximum: 1440, description: "Total time available." }, goal: { type: "string", description: "Optional concrete outcome." } }, required: ["subject", "topic"] },
        execute: async (input) => safe(() => study.create_study_plan({ subject: String(input.subject ?? ""), topic: String(input.topic ?? ""), steps: Array.isArray(input.steps) ? input.steps.map(String) : undefined, minutes: typeof input.minutes === "number" ? input.minutes : undefined, goal: input.goal ? String(input.goal) : undefined })),
      },
      {
        name: "start_study_session",
        title: "Start a study session",
        description: "Start a focused local session and open the matching learning workspace. Subject/topic/time can come from the saved plan, so the agent can execute the plan without reconstructing UI state.",
        inputSchema: { type: "object", properties: { subject: { type: "string" }, topic: { type: "string" }, minutes: { type: "number", minimum: 1, maximum: 1440 } } },
        execute: async (input) => safe(() => {
          const state = study.start_study_session({ subject: input.subject ? String(input.subject) : undefined, topic: input.topic ? String(input.topic) : undefined, minutes: typeof input.minutes === "number" ? input.minutes : undefined });
          const session = state.activeSession;
          if (session) window.location.assign(`/learn?subject=${encodeURIComponent(session.subject)}&topic=${encodeURIComponent(session.topic)}`);
          return state;
        }),
      },
      {
        name: "open_exam_hub",
        title: "Open Exam Hub",
        description: "Open exam practice using the current saved plan when subject/topic are omitted. Use this after learning to move the workflow into retrieval and exam practice.",
        inputSchema: { type: "object", properties: { subject: { type: "string" }, topic: { type: "string" } } },
        execute: async (input) => safe(() => {
          const current = study.get_student_study_state();
          const subject = input.subject ? String(input.subject) : current.plan?.subject ?? current.subject;
          const topic = input.topic ? String(input.topic) : current.plan?.topic;
          const params = new URLSearchParams();
          if (subject) params.set("subject", subject);
          if (topic) params.set("topic", topic);
          const url = `/exam-hub${params.toString() ? `?${params.toString()}` : ""}`;
          window.location.assign(url);
          return { opened: url, subject, topic, nextAction: "Complete exam practice, then finish the study session with an outcome and mastery score." };
        }),
      },
      {
        name: "finish_study_session",
        title: "Finish and adapt the study session",
        description: "Close the active session and persist outcome/mastery. Shadecode returns an adaptive recommendation: remediation below 60, targeted practice at 60–79, or exam-style retrieval at 80+.",
        inputSchema: { type: "object", properties: { outcome: { type: "string", description: "What happened in the session." }, mastery: { type: "number", minimum: 0, maximum: 100, description: "Self-assessed or assessed mastery percentage." } } },
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
    return () => { stopped = true; window.clearInterval(timer); };
  }, []);

  return null;
}
