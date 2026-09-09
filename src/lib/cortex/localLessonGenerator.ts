export interface LocalLessonBlock {
  type: string;
  title?: string;
  content: string;
}

export interface LocalLesson {
  id: string;
  title: string;
  blocks: LocalLessonBlock[];
}

function clean(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function idFor(subject: string, prompt: string) {
  const seed = `${subject}:${prompt}`.toLowerCase();
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
  return `offline-lesson-${(hash >>> 0).toString(36)}`;
}

/**
 * A deliberately honest offline lesson generator. It never invents subject facts.
 * Instead, it turns the learner's exact request into a structured active-learning
 * session that can be completed without a network connection. Cached lessons and
 * curriculum packs remain the source of factual content when available.
 */
export function generateLocalLesson(subject: string, prompt: string): LocalLesson {
  const safeSubject = clean(subject) || "your subject";
  const safePrompt = clean(prompt);
  const title = `${safePrompt.slice(0, 70)}${safePrompt.length > 70 ? "…" : ""}`;

  const blocks: LocalLessonBlock[] = [
    { type: "objective", title: "Target", content: `By the end of this session, you should be able to explain the main idea behind “${safePrompt}”, identify what you already know, and solve or explain a new example without copying a worked answer.` },
    { type: "prior", title: "Start from what you know", content: `Before looking anything up, write 2–3 things you already know about “${safePrompt}”. Then write one part that feels uncertain. Do not worry about being wrong. That uncertainty is useful evidence for the next study step.` },
    { type: "concept", title: "Build the concept", content: `Focus on “${safePrompt}” as a ${safeSubject} problem. Describe it in your own words: what is it, what is it used for, and what kind of question would require it? If you have a downloaded textbook, syllabus pack, or past-paper material on this device, use it here as the factual reference.` },
    { type: "definition", title: "Key terms", content: `Create a short glossary for “${safePrompt}”. For every unfamiliar term, write: term → precise meaning → one example. Keep definitions short enough that you could reproduce them in an exam.` },
    { type: "example", title: "Worked example", content: `Choose one representative ${safeSubject} question about “${safePrompt}”. Work it in this order: (1) identify what is being asked, (2) list the relevant information, (3) choose the principle, rule, formula or method, (4) substitute or apply it carefully, (5) check the result and units or reasoning. Write the reason for each step, not only the operation.` },
    { type: "checkpoint", title: "Checkpoint", content: `Close your notes. Explain “${safePrompt}” aloud or on paper in five sentences. Then answer: What would change if one important condition in the problem changed? If you cannot answer, mark the exact step where your understanding breaks.` },
    { type: "misconception", title: "Catch the trap", content: `Find one tempting but incorrect way to approach “${safePrompt}”. Explain why it fails, then write the corrected rule. This turns an error into reusable exam evidence instead of simply marking it wrong.` },
    { type: "exam", title: "Exam application", content: `Take a syllabus-appropriate question involving “${safePrompt}”. Before solving, underline command words such as explain, calculate, determine, compare or describe. Build your response around the evidence the command word requires, and show enough reasoning for another person to award the marks.` },
    { type: "mistake", title: "Mistake review", content: `Predict your most likely mistake on “${safePrompt}”. Is it a definition, method choice, algebra/calculation, unit, diagram, interpretation, memory or careless-reading error? Write one prevention rule beginning with “Next time I will…”.` },
    { type: "practice", title: "Practice ladder", content: `Do three questions in order: A) a direct recall or identification question, B) a routine application, C) an unfamiliar or mixed problem involving “${safePrompt}”. Do not reveal the answer to yourself until you have committed to an attempt.` },
    { type: "tip", title: "Study tactic", content: `Use retrieval rather than rereading. After a short review, hide the material and reconstruct the definition, method and one example from memory. Reopen the reference only to correct gaps. Record those gaps so the next session starts where your memory is weakest.` },
    { type: "summary", title: "Mastery check", content: `You are ready to move on when you can explain “${safePrompt}” clearly, choose the correct method without prompting, complete a fresh application, and explain one common mistake. If one of those fails, revisit that specific step instead of restarting the whole topic.` },
  ];

  return { id: idFor(safeSubject, safePrompt), title, blocks };
}
