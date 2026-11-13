import { describe, expect, it } from "vitest";
import { getMarkingResourceDiscoverySource, MARKING_RESOURCE_DISCOVERY_SOURCES } from "./marking-resource-sources";

describe("marking resource discovery catalogue", () => {
  it("includes official board, authenticated teacher, open-resource and community channels", () => {
    expect(new Set(MARKING_RESOURCE_DISCOVERY_SOURCES.map(source => source.channel))).toEqual(
      new Set(["official_board", "authenticated_teacher_portal", "open_resource_catalogue", "community"]),
    );
  });

  it("never assumes a discovered resource has reuse permission", () => {
    expect(MARKING_RESOURCE_DISCOVERY_SOURCES.every(source => source.defaultReuse === "unknown")).toBe(true);
  });

  it("does not automatically crawl authenticated portals or public catalogues", () => {
    expect(MARKING_RESOURCE_DISCOVERY_SOURCES.every(source => source.automatedFetch === false)).toBe(true);
  });

  it("keeps the Cambridge teacher hub as authorised import only", () => {
    expect(getMarkingResourceDiscoverySource("cambridge-school-support-hub")).toMatchObject({
      access: "authenticated",
      importMode: "teacher_authorized_import",
      defaultReuse: "unknown",
      automatedFetch: false,
    });
  });

  it("returns null for unknown sources", () => {
    expect(getMarkingResourceDiscoverySource("made-up")).toBeNull();
  });
});
