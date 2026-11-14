import { describe, expect, it } from "vitest";
import { fetchAllRows } from "./fetchAllRows";

const source = (n: number) => Array.from({ length: n }, (_, i) => i);
const pager = (data: number[]) => async (from: number, to: number) => ({ data: data.slice(from, to + 1), error: null });

describe("fetchAllRows", () => {
  it("collects every page", async () => {
    const r = await fetchAllRows(pager(source(2500)), { pageSize: 1000 });
    expect(r.rows).toHaveLength(2500);
    expect(r.truncated).toBe(false);
    expect(r.failed).toBe(false);
  });
  it("stops at maxRows and reports truncation", async () => {
    const r = await fetchAllRows(pager(source(5000)), { pageSize: 1000, maxRows: 3000 });
    expect(r.rows).toHaveLength(3000);
    expect(r.truncated).toBe(true);
  });
  it("handles an exact page boundary and empty results", async () => {
    expect((await fetchAllRows(pager(source(2000)), { pageSize: 1000 })).rows).toHaveLength(2000);
    expect((await fetchAllRows(pager([]))).rows).toEqual([]);
  });
  it("reports failure without throwing and keeps what it already has", async () => {
    let calls = 0;
    const r = await fetchAllRows(async () => (++calls === 1 ? { data: source(1000), error: null } : { data: null, error: new Error("boom") }), { pageSize: 1000 });
    expect(r.failed).toBe(true);
    expect(r.rows).toHaveLength(1000);
  });
});
