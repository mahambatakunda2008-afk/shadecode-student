import { beforeEach, describe, expect, it, vi } from "vitest";

let currentUser: { id: string } | null = { id: "u1" };
let adminRows: Array<Record<string, unknown>> | null = null;
let resolution: unknown;
const resolver = vi.fn();

vi.mock("@/lib/rate-limit/limiter", () => ({ applyRateLimit: async () => null, generalApiLimiter: {} }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: currentUser } }) } }) }));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => adminRows === null ? null : ({ from: () => ({ select: () => ({ eq: () => ({ in: () => ({ limit: async () => ({ data: adminRows, error: null }) }) }) }) }) }),
}));
vi.mock("@/lib/curriculum/ai-grounding", () => ({ resolveVerifiedCurriculumPromptContext: (...args: unknown[]) => { resolver(...args); return Promise.resolve(resolution); } }));

import { GET } from "./route";

const get = (q: string) => GET(new Request(`http://localhost/api/library/guide?${q}`) as never);
const row = (kind: string, code: string, topic_key: string, content: string, title = "") => ({ kind, knowledge_key: code, topic_key, content, title });
const ROWS = [
  row("content_scope", "scope|7.1", "7.1", "", "Progressive waves"), row("content_scope", "scope|7.2", "7.2", "", "Transverse and longitudinal waves"), row("content_scope", "scope|7.3", "7.3", "", "Doppler effect"),
  ...[1, 2, 3, 4, 5].map((n) => row("learning_outcome", `outcome|7.1|${n}`, "7.1", `Describe wave idea number ${n} in detail.`)),
  ...[1, 2, 3].map((n) => row("learning_outcome", `outcome|7.2|${n}`, "7.2", `State wave fact number ${n} clearly.`)),
  ...[1, 2].map((n) => row("learning_outcome", `outcome|7.3|${n}`, "7.3", `Explain Doppler point number ${n} carefully.`)),
];
const resolved = (knowledge: unknown[]) => ({ status: "resolved", resolvedTopic: "Waves", pack: { curriculumId: "cv1", subject: "AS Level Physics", knowledge } });

beforeEach(() => { currentUser = { id: "u1" }; adminRows = ROWS; resolver.mockReset(); resolution = resolved([{ kind: "learning_outcome", code: "outcome|7.1|1", title: "t", content: "c", topicCode: "7.1" }]); });

describe("GET /api/library/guide", () => {
  it("requires a topic", async () => { expect((await get("subject=Physics&topic=a")).status).toBe(400); });
  it("requires a signed-in learner", async () => { currentUser = null; expect((await get("subject=Physics&topic=Waves")).status).toBe(401); });
  it("404s when the learner has no verified syllabus for the topic", async () => {
    resolution = { status: "none", reason: "no curriculum" };
    expect((await get("subject=Physics&topic=Waves")).status).toBe(404);
  });
  it("404s when the topic did not match a syllabus subsection", async () => {
    resolution = resolved([]);
    expect((await get("subject=Physics&topic=Waves")).status).toBe(404);
  });
  it("builds a guide from the learner's own syllabus and uses the generator's prompt shape", async () => {
    const res = await get("subject=Physics&topic=Waves");
    expect(res.status).toBe(200);
    const { lesson } = await res.json();
    expect(lesson.title).toBe("Syllabus guide: Waves");
    expect(lesson.blocks.length).toBeGreaterThanOrEqual(10);
    expect(lesson.blocks[0].content).toMatch(/AI lesson generation is unavailable/);
    expect(resolver).toHaveBeenCalledWith("u1", 'Physics\nmaster this request: "Waves"');
  });
  it("404s rather than padding when the syllabus is too thin", async () => {
    adminRows = [row("content_scope", "scope|7.1", "7.1", "", "Only"), row("learning_outcome", "outcome|7.1|1", "7.1", "Describe one thing.")];
    expect((await get("subject=Physics&topic=Waves")).status).toBe(404);
  });
  it("still works from the resolved topic items if the admin client is unavailable (and 404s if that is too thin)", async () => {
    adminRows = null;
    expect((await get("subject=Physics&topic=Waves")).status).toBe(404);
  });
});
