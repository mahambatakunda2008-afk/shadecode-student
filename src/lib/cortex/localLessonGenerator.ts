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

function isTrigIdentities(subject: string, prompt: string) {
  const s = clean(subject).toLowerCase();
  const p = clean(prompt).toLowerCase();
  return /^(math|maths|mathematics)$/.test(s) && p === "trigonometric identities";
}

function trigonometricIdentitiesLesson(subject: string, prompt: string): LocalLesson {
  return {
    id: idFor(subject, prompt),
    title: "Trigonometric identities: transform, prove, simplify",
    blocks: [
      { type: "objective", title: "Your target", content: "By the end, you should be able to use fundamental trigonometric identities to transform expressions, prove an identity by working on one side, and choose an efficient identity when simplifying." },
      { type: "prior", title: "Before you start", content: "You need to know that sin θ, cos θ and tan θ are related by tan θ = sin θ / cos θ, and that sin² θ means (sin θ)². The identities below are true for every angle for which the expressions are defined." },
      { type: "definition", title: "What is an identity?", content: "A trigonometric identity is an equation that is true for every allowed value of the angle. That makes an identity different from an ordinary equation, where you normally search for particular values of the unknown." },
      { type: "formula", title: "The core identities", content: "The Pythagorean identities are: sin²θ + cos²θ = 1; 1 + tan²θ = sec²θ; 1 + cot²θ = csc²θ. Reciprocal relationships include secθ = 1/cosθ, cscθ = 1/sinθ and cotθ = 1/tanθ. Quotient relationships include tanθ = sinθ/cosθ and cotθ = cosθ/sinθ. These identities let you replace one form with another without changing the value." },
      { type: "concept", title: "Think in transformations", content: "The key skill is not memorising a long list. Look at the expression you have and ask what form would make it simpler. A fraction may invite a reciprocal or quotient identity. A pair such as sin²θ and cos²θ may invite sin²θ + cos²θ = 1. If proving an identity, transform one side until it becomes exactly the other side." },
      { type: "example", title: "Worked proof: one side only", content: "Prove that (1 − sin²θ) / cosθ = cosθ. Start with the left side: (1 − sin²θ) / cosθ. Use sin²θ + cos²θ = 1, so 1 − sin²θ = cos²θ. Therefore the expression becomes cos²θ / cosθ. Cancel one factor of cosθ, giving cosθ. This is the right-hand side. The identity is proved, subject to the original denominator being defined. Notice that only the left side was changed." },
      { type: "checkpoint", title: "Pause and choose", content: "Pause before reading further. How would you simplify 1 + tan²θ? Which identity gives you the shortest route? Write the next line yourself before checking your notes." },
      { type: "example", title: "Worked simplification: choose the identity", content: "Simplify (1 − cos²θ) / sinθ. The numerator contains 1 − cos²θ, so use sin²θ + cos²θ = 1 to replace it with sin²θ. The expression becomes sin²θ / sinθ, which simplifies to sinθ when sinθ is non-zero. The important move was recognising the Pythagorean identity from the structure of the numerator." },
      { type: "misconception", title: "Common trap", content: "Do not change both sides of an identity proof at the same time. That can hide an invalid step because you may accidentally make two expressions look alike without showing that one genuinely transforms into the other. Also do not cancel terms across addition: (sin²θ + cos²θ)/sinθ is not equal to sinθ + cosθ." },
      { type: "application", title: "Use it yourself", content: "Task: simplify (sec²θ − 1) / tanθ without using a calculator. Success criteria: choose an identity that matches the structure, show every algebraic transformation, and finish with an expression containing only one basic trigonometric ratio. Do not start by expanding randomly." },
      { type: "exam", title: "Exam transfer", content: "A typical identity question may ask you to prove an equation such as (tanθ + cotθ) / tanθ = sec²θ. Treat it as a transformation problem: rewrite unfamiliar ratios using sin and cos or use a Pythagorean identity when the structure suggests it. State each identity or algebraic operation clearly enough that another student can follow your chain." },
      { type: "practice", title: "Progressive practice", content: "1. Simplify 1 − sin²θ. Answer guidance: identify the Pythagorean identity.\n2. Simplify (1 − cos²θ)/sinθ. Answer guidance: replace the numerator first, then cancel carefully.\n3. Prove that (tanθ + cotθ) / tanθ = sec²θ. Answer guidance: rewrite cotθ as 1/tanθ or rewrite everything in sin and cos, then simplify.\n4. Prove that (sec²θ − 1) / tanθ = tanθ. Answer guidance: use the Pythagorean identity involving tan²θ and sec²θ, then check domain restrictions." },
      { type: "summary", title: "What you should now be able to do", content: "You should now be able to recognise the three Pythagorean identities, use reciprocal and quotient relationships, choose an identity from the structure of an expression, prove an identity by transforming one side, and simplify without cancelling illegally. The strategic question is always: what form will make the next step simpler?" },
    ],
  };
}

/** Honest offline fallback: it creates a structured study session without inventing subject facts. */
export function generateLocalLesson(subject: string, prompt: string): LocalLesson {
  const safeSubject = clean(subject) || "your subject";
  const safePrompt = clean(prompt);
  if (isTrigIdentities(safeSubject, safePrompt)) return trigonometricIdentitiesLesson(safeSubject, safePrompt);
  const title = `${safePrompt.slice(0, 70)}${safePrompt.length > 70 ? "…" : ""}`;
  const blocks: LocalLessonBlock[] = [
    { type: "objective", title: "Target", content: `- Explain "${safePrompt}" in your own words\n- Identify what you already know about it\n- Apply it to one fresh example` },
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

export function hasHighQualityLocalLesson(subject: string, prompt: string) {
  return isTrigIdentities(subject, prompt);
}
