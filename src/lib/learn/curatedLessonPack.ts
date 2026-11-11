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

/** Converts authored curriculum content to the existing Learn renderer format.
 * Assessment keys and marking guidance are intentionally excluded from learner-visible blocks.
 */
export function buildEconomics9708AS11LearnBlocks(): CuratedLessonBlock[] {
  const blocks: CuratedLessonBlock[] = [];

  for (const rawSection of pack.lesson) {
    const section = rawSection as unknown as Record<string, unknown>;
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
