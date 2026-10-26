import { describe, expect, it } from "vitest";
import type { AcademicExperience } from "@/lib/academic/experience";
import { getExperienceNavGroups } from "@/lib/navigation";

const schoolExperience = {
  family: "school",
  allowedRoutes: ["/dashboard", "/learn", "/comp-lab", "/exam-sim"],
} as unknown as AcademicExperience;

function hrefs(groups: ReturnType<typeof getExperienceNavGroups>) {
  return groups.flatMap((group) => group.items.map((item) => item.href));
}

describe("subject-aware Code Lab navigation", () => {
  it("hides Code Lab when the learner has no computing subject", () => {
    const groups = getExperienceNavGroups(
      schoolExperience,
      [],
      ["Mathematics", "Physics", "Chemistry"],
    );

    expect(hrefs(groups)).not.toContain("/comp-lab");
  });

  it("shows Code Lab when Computer Science is selected in the profile", () => {
    const groups = getExperienceNavGroups(
      schoolExperience,
      [],
      ["Mathematics", "Computer Science", "Physics"],
    );

    expect(hrefs(groups)).toContain("/comp-lab");
  });

  it("recognizes Computing Studies in curriculum metadata", () => {
    const groups = getExperienceNavGroups(
      schoolExperience,
      [{ subject_name: "Computing Studies" }],
      ["Mathematics", "Physics"],
    );

    expect(hrefs(groups)).toContain("/comp-lab");
  });

  it("does not show Code Lab when subject metadata is missing", () => {
    const groups = getExperienceNavGroups(schoolExperience, undefined, undefined);

    expect(hrefs(groups)).not.toContain("/comp-lab");
  });
});
