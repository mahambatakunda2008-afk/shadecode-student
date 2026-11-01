import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (rel: string) => readFileSync(path.join(root, rel), "utf8");
const walk = (dir: string): string[] =>
  readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = path.posix.join(dir, e.name);
    return e.isDirectory() ? walk(rel) : e.name.endsWith(".tsx") && !e.name.includes(".test.") ? [rel] : [];
  });

/**
 * The app shell (src/app/(app)/layout.tsx, src/app/admin/layout.tsx) owns the page's single <main> landmark and the skip-link
 * target (#main-content). Screens rendered inside it must not add their own <main>: nested/duplicate mains confuse
 * screen-reader landmark navigation (axe: landmark-no-duplicate-main, landmark-main-is-top-level).
 */
describe("one <main> landmark per page", () => {
  it("app-shell route files do not render their own <main>", () => {
    const offenders = walk("src/app/(app)").filter((f) => !f.endsWith("/layout.tsx") && /<main\b/.test(read(f)));
    expect(offenders).toEqual([]);
  });

  it("admin pages inside the admin layout do not render their own <main>", () => {
    const offenders = walk("src/app/admin").filter((f) => !f.endsWith("/layout.tsx") && /<main\b/.test(read(f)));
    expect(offenders).toEqual([]);
  });

  it("shared screens that only render inside the shell do not render their own <main>", () => {
    const shellOnly = [
      "src/components/exam/ExamWorkspace.tsx",
      "src/components/academic/ExperienceStudyPlan.tsx",
      "src/components/academic/ExperienceFocus.tsx",
      "src/components/academic/ExperienceDashboard.tsx",
      "src/components/academic/ExperienceTasks.tsx",
      "src/components/discovery/DiscoveryActivity.tsx",
      "src/components/code-lab/CodeLabWorkspaceRuntimeV2.tsx",
      "src/components/dashboard/DashboardReimagined.tsx",
      "src/components/study/RevisionHub.tsx",
      "src/components/study/LibraryHub.tsx",
      "src/components/comp-lab/CompLabWorkspace.tsx",
    ];
    expect(shellOnly.filter((f) => /<main\b/.test(read(f)))).toEqual([]);
  });

  it("each shell variant keeps exactly one <main id=main-content> (the skip-link target)", () => {
    const shell = read("src/app/(app)/layout.tsx");
    expect((shell.match(/<main\b[^>]*id="main-content"/g) ?? []).length).toBe(3); // admin, Comp Lab and regular variants
  });
});
