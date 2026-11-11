import scarcityPack from "../../../docs/curriculum/lessons/economics-9708-as-1.1-scarcity-choice-opportunity-cost.json";
import methodologyPack from "../../../docs/curriculum/lessons/economics-9708-as-1.2-economic-methodology.json";
import factorsPack from "../../../docs/curriculum/lessons/economics-9708-as-1.3-factors-of-production.json";
import systemsPack from "../../../docs/curriculum/lessons/economics-9708-as-1.4-economic-systems.json";

export interface CuratedLessonBlock {
  type: string;
  title?: string;
  content: string;
}

type AuthoredPack = {
  schemaVersion: number;
  status: string;
  identity: { title: string; sourcePdf: string };
  learningObjectives: string[];
  visuals?: Array<{ kind: string; title: string; altText: string; purpose: string; learningObjectiveIds: string[]; offlineIncluded: boolean; practiceModes: string[] }>;
  lesson: Array<Record<string, unknown>>;
  retrievalCheck: Array<{ prompt: string }>;
  practice: Array<{ marks: number; prompt: string }>;
};

function asText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map((item) => String(item)).join("\n");
  return "";
}

/** Converts authored curriculum content to the existing Learn renderer format.
 * Assessment keys and marking guidance are intentionally excluded from learner-visible blocks.
 */
export function buildCuratedLearnBlocks(authoredPack: AuthoredPack): CuratedLessonBlock[] {
  const blocks: CuratedLessonBlock[] = [];
  blocks.push({ type: "objective", title: "By the end of this lesson", content: authoredPack.learningObjectives.map((objective) => `- ${objective}`).join("\n") });
  for (const visual of authoredPack.visuals ?? []) {
    blocks.push({ type: "diagram", title: visual.title, content: visual.kind });
  }

  for (const section of authoredPack.lesson) {
    const type = asText(section.type);
    let content = "";
    if (type === "worked_example") {
      const reasoning = Array.isArray(section.reasoning) ? section.reasoning.map(asText) : [];
      content = [
        asText(section.scenario),
        ...reasoning.map((line, index) => `${index + 1}. ${line}`),
        section.caution ? `Watch out: ${asText(section.caution)}` : "",
      ].filter(Boolean).join("\n");
    } else if (type === "application") {
      const prompts = Array.isArray(section.prompts) ? section.prompts.map(asText) : [];
      content = [asText(section.scenario), ...prompts.map((line) => `- ${line}`), asText(section.feedback)].filter(Boolean).join("\n");
    } else {
      content = asText(section.body ?? section.prompt);
    }
    if (content.trim()) {
      const blockType = type === "explanation" ? "concept" : type === "worked_example" ? "example" : type;
      blocks.push({ type: blockType, title: asText(section.heading) || undefined, content });
    }
  }

  for (const check of authoredPack.retrievalCheck) {
    blocks.push({ type: "checkpoint", title: "Retrieval check", content: check.prompt });
  }
  for (const question of authoredPack.practice) {
    blocks.push({ type: "practice", title: `Practice • ${question.marks} marks`, content: question.prompt });
  }
  return blocks;
}

function createLearnPack(authored: AuthoredPack, subtopic: string) {
  return {
    subject: "Economics",
    topic: `Economics 9708 AS ${subtopic}`,
    title: authored.identity.title,
    description: `Offline-ready Cambridge AS Economics lesson for topic ${subtopic}. Draft instructional content pending teacher review.`,
    difficulty: "medium" as const,
    status: authored.status,
    source: authored.identity.sourcePdf,
    blocks: buildCuratedLearnBlocks(authored),
  };
}

export const economics9708AS11Pack = createLearnPack(scarcityPack as AuthoredPack, "1.1");
export const economics9708AS12Pack = createLearnPack(methodologyPack as AuthoredPack, "1.2");
export const economics9708AS13Pack = createLearnPack(factorsPack as AuthoredPack, "1.3");
export const economics9708AS14Pack = createLearnPack(systemsPack as AuthoredPack, "1.4");

export function getCuratedEconomics9708Pack(packId: string) {
  if (packId === "economics-9708-as-1.1") return economics9708AS11Pack;
  if (packId === "economics-9708-as-1.2") return economics9708AS12Pack;
  if (packId === "economics-9708-as-1.3") return economics9708AS13Pack;
  if (packId === "economics-9708-as-1.4") return economics9708AS14Pack;
  return null;
}
