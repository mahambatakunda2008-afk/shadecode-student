import { describe, expect, it } from "vitest";
import principles from "../../../docs/learning-assets/drafts/biology-9700-genetic-technology-principles.v1.json";
import medicine from "../../../docs/learning-assets/drafts/biology-9700-genetic-technology-medicine.v1.json";
import agriculture from "../../../docs/learning-assets/drafts/biology-9700-genetic-technology-agriculture.v1.json";
const packages=[principles,medicine,agriculture];
const expected=[...Array.from({length:11},(_,i)=>`19.1.${i+1}`),...Array.from({length:4},(_,i)=>`19.2.${i+1}`),"19.3.1","19.3.2"];
describe("Cambridge Biology 9700 Topic 19 draft assets",()=>{
 it("covers all 17 outcomes exactly once",()=>{const codes=packages.flatMap(x=>x.curriculum.syllabus_outcome_codes);expect(codes).toHaveLength(17);expect(new Set(codes).size).toBe(17);expect([...codes].sort()).toEqual([...expected].sort());});
 it("keeps packages draft-only and unmapped",()=>{for(const x of packages){expect(x.curriculum.status).toBe("draft");expect(x.review_status).toBe("draft");expect(x.curriculum.objective_mapping_status).toBe("unmapped_to_database_objective_uuids");}});
 it("requires teaching sections and answered questions",()=>{for(const x of packages){expect(x.content.sections.length).toBeGreaterThanOrEqual(8);expect(x.content.questions.length).toBeGreaterThanOrEqual(8);for(const q of x.content.questions){expect(q.answer.length).toBeGreaterThan(5);expect(q.mark_points.length).toBeGreaterThan(0);}}});
 it("links all ten Topic 19 SVG assets",()=>{const a=packages.flatMap(x=>x.content.visual_assets);expect(a).toHaveLength(10);expect(a.every(x=>x.path.startsWith("/learning-assets/biology/9700/genetic-technology/"))).toBe(true);});
});