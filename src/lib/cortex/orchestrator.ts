export type CortexAgentId = "orchestrator" | "researcher" | "builder" | "verifier" | "tutor";

export type CortexCapability =
  | "plan"
  | "research"
  | "build"
  | "verify"
  | "teach"
  | "read_state";

export type CortexPermission = {
  capabilities: CortexCapability[];
  maxSteps?: number;
};

export type CortexTask = {
  id: string;
  input: string;
  context?: Record<string, unknown>;
  requestedCapabilities?: CortexCapability[];
};

export type CortexPlanStep = {
  id: string;
  agent: Exclude<CortexAgentId, "orchestrator">;
  capability: Exclude<CortexCapability, "plan" | "read_state">;
  purpose: string;
};

export type CortexPlan = {
  taskId: string;
  steps: CortexPlanStep[];
  successCriteria: string[];
};

export type CortexAgentResult = {
  agent: Exclude<CortexAgentId, "orchestrator">;
  ok: boolean;
  output: unknown;
  evidence?: string[];
};

export type CortexExecution = {
  plan: CortexPlan;
  results: CortexAgentResult[];
  verified: boolean;
  finalOutput: unknown;
};

export type CortexAgentHandler = (args: {
  task: CortexTask;
  step: CortexPlanStep;
  previous: CortexAgentResult[];
}) => Promise<CortexAgentResult> | CortexAgentResult;

const DEFAULT_PERMISSIONS: Record<Exclude<CortexAgentId, "orchestrator">, CortexPermission> = {
  researcher: { capabilities: ["research"], maxSteps: 3 },
  builder: { capabilities: ["build"], maxSteps: 3 },
  verifier: { capabilities: ["verify"], maxSteps: 3 },
  tutor: { capabilities: ["teach"], maxSteps: 3 },
};

function includesAny(input: string, terms: string[]): boolean {
  return terms.some((term) => input.includes(term));
}

/**
 * Keep planning deterministic and provider-neutral. A model can author a richer
 * plan later, but every interface gets the same safe baseline today.
 */
export function createCortexPlan(task: CortexTask): CortexPlan {
  const input = task.input.trim();
  if (!input) throw new Error("Cortex task input is required");

  const requested = new Set(task.requestedCapabilities ?? []);
  const steps: CortexPlanStep[] = [];
  const add = (agent: CortexPlanStep["agent"], capability: CortexPlanStep["capability"], purpose: string) => {
    if (!steps.some((step) => step.agent === agent && step.capability === capability)) {
      steps.push({ id: `step-${steps.length + 1}`, agent, capability, purpose });
    }
  };

  if (requested.has("research") || includesAny(input.toLowerCase(), ["research", "find", "compare", "source"])) {
    add("researcher", "research", "Gather the information needed to answer the task.");
  }
  if (requested.has("teach") || includesAny(input.toLowerCase(), ["teach", "explain", "learn", "lesson", "study"])) {
    add("tutor", "teach", "Explain or adapt the material to the learner's goal.");
  }
  if (requested.has("build") || includesAny(input.toLowerCase(), ["build", "create", "make", "code", "implement"])) {
    add("builder", "build", "Produce the requested artifact or implementation.");
  }

  const needsVerification = requested.has("verify") || steps.some((step) => step.capability === "build") || includesAny(input.toLowerCase(), ["check", "mark", "test", "verify", "correct"]);
  if (needsVerification) {
    add("verifier", "verify", "Check the result against the task's success criteria.");
  }

  if (!steps.length) {
    add("tutor", "teach", "Interpret the request and produce a useful first response.");
  }

  const maxSteps = Math.min(8, Math.max(1, task.context?.maxSteps as number || 8));
  const selected = steps.slice(0, maxSteps);
  return {
    taskId: task.id,
    steps: selected,
    successCriteria: [
      "The response addresses the user's stated goal.",
      "Each executed capability stays within its agent permission boundary.",
      "Build or verification work is not presented as successful without evidence.",
    ],
  };
}

function assertPermission(step: CortexPlanStep, permissions: Record<string, CortexPermission>) {
  const permission = permissions[step.agent] ?? DEFAULT_PERMISSIONS[step.agent];
  if (!permission.capabilities.includes(step.capability)) {
    throw new Error(`Agent ${step.agent} is not permitted to use ${step.capability}`);
  }
}

/** Execute a plan through injected handlers. This keeps Cortex testable and lets
 * WebMCP, Student, WhatsApp, voice, and future hardware provide their own tools. */
export async function executeCortexPlan(
  task: CortexTask,
  plan: CortexPlan,
  handlers: Partial<Record<Exclude<CortexAgentId, "orchestrator">, CortexAgentHandler>>,
  permissions: Partial<Record<Exclude<CortexAgentId, "orchestrator">, CortexPermission>> = {},
): Promise<CortexExecution> {
  const results: CortexAgentResult[] = [];
  for (const step of plan.steps) {
    assertPermission(step, { ...DEFAULT_PERMISSIONS, ...permissions });
    const handler = handlers[step.agent];
    if (!handler) {
      results.push({ agent: step.agent, ok: false, output: `No handler registered for ${step.agent}.` });
      continue;
    }
    const result = await handler({ task, step, previous: results });
    results.push(result);
    if (!result.ok) break;
  }

  const failed = results.find((result) => !result.ok);
  const verifierResults = results.filter((result) => result.agent === "verifier");
  const verified = !failed && verifierResults.length > 0 && verifierResults.every((result) => result.ok);
  const lastSuccessful = [...results].reverse().find((result) => result.ok);

  return {
    plan,
    results,
    verified,
    finalOutput: failed
      ? { status: "blocked", reason: failed.output, results }
      : { status: verified ? "verified" : "completed-without-verification", output: lastSuccessful?.output ?? null, results },
  };
}

export function createCortexTask(input: string, context?: Record<string, unknown>): CortexTask {
  const normalized = input.trim();
  if (!normalized) throw new Error("Cortex task input is required");
  return {
    id: `cortex-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    input: normalized,
    context,
  };
}
