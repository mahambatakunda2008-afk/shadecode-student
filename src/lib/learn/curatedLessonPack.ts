import pack from "../../../docs/curriculum/lessons/economics-9708-as-1.1-scarcity-choice-opportunity-cost.json";

export interface CuratedLessonBlock {
  type: string;
  title?: string;
  content: string;
}

function asText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map((item) => String(item)).join("\n");
  return "";
}

/** Converts an authored, offline-ready curriculum pack into the existing Learn renderer format.
 * Assessment keys and marking guidance are intentionally excluded from learner-visible blocks.
 */
export function buildEconomics9708AS11LearnBlocks(): CuratedLessonBlock[] {
  const blocks: CuratedLessonBlock[] = [];

  for (const section of pack.lesson) {
    let content = "";
    if (section.type === "worked_example") {
      content = [
        section.scenario,
        ...section.reasoning.map((line: string, index: number) => `${index + 1}. ${line}`),
        section.caution ? `Watch out: ${section.caution}` : "",
      ].filter(Boolean).join("\n");
    } else if (section.type === "application") {
      content = [section.scenario, ...section.prompts.map((line: string) => `- ${line}`), section.feedback].filter(Boolean).join("\n");
    } else {
      content = asText(section.body ?? section.prompt);
    }
    if (content.trim()) blocks.push({ type: section.type === "explanation" ? "concept" : section.type === "worked_example" ? "example" : section.type, title: section.heading, content });
  }

  for (const check of pack.retrievalCheck) {
    blocks.push({ type: "checkpoint", title: "Retrieval check", content: check.prompt });
  }
  for (const question of pack.practice) {
    blocks.push({ type: "practice", title: `Practice • ${question.marks} marks`, content: question.prompt });
  }

  return blocks;
}

export const economics9708AS11Pack = {
  subject: "Economics",
  topic: "Economics 9708 AS 1.1",
  title: pack.identity.title,
  description: "Offline-ready Cambridge AS Economics lesson covering scarcity, choice, opportunity cost and resource allocation. Draft content pending teacher review.",
  difficulty: "medium" as const,
  status: pack.status,
  source: pack.identity.sourcePdf,
  blocks: buildEconomics9708AS11LearnBlocks(),
};
