import { conflictPolicyForStore, mergeTaskFields, resolveRecordConflict } from "../syncPolicy";

describe("offline sync policy", () => {
  it("uses entity-specific policies", () => {
    expect(conflictPolicyForStore("tasks")).toBe("field_merge");
    expect(conflictPolicyForStore("project_evidence")).toBe("append_only");
    expect(conflictPolicyForStore("xp")).toBe("server_validated");
  });

  it("merges supported task fields without copying server-only fields", () => {
    expect(mergeTaskFields({ id: "t1", title: "old", completed: false, serverOnly: 1 }, { id: "t1", title: "new", completed: true })).toEqual({ id: "t1", title: "new", completed: true, serverOnly: 1 });
  });

  it("keeps newer server records visible as conflicts", () => {
    const result = resolveRecordConflict({ payload: { id: "t1", title: "server" }, version: 5 }, { payload: { id: "t1", title: "client" }, version: 2 }, "record_version");
    expect(result.status).toBe("conflict");
    expect(result.payload?.title).toBe("server");
  });
});
