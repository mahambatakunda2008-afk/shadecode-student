export interface LocalLessonBlock {
  [key: string]: unknown;
  type: string;
  title?: string;
  content: string;
}

export interface LocalLesson { id: string; title: string; blocks: LocalLessonBlock[]; }
function clean(value: string) { return value.trim().replace(/\s+/g, " "); }
function idFor(subject: string, prompt: string) {
  const seed = `${subject}:${prompt}`.toLowerCase(); let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
  return `offline-lesson-${(hash >>> 0).toString(36)}`;
}
function isTrigIdentities(subject: string, prompt: string) {
  return /^(math|maths|mathematics)$/.test(clean(subject).toLowerCase()) && clean(prompt).toLowerCase() === "trigonometric identities";
}
function trigonometricIdentitiesLesson(subject: string, prompt: string): LocalLesson {
  return {
    id: idFor(subject, prompt), title: "Trigonometric identities: transform, prove, simplify", blocks: [
      { type: "objective", title: "Your target", content: "Use fundamental trigonometric identities to transform expressions, prove an identity by working on one side, and choose an efficient identity when simplifying." },
      { type: "prior", title: "Before you start", content: "Know that tan θ = sin θ / cos θ and that sin² θ means (sin θ)². The identities below hold wherever the expressions are defined." },
      { type: "definition", title: "What is an identity?", content: "A trigonometric identity is an equation that is true for every allowed value of the angle, unlike an equation where you normally search for particular solutions." },
      { type: "formula", title: "Core identities", content: "Pythagorean: sin²θ + cos²θ = 1; 1 + tan²θ = sec²θ; 1 + cot²θ = csc²θ. Reciprocal: secθ = 1/cosθ; cscθ = 1/sinθ; cotθ = 1/tanθ. Quotient: tanθ = sinθ/cosθ; cotθ = cosθ/sinθ." },
      { type: "concept", title: "Think in transformations", content: "Look at the expression and ask what form would make it simpler. Fractions may invite reciprocal or quotient identities. A pair such as sin²θ and cos²θ may invite sin²θ + cos²θ = 1. In a proof, transform one side until it equals the other." },
      { type: "example", title: "Worked proof", content: "Given: (1 − sin²θ) / cosθ = cosθ. Method: transform the left side only. Step 1: 1 − sin²θ = cos²θ. Step 2: cos²θ / cosθ = cosθ. Answer: the left side equals the right side, subject to the original denominator being defined." },
      { type: "checkpoint", title: "Pause and choose", content: "Question: How would you simplify 1 + tan²θ? Think: Which identity gives the shortest route? Write the next line before checking your notes." },
      { type: "example", title: "Worked simplification", content: "Given: (1 − cos²θ) / sinθ. Method: match the numerator to a Pythagorean identity. Step 1: 1 − cos²θ = sin²θ. Step 2: sin²θ / sinθ = sinθ when sinθ ≠ 0. Answer: sinθ." },
      { type: "misconception", title: "Common trap", content: "Do not change both sides of an identity proof at the same time. Do not cancel terms across addition. For example, (sin²θ + cos²θ)/sinθ is not sinθ + cosθ." },
      { type: "application", title: "Use it yourself", content: "Question: Simplify (sec²θ − 1) / tanθ without a calculator. Approach: choose an identity that matches the structure, show every transformation, then check restrictions." },
      { type: "exam", title: "Exam transfer", content: "Question: Prove an identity such as (tanθ + cotθ) / tanθ = sec²θ. Approach: rewrite unfamiliar ratios or use a Pythagorean identity. Examiner looks for: valid transformations, clear algebra, and no unexplained jumps." },
      { type: "practice", title: "Progressive practice", content: "1. Simplify 1 − sin²θ.\n2. Simplify (1 − cos²θ)/sinθ.\n3. Prove (tanθ + cotθ)/tanθ = sec²θ.\n4. Prove (sec²θ − 1)/tanθ = tanθ.\nWork independently before checking your method." },
      { type: "summary", title: "Mastery check", content: "Recognise Pythagorean, reciprocal and quotient identities. Choose an identity from the structure of an expression. Transform one side during proofs. Simplify without illegal cancellation. Ask: what form makes the next step simpler?" },
    ],
  };
}

/** Offline-safe study scaffold. It deliberately avoids inventing subject facts when no model is available. */
export function generateLocalLesson(subject: string, prompt: string): LocalLesson {
  const safeSubject = clean(subject) || "your subject";
  const safePrompt = clean(prompt) || "this topic";
  if (isTrigIdentities(safeSubject, safePrompt)) return trigonometricIdentitiesLesson(safeSubject, safePrompt);
  const title = `Offline study session: ${safePrompt.slice(0, 70)}${safePrompt.length > 70 ? "…" : ""}`;
  const blocks: LocalLessonBlock[] = [
    { type: "objective", title: "Target", content: `- Explain ${safePrompt} in your own words\n- Identify what you already know\n- Apply the idea to a fresh question` },
    { type: "prior", title: "Start from what you know", content: `Write 2–3 things you already know about ${safePrompt}. Then write one uncertainty. This offline session uses your reference material for factual checking.` },
    { type: "concept", title: "Build the concept", content: `Use your syllabus or textbook to identify what ${safePrompt} is, what it is used for, and what kind of problem requires it. Do not guess missing facts.` },
    { type: "definition", title: "Key terms", content: `Create a short glossary for ${safePrompt}: term → precise meaning → example from your notes. Keep definitions short enough to reproduce under exam pressure.` },
    { type: "example", title: "Worked example", content: `Choose one representative ${safeSubject} question about ${safePrompt}. Given: information supplied by the question. Method: identify the relevant rule or process from your notes. Step 1: set up the problem. Step 2: apply the method. Answer: check against your reference.` },
    { type: "checkpoint", title: "Checkpoint", content: `Question: Can you explain ${safePrompt} without looking? Think: What would change if one important condition changed? Mark the exact point where your reasoning breaks.` },
    { type: "misconception", title: "Catch the trap", content: `Find one tempting but incorrect approach to ${safePrompt} in your notes or past-paper feedback. Write why it fails and the corrected rule.` },
    { type: "exam", title: "Exam transfer", content: `Question: Find a syllabus-appropriate question involving ${safePrompt}. Approach: identify the command word, select the required knowledge, then build the response. Examiner looks for: the specific points required by the question and clear working where applicable.` },
    { type: "mistake", title: "Mistake review", content: `Predict your likely mistake: definition, method choice, calculation, unit, diagram, interpretation, memory or careless reading. Write one prevention rule beginning “Next time I will…”` },
    { type: "practice", title: "Practice ladder", content: `1. Do a direct-recall question.\n2. Do a routine application question.\n3. Do an unfamiliar or mixed question.\nCommit to each attempt before checking your reference.` },
    { type: "tip", title: "Study tactic", content: `Use retrieval instead of rereading. Hide the material and reconstruct the definition, method and example from memory. Reopen the reference only to correct gaps.` },
    { type: "summary", title: "Mastery check", content: `Move on when you can explain ${safePrompt}, choose a method without prompting, complete a fresh application, and explain a common mistake. If not, revisit only the weak part.` },
  ];
  return { id: idFor(safeSubject, safePrompt), title, blocks };
}

/** True when the device can always create a non-empty offline study experience. */
export function hasLocalLessonFallback(_subject: string, _prompt: string) { return true; }
