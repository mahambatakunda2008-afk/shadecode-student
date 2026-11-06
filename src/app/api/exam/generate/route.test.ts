import { beforeEach, describe, expect, it, vi } from "vitest";

const generateExam = vi.fn();

vi.mock("@/lib/rate-limit/limiter", () => ({ applyRateLimit: async () => null, aiEndpointLimiter: {} }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({}) }));
vi.mock("@/lib/supabase/auth-helpers", () => ({ getVerifiedUser: async () => ({ user: { id: "11111111-1111-4111-8111-111111111111" } }) }));
vi.mock("@/lib/cortex/examGenerator", () => ({ generateExam: (...args: unknown[]) => generateExam(...args) }));
vi.mock("@/lib/subjects/resolveLearnerSubjects", () => ({
  resolveLearnerSubjects: async () => ({ subjects: ["Biology", "Physics", "Geography", "Mathematics"].map((name) => ({ name })) }),
  assertRequestedLearnerSubject: (subjects: { name: string }[], requested: string) => subjects.find((s) => s.name.toLowerCase() === requested.toLowerCase()) ?? null,
}));

import { POST } from "./route";

const call = async (body: Record<string, unknown>) => {
  const res = await POST(new Request("http://localhost/api/exam/generate", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } }) as never);
  return { status: res.status, json: await res.json() };
};

beforeEach(() => {
  generateExam.mockReset();
});

describe("POST /api/exam/generate (no-AI-first)", () => {
  it("serves a Biology paper from the curated bank without calling AI", async () => {
    generateExam.mockImplementation(async () => { throw new Error("AI must not be used"); });
    const { status, json } = await call({ subject: "Biology", topic: "Enzymes (A-Level standard)", difficulty: "medium", questionCount: 10 });
    expect(status).toBe(200);
    expect(generateExam).not.toHaveBeenCalled();
    expect(json.metadata.source).toBe("deterministic-fallback");
    expect(json.questions).toHaveLength(10);
    for (const q of json.questions) expect(q.options).toContain(q.modelAnswer);
  });

  it("serves a broad Biology request across topics", async () => {
    const { status, json } = await call({ subject: "Biology", topic: "Biology (A-Level standard)", difficulty: "medium", questionCount: 20 });
    expect(status).toBe(200);
    expect(generateExam).not.toHaveBeenCalled();
    expect(new Set(json.questions.map((q: { topic: string }) => q.topic)).size).toBe(8);
  });

  it("treats a blank topic (sent as the subject name) as the whole syllabus for every built-in subject", async () => {
    generateExam.mockImplementation(async () => { throw new Error("AI must not be used"); });
    for (const subject of ["Biology", "Physics", "Mathematics"]) {
      const { status, json } = await call({ subject, topic: `${subject} (A-Level)`, difficulty: "medium", questionCount: 10 });
      expect(status, subject).toBe(200);
      expect(json.questions, subject).toHaveLength(10);
    }
    expect(generateExam).not.toHaveBeenCalled();
  });

  it("gives an O-Level (Forms 1-4) Maths request Form 1-4 questions and never calculus", async () => {
    generateExam.mockImplementation(async () => { throw new Error("AI must not be used"); });
    const aLevelTopics = ["Differentiation", "Integration", "Binomial expansion and counting", "Logarithms and exponentials", "Sequences and series"];
    for (let attempt = 0; attempt < 15; attempt++) {
      const { status, json } = await call({ subject: "Mathematics", topic: "Mathematics (O-Level)", difficulty: "easy", questionCount: 20 });
      expect(status).toBe(200);
      expect(json.questions).toHaveLength(20);
      for (const q of json.questions) expect(aLevelTopics).not.toContain(q.topic);
    }
    expect(generateExam).not.toHaveBeenCalled();
  });

  it("gives an A-Level Maths request A-Level questions and no Form 1 arithmetic", async () => {
    const juniorTopics = ["Percentages", "Ratio and proportion", "Fractions", "Angles and polygons", "Probability", "Volume", "Pythagoras theorem"];
    for (let attempt = 0; attempt < 15; attempt++) {
      const { json } = await call({ subject: "Mathematics", topic: "Mathematics (A-Level)", difficulty: "medium", questionCount: 20 });
      for (const q of json.questions) expect(juniorTopics).not.toContain(q.topic);
    }
  });

  it("serves an engine-covered Physics topic without calling AI", async () => {
    const { status, json } = await call({ subject: "Physics", topic: "Kinematics", difficulty: "medium", questionCount: 10 });
    expect(status).toBe(200);
    expect(generateExam).not.toHaveBeenCalled();
    expect(json.questions).toHaveLength(10);
  });

  it("serves O-Level Geography from the built-in bank with no AI", async () => {
    generateExam.mockImplementation(async () => { throw new Error("AI must not be used"); });
    for (const topic of ["Geography (O-Level)", "Rivers (O-Level)", "Weather and climate"]) {
      const { status, json } = await call({ subject: "Geography", topic, difficulty: "easy", questionCount: 10 });
      expect(status, topic).toBe(200);
      expect(json.questions.length, topic).toBeGreaterThanOrEqual(8);
      for (const q of json.questions) expect(q.options).toContain(q.modelAnswer);
    }
    expect(generateExam).not.toHaveBeenCalled();
  });

  it("does not serve O-Level Geography to an A-Level learner: AI is tried, and failure is honest", async () => {
    generateExam.mockImplementation(async () => { throw new Error("providers down"); });
    const { status, json } = await call({ subject: "Geography", topic: "Geography (A-Level)", difficulty: "medium", questionCount: 10 });
    expect(generateExam).toHaveBeenCalledTimes(1);
    expect(status).toBe(503);
    expect(json.code).toBe("GENERATION_UNAVAILABLE");
  });

  it("still tries AI for a topic with no built-in coverage, and is honest when it fails", async () => {
    generateExam.mockImplementation(async () => { throw new Error("providers down"); });
    const { status, json } = await call({ subject: "Geography", topic: "Rivers", difficulty: "medium", questionCount: 10 });
    expect(generateExam).toHaveBeenCalledTimes(1);
    expect(status).toBe(503);
    expect(json.code).toBe("GENERATION_UNAVAILABLE");
  });

  it("returns the live AI paper for an uncovered topic when AI works", async () => {
    generateExam.mockResolvedValue({ title: "Geo", questions: [{ id: 1, type: "short_answer", question: "Define erosion.", marks: 2, topic: "Rivers", difficulty: "medium" }], totalMarks: 2, durationMinutes: 5 });
    const { status, json } = await call({ subject: "Geography", topic: "Rivers", difficulty: "medium", questionCount: 1 });
    expect(status).toBe(200);
    expect(json.metadata.source).toBe("cortex");
  });

  it("refuses to return an underfilled AI paper as complete", async () => {
    generateExam.mockResolvedValue({ title: "Geo", questions: [{ id: 1, type: "short_answer", question: "Define erosion.", marks: 2, topic: "Rivers", difficulty: "medium" }], totalMarks: 2, durationMinutes: 5 });
    const { status, json } = await call({ subject: "Geography", topic: "Rivers", difficulty: "medium", questionCount: 5 });
    expect(status).toBe(503);
    expect(json.code).toBe("INSUFFICIENT_QUESTION_COVERAGE");
  });

  it("refuses to silently truncate deterministic papers above engine capacity", async () => {
    generateExam.mockImplementation(async () => { throw new Error("AI must not be used"); });
    const { status, json } = await call({ subject: "Physics", topic: "Kinematics", difficulty: "medium", questionCount: 50 });
    expect(status).toBe(503);
    expect(json.code).toBe("INSUFFICIENT_QUESTION_COVERAGE");
    expect(generateExam).not.toHaveBeenCalled();
  });

  it("identifies deterministic-engine provenance separately from curated banks", async () => {
    const { status, json } = await call({ subject: "Physics", topic: "Kinematics", difficulty: "medium", questionCount: 10 });
    expect(status).toBe(200);
    expect(json.metadata.source).toBe("deterministic-engine");
  });
});
