import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = readFileSync("src/app/api/learn/paper/[sessionId]/attempt/route.ts", "utf8");
const client = readFileSync("src/app/(app)/learn/paper/[sessionId]/PaperLearningSession.tsx", "utf8");

describe("paper-learning evidence recovery", () => {
  it("projects each checkpoint topic through the canonical idempotency ledger", () => {
    expect(route).toContain('rpc("project_canonical_learning_observation"');
    expect(route).toContain('`paper-learning:${clientActionId}:${topic}`');
    expect(route).not.toContain('from("topic_mastery").upsert');
  });

  it("replays a saved attempt through the evidence projection before returning success", () => {
    const replay = route.indexOf("if (existingAction)");
    const replayProjection = route.indexOf("recordLearningSignal(auth, plan, block, savedVerdict");
    const replayResponse = route.indexOf("replayed: true", replay);
    expect(replay).toBeGreaterThanOrEqual(0);
    expect(replayProjection).toBeGreaterThan(replay);
    expect(replayResponse).toBeGreaterThan(replayProjection);
    expect(route).toContain("learningEvidencePending: true");
  });

  it("keeps a submission id only while a request is unresolved", () => {
    expect(client).toContain("if (actionId && !submitActionId) setSubmitActionId(actionId)");
    expect(client).toContain("setSubmitActionId(null)");
  });
});
