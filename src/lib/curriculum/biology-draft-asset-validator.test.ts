import { describe, expect, it } from "vitest";
import { validateBiologyDraftAsset } from "../../../scripts/validate-biology-draft-assets.mjs";

const valid = {
  asset_key: "biology-9700-sample-topic",
  asset_version: 1,
  asset_type: "lesson",
  subject_id: "biology",
  review_status: "draft",
  curriculum: {
    board_id: "cambridge",
    qualification_id: "cambridge-as-a-level",
    syllabus_id: "cambridge-9700",
    syllabus_version: "2028-2030",
    expected_topic_key: "4",
    status: "draft",
    source_reference: "Cambridge 744622-2028-2030-syllabus.pdf",
    syllabus_outcome_codes: ["4.1.1"],
    objective_mapping_status: "unmapped_to_database_objective_uuids"
  },
  content: {
    learning_objectives: ["Explain the membrane model and apply it to cells."],
    sections: [{ heading: "Membrane structure", body: "A phospholipid bilayer forms the basic structure of a cell surface membrane. Its hydrophilic heads face aqueous environments while hydrophobic tails face inward, creating a selective barrier." }],
    questions: [{ question: "Explain how phospholipid structure contributes to membrane formation.", answer: "The polar heads interact with water while non-polar tails avoid water and face inward.", mark_points: ["Hydrophilic heads face aqueous surroundings", "Hydrophobic tails face inward"] }],
    visual_assets: []
  },
  quality_checks: { syllabus_checked: false, factual_accuracy_checked: false, assessment_checked: false, accessibility_checked: false }
};

describe("Biology 9700 draft asset structural gate", () => {
  it("accepts a structurally complete, draft-only package", () => {
    expect(validateBiologyDraftAsset(valid)).toEqual([]);
  });
  it("rejects duplicate or cross-topic outcome codes", () => {
    const asset = structuredClone(valid);
    asset.curriculum.syllabus_outcome_codes = ["3.1.1", "3.1.1"];
    expect(validateBiologyDraftAsset(asset).join("\n")).toMatch(/unique|belong to topic/);
  });
  it("rejects publication-like UUID mapping and missing mark points", () => {
    const asset = structuredClone(valid);
    asset.curriculum.objective_mapping_status = "mapped";
    asset.content.questions[0].mark_points = [];
    const errors = validateBiologyDraftAsset(asset).join("\n");
    expect(errors).toContain("objective UUID mapping must remain explicitly unmapped");
    expect(errors).toContain("needs indicative mark points");
  });
  it("rejects weak lesson text and review flags set to passed", () => {
    const asset = structuredClone(valid);
    asset.content.sections[0].body = "Short.";
    asset.quality_checks.accessibility_checked = true;
    const errors = validateBiologyDraftAsset(asset).join("\n");
    expect(errors).toContain("needs substantive explanatory text");
    expect(errors).toContain("accessibility_checked must remain false");
  });
});
