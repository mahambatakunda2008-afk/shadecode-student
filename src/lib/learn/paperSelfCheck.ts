/**
 * src/lib/learn/paperSelfCheck.ts
 *
 * Model-free paper learning. When the AI cannot build or grade a session, the
 * questions the app already extracted from the student's PDF still make a
 * working session: each question becomes a checkpoint, matched (only when the
 * match is clear) to a verified syllabus subsection whose official outcomes
 * form a self-check list. The student rates how their answer compared, and that
 * rating feeds mastery as softer evidence than a marked answer.
 */

import { RATING_EVIDENCE, type RevisionRating } from "@/lib/study/revisionDeck";
import { tokenize, unitMatchesScope, type PaperScope } from "@/lib/topicMastery/resolver";

export interface PaperQuestionInput {
  questionNumber: string;
  questionText: string;
  marks: number | null;
  sourcePageStart: number | null;
  sourcePageEnd: number | null;
}

export interface OutcomeInput {
  topic_key: string;
  title: string;
  content: string;
  level?: string | null;
  syllabus_id?: string;
}

export interface TopicOutcomes {
  syllabusId: string;
  topicKey: string;
  title: string;
  level: string | null;
  outcomes: string[];
}

const MAX_QUESTIONS = 12;
const MAX_CONCEPTS = 4;

export function groupOutcomes(rows: OutcomeInput[], syllabusId: string): TopicOutcomes[] {
  const byTopic = new Map<string, TopicOutcomes>();
  for (const row of rows) {
    if (!row.content?.trim()) continue;
    const entry = byTopic.get(row.topic_key) ?? { syllabusId, topicKey: row.topic_key, title: row.title.split(": outcome ")[0], level: row.level ?? null, outcomes: [] };
    entry.outcomes.push(row.content.replace(/\s+/g, " ").trim().replace(/[.;:\s]+$/u, ""));
    byTopic.set(row.topic_key, entry);
  }
  return [...byTopic.values()];
}

/**
 * Returns the single clearly-best subsection for a question, or null.
 * Scoring is IDF-weighted token overlap, with title words counting triple;
 * a match must be strong and must beat the runner-up by a clear margin.
 */
export function matchQuestionToTopic(questionText: string, topics: TopicOutcomes[]): TopicOutcomes | null {
  if (topics.length === 0) return null;
  const questionTokens = new Set(tokenize(questionText));
  if (questionTokens.size < 4) return null;

  const vocab = topics.map((topic) => ({ topic, title: new Set(tokenize(topic.title)), all: new Set([...tokenize(topic.title), ...topic.outcomes.flatMap((outcome) => tokenize(outcome))]) }));
  const documentFrequency = new Map<string, number>();
  for (const entry of vocab) for (const token of entry.all) documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);

  const scored = vocab
    .map((entry) => {
      let score = 0;
      for (const token of questionTokens) {
        if (!entry.all.has(token)) continue;
        const idf = Math.log(1 + topics.length / (documentFrequency.get(token) ?? 1));
        score += (entry.title.has(token) ? 3 : 1) * idf;
      }
      return { topic: entry.topic, score };
    })
    .sort((a, b) => b.score - a.score);

  const [best, second] = scored;
  // A token's IDF is at most ln(1 + N), so the bar scales with the number of subsections: roughly
  // two clearly rare syllabus words plus support, whatever the syllabus size.
  const minimum = 2.5 * Math.log(1 + topics.length / 2);
  if (!best || best.score < minimum) return null;
  if (second && best.score < second.score * 1.4) return null;
  return best.topic;
}

export interface SelfCheckBlock {
  id: string;
  type: string;
  title: string;
  content: string;
  sourcePages: number[];
  /** The verified subsection this question was matched to, when the match was clear. */
  curriculum?: { syllabusId: string; topicKey: string; title: string };
  interaction: {
    prompt: string;
    evaluationMode: "self_check";
    expectedConcepts: string[];
    rubric: string;
    modelAnswer: string;
    hints: string[];
  };
}

export interface SelfCheckPlan {
  mode: "self_check";
  title: string;
  overview: string;
  subject: string;
  level: string;
  board: string;
  topics: string[];
  blocks: SelfCheckBlock[];
}

const SUBJECT_BY_SYLLABUS: Record<string, string> = {
  "cambridge-9700": "Biology",
  "cambridge-9701": "Chemistry",
  "cambridge-9702": "Physics",
  "cambridge-9709": "Mathematics",
};

export function buildSelfCheckPlan(options: {
  sourceName: string;
  questions: PaperQuestionInput[];
  scope: PaperScope | null;
  outcomes: OutcomeInput[];
}): SelfCheckPlan | null {
  const questions = options.questions.filter((question) => question.questionText.trim().length > 0).slice(0, MAX_QUESTIONS);
  if (questions.length === 0) return null;

  const topics = options.scope
    ? groupOutcomes(options.outcomes, options.scope.syllabusId).filter((topic) =>
        unitMatchesScope({ syllabusId: topic.syllabusId, subjectId: "", topicKey: topic.topicKey, title: topic.title, level: topic.level ?? undefined }, options.scope!),
      )
    : [];

  const matchedTitles = new Set<string>();
  const blocks: SelfCheckBlock[] = questions.map((question) => {
    const topic = matchQuestionToTopic(question.questionText, topics);
    const concepts = topic ? topic.outcomes.slice(0, MAX_CONCEPTS) : [];
    if (topic) matchedTitles.add(topic.title);
    const marks = question.marks ? ` (${question.marks} mark${question.marks === 1 ? "" : "s"})` : "";
    const pages = [...new Set([question.sourcePageStart, question.sourcePageEnd])].filter((page): page is number => typeof page === "number");
    return {
      id: `q-${question.questionNumber}`.replace(/[^\w-]/g, "").slice(0, 60),
      type: "checkpoint",
      title: `Question ${question.questionNumber}${marks}`,
      content: topic ? `This looks like ${topic.title} (syllabus ${topic.topicKey}).` : "Attempt this question on paper, then rate how it went.",
      sourcePages: pages,
      ...(topic ? { curriculum: { syllabusId: topic.syllabusId, topicKey: topic.topicKey, title: topic.title } } : {}),
      interaction: {
        prompt: question.questionText.trim().slice(0, 2000),
        evaluationMode: "self_check",
        expectedConcepts: concepts,
        rubric: "Self-check: compare your working with the official syllabus points and your mark scheme.",
        modelAnswer: concepts.length ? `Make sure your answer covers: ${concepts.join("; ")}.` : "Compare your answer with your mark scheme.",
        hints: concepts.length ? concepts.map((concept) => `Think about: ${concept}.`) : ["Identify what the question is testing, then state your first justified step."],
      },
    };
  });

  const subject = options.scope ? (SUBJECT_BY_SYLLABUS[options.scope.syllabusId] ?? "") : "";
  return {
    mode: "self_check",
    title: `${options.sourceName.replace(/\.pdf$/i, "")} · self-check`,
    overview: "The AI is unavailable right now, so this session uses self-checking. Attempt each question, compare it with the syllabus points, and rate honestly. Your ratings still update your mastery.",
    subject,
    level: options.scope ? "A Level" : "",
    board: options.scope ? "Cambridge" : "",
    topics: [...matchedTitles],
    blocks,
  };
}

export interface SelfCheckEvaluation {
  verdict: "correct" | "partially_correct" | "incorrect";
  feedback: string;
  /** Empty strings mean "none", matching the paper evaluation contract. */
  misconception: string;
  nextAction: string;
  hint: string;
  solution: string;
  evidence: number;
}

export function selfCheckEvaluation(rating: RevisionRating, concepts: string[]): SelfCheckEvaluation {
  const { verdict, evidence } = RATING_EVIDENCE[rating];
  const list = concepts.length ? `\n${concepts.map((concept) => `• ${concept}`).join("\n")}` : "";
  const feedback =
    rating === "got_it"
      ? "Recorded. You judged that your answer covers the syllabus points. This is self-assessed, so it counts for less than a marked answer."
      : rating === "unsure"
        ? `Worth another look. Check your answer covers these points, then try again:${list}`
        : `No problem. Review these points, then have another go:${list}`;
  const nextAction = rating === "got_it" ? "Move on to the next question." : "Re-read the points above, then attempt the question again.";
  return { verdict, feedback, misconception: "", nextAction, hint: "", solution: "", evidence };
}
