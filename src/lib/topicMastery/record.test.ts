import { describe, expect, it } from "vitest";
import { recordKeyedMastery, type MasteryClient } from "./record";

function fakeClient(existing: Record<string, unknown> | null = null) {
  const writes: Array<{ table: string; values: Record<string, unknown>; onConflict: string }> = [];
  const client = {
    from(table: string) {
      const chain = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({ data: table === "topic_mastery" ? existing : null }),
        upsert: async (values: Record<string, unknown>, options: { onConflict: string }) => {
          writes.push({ table, values, onConflict: options.onConflict });
          return { error: null };
        },
      };
      return chain;
    },
  } as unknown as MasteryClient;
  return { client, writes };
}

describe("recordKeyedMastery", () => {
  it("writes one row with the exact curriculum key and 0-100 scores", async () => {
    const { client, writes } = fakeClient();
    const { mastery } = await recordKeyedMastery(client, "user-1", { subject: "Physics", topic: "Kinematics", syllabusId: "cambridge-9702", topicKey: "2.1", verdict: "correct" });
    const row = writes.find((write) => write.table === "topic_mastery")!;
    expect(row.onConflict).toBe("user_id,subject,topic");
    expect(row.values).toMatchObject({ user_id: "user-1", subject: "Physics", topic: "Kinematics", syllabus_id: "cambridge-9702", curriculum_topic_key: "2.1", attempts: 1 });
    expect(mastery).toBe(100);
    expect(writes.filter((write) => write.table === "revision_queue")).toHaveLength(0);
  });

  it("softer evidence moves mastery less than an exam and queues weak topics", async () => {
    const { client, writes } = fakeClient({ mastery_score: 80, attempts: 4 });
    const { mastery } = await recordKeyedMastery(client, "user-1", { subject: "Physics", topic: "Kinematics", syllabusId: "cambridge-9702", topicKey: "2.1", verdict: "incorrect", evidence: 15, queueSource: "syllabus_selfcheck" });
    expect(mastery).toBeGreaterThan(40); // 15 as evidence, not 0
    expect(mastery).toBeLessThan(80);
    const queued = writes.find((write) => write.table === "revision_queue")!;
    expect(queued.values).toMatchObject({ source: "syllabus_selfcheck", topic: "Kinematics", subject: "Physics" });
    expect(queued.onConflict).toBe("user_id,topic,subject");
  });

  it("does not queue a correct result even when a queue source is given", async () => {
    const { client, writes } = fakeClient();
    await recordKeyedMastery(client, "u", { subject: "Chemistry", topic: "Atoms", syllabusId: "cambridge-9701", topicKey: "1.1", verdict: "correct", queueSource: "paper_learning" });
    expect(writes.some((write) => write.table === "revision_queue")).toBe(false);
  });
});
