export interface LocalLessonBlock {
  [key: string]: unknown;
  type: string;
  title?: string;
  content: string;
}

export interface LocalLesson {
  id: string;
  title: string;
  blocks: LocalLessonBlock[];
}

function clean(value: string) { return value.trim().replace(/\s+/g, " "); }

function idFor(subject: string, prompt: string) {
  const seed = `${subject}:${prompt}`.toLowerCase();
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
  return `offline-lesson-${(hash >>> 0).toString(36)}`;
}

/** Honest offline fallback: it creates a structured study session without inventing subject facts. */
export function generateLocalLesson(subject: string, prompt: string): LocalLesson {
  const safeSubject = clean(subject) || "your subject";
  const safePrompt = clean(prompt);
  const title = `${safePrompt.slice(0, 70)}${safePrompt.length > 70 ? "…" : ""}`;
  const blocks: LocalLessonBlock[] = [
    { type: "objective", title: "Target", content: `By the end of this session, explain “${safePrompt}”, identify what you know, and apply it to a fresh example.` },
    { type: "prior", title: "Start from what you know", content: `Write 2–3 things you already know about “${safePrompt}”, then one part that feels uncertain. Keep the uncertainty. It tells the next activity where to focus.` },
    { type: "concept", title: "Build the concept", content: `Describe “${safePrompt}” as a ${safeSubject} idea: what it is, what it is used for, and what kind of question needs it. Use a downloaded textbook, syllabus or past paper as the factual reference when available offline.` },
    { type: "definition", title: "Key terms", content: `Create a short glossary for “${safePrompt}”: term → precise meaning → one example. Keep each definition short enough to reproduce under exam pressure.` },
    { type: "example", title: "Worked example", content: `Choose one representative ${safeSubject} question about “${safePrompt}”. Work through: what is asked → relevant information → principle/method → application → check. Explain why you chose each step.` },
    { type: "checkpoint", title: "Checkpoint", content: `Close your notes. Explain “${safePrompt}” in five sentences. Then ask what would change if one important condition changed. Mark the exact point where your reasoning breaks.` },
    { type: "misconception", title: "Catch the trap", content: `Find one tempting but incorrect approach to “${safePrompt}”. Explain why it fails and write the corrected rule.` },
    { type: "exam", title: "Exam application", content: `Use a syllabus-appropriate question involving “${safePrompt}”. Identify the command word first, then build the response around what that command word requires.` },
    { type: "mistake", title: "Mistake review", content: `Predict your most likely mistake: definition, method choice, calculation, unit, diagram, interpretation, memory or careless reading. Write one prevention rule beginning “Next time I will…”` },
    { type: "practice", title: "Practice ladder", content: `Do three questions: direct recall, routine application, then an unfamiliar or mixed problem. Commit to each attempt before checking your reference.` },
    { type: "tip", title: "Study tactic", content: `Use retrieval rather than rereading. Hide the material and reconstruct the definition, method and example from memory. Reopen the reference only to correct gaps.` },
    { type: "summary", title: "Mastery check", content: `Move on when you can explain “${safePrompt}”, choose the right method without prompting, solve a fresh application, and explain a common mistake. Otherwise revisit only the weak part.` },
  ];
  return { id: idFor(safeSubject, safePrompt), title, blocks };
}
