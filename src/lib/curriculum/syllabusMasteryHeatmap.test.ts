import { describe, expect, it } from "vitest";
import { projectSyllabusHeatmap } from "./syllabusMasteryHeatmap";

describe("projectSyllabusHeatmap", () => {
  it("does not classify untouched default-zero objectives as weak", () => {
    const result = projectSyllabusHeatmap([
      {objective_key:"1.1",title:"Foundations",mastery_score:0,attempts:0},
    ]);
    expect(result.cells[0].mastery).toBeNull();
    expect(result.cells[0].band).toBe("insufficient_evidence");
    expect(result.summary.evidenced).toBe(0);
  });

  it("assigns evidence-backed mastery bands and aggregates only evidenced scores", () => {
    const result = projectSyllabusHeatmap([
      {objective_key:"1.1",title:"A",parent_key:"1",mastery_score:45,attempts:2},
      {objective_key:"1.2",title:"B",parent_key:"1",mastery_score:70,attempts:1},
      {objective_key:"1.3",title:"C",parent_key:"1",mastery_score:90,attempts:4},
      {objective_key:"1.4",title:"D",parent_key:"1",mastery_score:0,attempts:0},
    ]);
    expect(result.cells.map(c=>c.band)).toEqual(["needs_work","developing","mastered","insufficient_evidence"]);
    expect(result.groups[0].averageMastery).toBe(68);
    expect(result.groups[0].evidencedCount).toBe(3);
    expect(result.summary.averageMastery).toBe(68);
  });

  it("clamps scores and respects the configured minimum attempt count", () => {
    const result = projectSyllabusHeatmap([
      {objective_key:"x",title:"X",mastery_score:140,attempts:1},
      {objective_key:"y",title:"Y",mastery_score:-5,attempts:3},
    ], 2);
    expect(result.cells[0].mastery).toBeNull();
    expect(result.cells[1].mastery).toBe(0);
    expect(result.cells[1].band).toBe("needs_work");
  });

  it("returns null aggregate when there is no scored evidence", () => {
    const result = projectSyllabusHeatmap([{objective_key:"x",title:"X",attempts:0,mastery_score:0}]);
    expect(result.summary.averageMastery).toBeNull();
    expect(result.groups[0].averageMastery).toBeNull();
  });
});
