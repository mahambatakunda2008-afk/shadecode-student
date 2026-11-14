import { describe, expect, it } from "vitest";
import { preparePublishedAsset } from "../../../scripts/prepare-biology-published-assets.mjs";

const draft = {
  asset_key: "biology-9700-sample",
  asset_version: 1,
  asset_type: "lesson",
  title: "Sample lesson",
  subject_id: "biology",
  review_status: "draft",
  curriculum: {
    status: "draft",
    expected_topic_key: "4",
    syllabus_version: "2028-2030",
    source_reference: "Cambridge 9700 syllabus 2028-2030",
    syllabus_outcome_codes: ["4.1.1"],
  },
  content: {
    learning_objectives: ["Explain the membrane model."],
    sections: [{ heading: "Structure", body: "A sufficiently detailed explanation of membrane structure and function." }],
    questions: [{ question: "Explain the bilayer.", answer: "Hydrophilic heads face water and hydrophobic tails face inward.", mark_points: ["Heads face water", "Tails face inward"] }],
    visual_assets: [{ path: "/learning-assets/biology/9700/membranes/bilayer.svg", alt: "A labelled phospholipid bilayer diagram." }],
  },
};

describe("Biology draft to published-asset preparation", () => {
  it("maps lesson teaching, practice and visuals to the editorial payload contract", () => {
    const result = preparePublishedAsset(draft);
    expect(result.content.sections).toHaveLength(1);
    expect(result.content.practice[0].indicative_mark_points).toHaveLength(2);
    expect(result.content.visual_tasks[0].path).toContain("bilayer.svg");
    expect(result.topic_key).toBe("4");
    expect(result.asset_type).toBe("lesson");
  });

  it("keeps curriculum and objective mapping blocked rather than inventing identifiers", () => {
    const result = preparePublishedAsset(draft);
    expect(result.curriculum_version_id).toBeNull();
    expect(result.objective_keys).toEqual([]);
    expect(result.preparation_status).toContain("blocked");
    expect(result.quality_checks.syllabus_checked).toBe(false);
  });

  it("rejects non-draft assets and incomplete teaching packages", () => {
    expect(() => preparePublishedAsset({ ...draft, review_status: "approved" })).toThrow(/draft/);
    expect(() => preparePublishedAsset({ ...draft, content: { sections: [], questions: [] } })).toThrow(/required/);
  });
});
