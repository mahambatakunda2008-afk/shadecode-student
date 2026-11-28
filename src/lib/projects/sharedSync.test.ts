import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StudentProject } from "./types";

const { enqueue, getSession } = vi.hoisted(() => ({
  enqueue: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("@/lib/offline/mutationQueue", () => ({
  mutationQueue: { enqueue },
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { getSession } }),
}));

import { queueProjectDelete, queueProjectUpsert } from "./sharedSync";

const project = {
  id: "project-1",
  title: "Offline project",
  subject: "Biology",
  board: "Cambridge",
  academicStage: "secondary",
  status: "planning",
  currentStageId: "problem",
  stages: [],
  evidence: [{
    id: "evidence-1",
    stageId: "problem",
    type: "note",
    title: "Initial observation",
    content: "Recorded offline",
    createdAt: "2026-11-28T10:00:00.000Z",
    source: "learner",
  }],
  createdAt: "2026-11-28T09:00:00.000Z",
  updatedAt: "2026-11-28T10:00:00.000Z",
} as StudentProject;

describe("offline Project Studio mutation ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue({ data: { session: { user: { id: "learner-1" } } } });
    enqueue.mockResolvedValue({ id: "queued" });
  });

  it("queues project and evidence using the locally persisted session without a network user lookup", async () => {
    await queueProjectUpsert(project);

    expect(getSession).toHaveBeenCalledOnce();
    expect(enqueue).toHaveBeenCalledTimes(2);
    expect(enqueue).toHaveBeenNthCalledWith(1, expect.objectContaining({
      ownerId: "learner-1",
      store: "projects",
      operation: "create",
      payload: expect.objectContaining({ id: "project-1", user_id: "learner-1" }),
    }));
    expect(enqueue).toHaveBeenNthCalledWith(2, expect.objectContaining({
      ownerId: "learner-1",
      store: "project_evidence",
      operation: "create",
      payload: expect.objectContaining({ id: "evidence-1", user_id: "learner-1" }),
    }));
  });

  it("queues deletes under the locally persisted account", async () => {
    await queueProjectDelete("project-1");

    expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({
      ownerId: "learner-1",
      store: "projects",
      operation: "delete",
      payload: { id: "project-1", user_id: "learner-1" },
    }));
  });

  it("does not queue under an unknown account when no local session exists", async () => {
    getSession.mockResolvedValue({ data: { session: null } });

    await queueProjectUpsert(project);

    expect(enqueue).not.toHaveBeenCalled();
  });
});
