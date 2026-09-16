export type LessonDifficulty = "easy" | "medium" | "hard";

const BROAD_TOPIC_MARKERS = [
  "organic chemistry",
  "inorganic chemistry",
  "physical chemistry",
  "chemistry",
  "mechanics",
  "electricity",
  "waves",
  "thermodynamics",
  "calculus",
  "trigonometry",
  "algebra",
  "statistics",
  "probability",
  "programming",
  "data structures",
  "computer science",
  "physics",
  "biology",
  "genetics",
  "cell biology",
  "ecology",
  "evolution",
];

function isBroadTopic(topic: string) {
  const normalized = topic.trim().toLowerCase();
  return BROAD_TOPIC_MARKERS.some((marker) => normalized === marker || normalized.includes(marker));
}

export function buildDeepLessonPrompt(
  subject: string,
  topic: string,
  difficulty: LessonDifficulty,
  curriculumContext = "",
) {
  const broad = isBroadTopic(topic);
  const depth = broad
    ? "This is a BROAD MASTERCLASS request. Map the subject area first, then teach its major branches in one coherent journey. Do not reduce a broad subject to a definition and a few examples. Cover the canonical subtopics a serious learner would expect, explain how they connect, and finish by opening paths for deeper study."
    : "This is a focused topic. Go deep enough that the learner can explain it, apply it, recognise traps, and connect it to neighbouring ideas.";

  const difficultyGuide = {
    easy: "Use accessible language and build from first principles, but keep intellectual depth. Never confuse beginner-friendly with shallow.",
    medium: "Use rigorous terminology, derivations or mechanisms where useful, worked reasoning, applications, and exam-level precision.",
    hard: "Assume the learner wants mastery. Include subtle distinctions, edge cases, synthesis, higher-order reasoning, demanding applications, and expert-level intuition.",
  }[difficulty];

  return `You are the master teacher inside Shadecode Student. Your job is to create a lesson that makes a student think: "I finally understand this, and now I want to know what comes next."

SUBJECT: ${subject}
REQUEST: ${topic}
DIFFICULTY: ${difficulty}
${curriculumContext ? `VERIFIED CURRICULUM CONTEXT:\n${curriculumContext}` : "No verified curriculum context is available. Teach accurately as general educational material and do not invent exam-board requirements."}

${depth}

TEACHING STANDARD
${difficultyGuide}
This must NOT read like an AI summary, Wikipedia paragraph, revision-card dump, or list of definitions. It should feel like a compact textbook chapter taught by an exceptional teacher who can see where a learner will get confused.

The lesson must build a mental model. Explain WHAT something is, WHY it behaves that way, HOW to recognise it, HOW to use it, and WHERE it connects to other ideas. When a rule is given, explain the mechanism or reasoning behind the rule where appropriate. When a formula appears, explain what the symbols mean, why the relationship makes sense, its conditions, units, and how to rearrange/use it. When a process or mechanism is taught, make the sequence explicit.

For a BROAD topic, first establish the map of the territory. Cover the major canonical branches rather than spending the whole lesson on the first definition. For example, a broad chemistry request should move through foundations, classification, structure/bonding, nomenclature, reactions/mechanisms, important functional groups or families, synthesis/interconversion, analytical ideas, applications, and exam/problem-solving connections as appropriate to that subject. Adapt the actual branches to the requested topic rather than blindly copying this example.

CONTENT ARCHITECTURE
Return ONLY valid JSON with this shape:
{"title":"...","blocks":[{"type":"...","title":"...","content":"..."}]}

Use 16-24 blocks for a broad topic and 14-20 blocks for a focused topic. Use these block types in a deliberate order, combining or repeating types when useful:
- objective: concrete mastery outcomes
- map: the big picture and how the parts connect
- prior: prerequisite knowledge and a quick activation of it
- concept: deep first-principles explanation
- definition: precise terminology and distinctions
- structure: classification, components, diagrams described clearly in text, or patterns
- mechanism: causal/process explanation, including step-by-step reasoning where relevant
- formula: equations, symbols, units, conditions, derivation/intuition where relevant
- example: fully worked example with intermediate reasoning
- comparison: distinguish similar concepts that students commonly confuse
- checkpoint: a self-check question followed by reasoning/explanation
- misconception: realistic wrong idea and why it fails
- application: real-world or cross-topic use that makes the concept meaningful
- exam: board/level-aware application when verified context exists, otherwise a general rigorous problem
- mistake: common traps, command words, units, notation, logic, or procedural errors
- synthesis: connect several ideas into a larger problem or chain of reasoning
- curiosity: a surprising consequence, unresolved question, historical/scientific connection, or "what if?" that naturally invites further exploration
- summary: a compact mental model, not generic encouragement
- practice: 3-5 progressively harder questions with enough answer guidance for self-study
- next: specific topics that naturally follow from this lesson

DEPTH RULES
1. Most concept/mechanism/structure/application blocks should be 120-220 words. Do not artificially inflate short factual blocks.
2. At least 5 blocks must contain explicit reasoning, sequences, or worked steps.
3. Include at least 3 worked examples or worked applications when the topic supports them.
4. Include at least 3 checkpoints spread through the lesson, not all at the end.
5. Include at least 2 misconception/comparison blocks when the topic has common confusions.
6. For broad topics, every major branch needs substantive treatment, not merely a heading.
7. Do not repeat the same explanation with synonyms. Each block must advance the learner.
8. Define unfamiliar terminology at first meaningful use.
9. Use precise notation. For equations, readable plain text is acceptable, but never omit symbols, units, assumptions, or conditions.
10. Examples must show why each step is taken, not merely display calculations.
11. Exam material must teach the method and reasoning, not just reveal the answer.
12. Curiosity must be grounded in the actual subject and should create a genuine next question.
13. Never claim a syllabus includes something unless it is supported by the verified curriculum context.
14. Never mention being an AI, this prompt, JSON, token limits, or generation instructions.
15. Do not pad the lesson with motivational filler. Substance first.

QUALITY BAR
Before returning the JSON, silently check: Is this genuinely teachable without another AI response? Could a student explain the core ideas after reading it? Are the connections visible? Are there worked examples, traps, checks, and a path forward? If not, deepen it before returning it.`;
}

export function buildLessonRepairPrompt(subject: string, topic: string, raw: string) {
  return `You are repairing a weak educational lesson for Shadecode Student.

SUBJECT: ${subject}
TOPIC: ${topic}

The draft below may be shallow, repetitive, incomplete, or structurally invalid. Rewrite it into a genuinely teachable lesson. Preserve correct useful material, but replace generic filler and expand missing reasoning. If the topic is broad, cover its major branches rather than treating it as one tiny definition.

Requirements:
- Return ONLY valid JSON.
- 16-24 substantive blocks for a broad topic, otherwise 14-20.
- Use a deliberate progression from mental model -> concepts -> mechanisms/formulas -> worked examples -> checks -> applications -> exam/problem solving -> synthesis -> curiosity -> practice -> next steps.
- Most teaching blocks should contain 120-220 words of real explanation.
- Include at least 3 worked examples/applications, 3 checkpoints, 2 misconception/comparison blocks, 2 synthesis/connection moments, and a curiosity block.
- Explain WHY and HOW, not only WHAT.
- Do not invent syllabus requirements.

Draft to repair:
${raw.slice(0, 30000)}`;
}

export function lessonQualityScore(blocks: Array<{ type: string; content: string }>) {
  if (!blocks.length) return 0;
  const substantive = blocks.filter((b) => b.content.trim().length >= 100).length;
  const richTypes = new Set(["mechanism", "example", "application", "synthesis", "curiosity", "concept", "structure"]);
  const rich = blocks.filter((b) => richTypes.has(b.type) && b.content.trim().length >= 120).length;
  const checkpoints = blocks.filter((b) => b.type === "checkpoint").length;
  const examples = blocks.filter((b) => ["example", "application"].includes(b.type)).length;
  return Math.round(
    Math.min(100, (substantive / Math.max(1, blocks.length)) * 45 + (rich / Math.max(1, blocks.length)) * 35 + Math.min(10, checkpoints * 3) + Math.min(10, examples * 3)),
  );
}
