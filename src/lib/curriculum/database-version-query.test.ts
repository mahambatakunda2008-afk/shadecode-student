import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SYLLABUS_DIMENSIONS } from "./completeness";
import { resolveCurriculumVersionFromDatabase } from "./database-version-query";

const version = {
  id: "chem-2025-2027",
  board_id: "cambridge",
  qualification_id: "cambridge-as-a-level",
  subject_id: "chemistry",
  syllabus_id: "9701",
  syllabus_version: "2025-2027",
  effective_from: "2025-01-01",
  effective_to: "2027-12-31",
  status: "verified",
  source_document_id: "doc-1",
  document_hash: "a".repeat(64),
};

const document = {
  id: "doc-1",
  url: "https://example.org/official-syllabus.pdf",
  content_hash: "a".repeat(64),
  extraction_status: "verified",
  page_count: 98,
  content_characters: 12000,
};

const coverage = SYLLABUS_DIMENSIONS.map((dimension) => ({
  curriculum_version_id: version.id,
  dimension,
  status: "verified",
}));

function makeClient(options: {
  versions?: unknown[];
  documents?: unknown[];
  coverage?: unknown[];
  failTable?: string;
} = {}): SupabaseClient {
  const datasets: Record<string, unknown[]> = {
    curriculum_versions: options.versions ?? [version],
    curriculum_documents: options.documents ?? [document],
    curriculum_coverage_checks: options.coverage ?? coverage,
  };

  const client = {
    from(table: string) {
      const filters: Array<{ kind: "eq" | "in"; column: string; value: unknown }> = [];
      const builder: Record<string, unknown> = {
        select() { return builder; },
        eq(column: string, value: unknown) {
          filters.push({ kind: "eq", column, value });
          return builder;
        },
        in(column: string, value: unknown[]) {
          filters.push({ kind: "in", column, value });
          return builder;
        },
        then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
          if (options.failTable === table) {
            return Promise.resolve({ data: null, error: { message: "permission denied" } }).then(resolve, reject);
          }
          const rows = (datasets[table] ?? []).filter((row) => {
            const record = row as Record<string, unknown>;
            return filters.every((filter) => filter.kind === "eq"
              ? record[filter.column] === filter.value
              : (filter.value as unknown[]).includes(record[filter.column]));
          });
          return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
        },
      };
      return builder;
    },
  };
  return client as unknown as SupabaseClient;
}

const request = {
  boardId: "cambridge",
  qualificationId: "cambridge-as-a-level",
  subjectId: "chemistry",
  examYear: 2026,
};

describe("resolveCurriculumVersionFromDatabase", () => {
  it("joins document and complete coverage evidence before resolving", async () => {
    const result = await resolveCurriculumVersionFromDatabase(makeClient(), request);
    expect(result.resolution).toMatchObject({
      status: "resolved",
      version: { id: version.id },
    });
  });

  it("fails closed when the stored source fingerprint does not match", async () => {
    const result = await resolveCurriculumVersionFromDatabase(
      makeClient({ documents: [{ ...document, content_hash: "b".repeat(64) }] }),
      request,
    );
    expect(result.resolution.status).toBe("not_verified");
    expect(result.diagnostics[0].issues).toContain("source_document_hash_missing_or_invalid");
  });

  it("fails closed when source evidence is absent", async () => {
    const result = await resolveCurriculumVersionFromDatabase(
      makeClient({ documents: [] }),
      request,
    );
    expect(result.resolution.status).toBe("not_verified");
    expect(result.diagnostics[0].issues).toContain("source_document_missing");
  });

  it("does not convert a database permission error into not_found", async () => {
    await expect(resolveCurriculumVersionFromDatabase(
      makeClient({ failTable: "curriculum_versions" }),
      request,
    )).rejects.toThrow("Could not read curriculum versions: permission denied");
  });

  it("does not resolve routed requests without an authoritative route column", async () => {
    const result = await resolveCurriculumVersionFromDatabase(
      makeClient(),
      { ...request, routeId: "route-a" },
    );
    expect(result.resolution.status).toBe("not_found");
  });
});
