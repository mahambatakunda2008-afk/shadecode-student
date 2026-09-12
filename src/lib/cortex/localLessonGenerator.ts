export interface LocalLessonBlock { [key: string]: unknown; type: string; title?: string; content: string; }
export interface LocalLesson { id: string; title: string; blocks: LocalLessonBlock[]; }

function clean(value: string) { return value.trim().replace(/\s+/g, " "); }
function idFor(subject: string, prompt: string) {
  const seed = `${subject}:${prompt}`.toLowerCase(); let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
  return `offline-lesson-${(hash >>> 0).toString(36)}`;
}
function isMath(subject: string) { return /^(math|maths|mathematics)$/.test(clean(subject).toLowerCase()); }

function binomialExpansion(subject: string, prompt: string): LocalLesson {
  return { id: idFor(subject, prompt), title: "Binomial expansion: terms, coefficients and the general term", blocks: [
    { type: "objective", title: "Target", content: "- Expand a binomial using the binomial theorem\n- Find a specified term\n- Find a coefficient of a specified power\n- Use the general term accurately" },
    { type: "prior", title: "Prerequisites", content: "- Powers and indices\n- Factorials\n- Combinations: nCr = n! / [r!(n − r)!]\n- Algebraic multiplication" },
    { type: "definition", title: "Binomial", content: "A binomial is an algebraic expression with two terms, for example (x + 2) or (2x − 3)." },
    { type: "formula", title: "The theorem", content: "(a + b)^n = Σ(r=0 to n) nCr a^(n−r)b^r\nGeneral term: T(r+1) = nCr a^(n−r)b^r" },
    { type: "concept", title: "Pattern to remember", content: "- The power of the first term decreases by 1 each term.\n- The power of the second term increases by 1 each term.\n- The two powers always add to n.\n- The coefficients are the n-th row of Pascal's triangle." },
    { type: "example", title: "Worked expansion", content: "Given: Expand (x + 2)^4.\nMethod: coefficients are 1, 4, 6, 4, 1.\nStep 1: x^4\nStep 2: 4x^3(2) = 8x^3\nStep 3: 6x^2(2^2) = 24x^2\nStep 4: 4x(2^3) = 32x\nStep 5: 2^4 = 16\nAnswer: x^4 + 8x^3 + 24x^2 + 32x + 16." },
    { type: "checkpoint", title: "Checkpoint", content: "Question: What is r for the fourth term?\nThink: T(r+1) means the term number is one greater than r.\nAnswer: r = 3." },
    { type: "example", title: "Find a specified term", content: "Given: Find the fourth term of (2x + 3)^5.\nMethod: use T(r+1) with r = 3.\nStep 1: T4 = 5C3(2x)^2(3)^3\nStep 2: 5C3 = 10, (2x)^2 = 4x^2 and 3^3 = 27\nStep 3: T4 = 10 × 4x^2 × 27\nAnswer: 1080x^2." },
    { type: "misconception", title: "Common trap", content: "For the fourth term, do not use 5C4.\nThe fourth term has r = 3 because the general term is T(r+1).\nAlso check the sign when the second term is negative." },
    { type: "application", title: "Coefficient question", content: "Question: Find the coefficient of x^3 in (2x − 1)^5.\nApproach: write the general term, identify which term produces x^3, then evaluate only its coefficient." },
    { type: "exam", title: "Exam transfer", content: "Question: Find a specified term or coefficient.\nApproach: identify n, convert the requested term number into r, write T(r+1), then match the required power.\nExaminer looks for: correct term number, correct nCr and accurate algebra." },
    { type: "practice", title: "Practice ladder", content: "1. Expand (x + 3)^3.\n2. Expand (2x − 1)^4.\n3. Find the sixth term of (x + 2)^7.\n4. Find the coefficient of x^4 in (3x − 2)^6." },
    { type: "summary", title: "Mastery check", content: "- Write the general term when a specific term is requested.\n- Remember: fourth term → r = 3.\n- Check powers add to n.\n- Check signs carefully.\n- For a coefficient, match the required power before calculating." },
  ] };
}

function trigonometricIdentities(subject: string, prompt: string): LocalLesson {
  return { id: idFor(subject, prompt), title: "Trigonometric identities: transform, prove, simplify", blocks: [
    { type: "objective", title: "Target", content: "- Recognise core trigonometric identities\n- Transform expressions into useful forms\n- Prove identities one side at a time\n- Simplify without illegal cancellation" },
    { type: "prior", title: "Prerequisites", content: "- tan θ = sin θ / cos θ\n- sin²θ means (sin θ)²\n- Denominators cannot be zero" },
    { type: "definition", title: "Identity", content: "A trigonometric identity is an equation that is true for every allowed value of the angle." },
    { type: "formula", title: "Core identities", content: "sin²θ + cos²θ = 1\n1 + tan²θ = sec²θ\n1 + cot²θ = csc²θ\ntanθ = sinθ/cosθ\ncotθ = cosθ/sinθ\nsecθ = 1/cosθ\ncscθ = 1/sinθ" },
    { type: "concept", title: "Choose the useful form", content: "- Match the structure of the expression to an identity.\n- sin²θ and cos²θ together suggest sin²θ + cos²θ = 1.\n- In a proof, normally transform one side until it equals the other." },
    { type: "example", title: "Worked proof", content: "Given: (1 − sin²θ) / cosθ = cosθ.\nMethod: transform the left side only.\nStep 1: 1 − sin²θ = cos²θ.\nStep 2: cos²θ / cosθ = cosθ.\nAnswer: the two sides are equal where the original expression is defined." },
    { type: "checkpoint", title: "Checkpoint", content: "Question: Which identity changes 1 + tan²θ into one function?\nThink: Match the exact structure before manipulating it.\nAnswer: 1 + tan²θ = sec²θ." },
    { type: "example", title: "Worked simplification", content: "Given: (1 − cos²θ) / sinθ.\nMethod: use the Pythagorean identity.\nStep 1: 1 − cos²θ = sin²θ.\nStep 2: sin²θ / sinθ = sinθ.\nAnswer: sinθ, where sinθ ≠ 0." },
    { type: "misconception", title: "Common trap", content: "Do not cancel across addition.\nFor example, (sin²θ + cos²θ)/sinθ is not sinθ + cosθ." },
    { type: "application", title: "Try it", content: "Question: Simplify (sec²θ − 1) / tanθ.\nApproach: replace sec²θ − 1 using a Pythagorean identity, then simplify." },
    { type: "exam", title: "Exam transfer", content: "Question: Prove (tanθ + cotθ) / tanθ = sec²θ.\nApproach: rewrite ratios carefully and show each algebraic transformation.\nExaminer looks for: valid transformations and clear working." },
    { type: "practice", title: "Practice ladder", content: "1. Simplify 1 − sin²θ.\n2. Simplify (1 − cos²θ)/sinθ.\n3. Prove (tanθ + cotθ)/tanθ = sec²θ.\n4. Prove (sec²θ − 1)/tanθ = tanθ." },
    { type: "summary", title: "Mastery check", content: "- Recognise the identity from the structure.\n- Transform one side in a proof.\n- Show the algebra instead of jumping to the answer.\n- Check restrictions caused by denominators." },
  ] };
}

export function generateLocalLesson(subject: string, prompt: string): LocalLesson {
  const safeSubject = clean(subject) || "your subject";
  const safePrompt = clean(prompt) || "this topic";
  const topic = safePrompt.toLowerCase();
  if (isMath(safeSubject) && /binomial expansion|binomial theorem/.test(topic)) return binomialExpansion(safeSubject, safePrompt);
  if (isMath(safeSubject) && /trigonometric identities?/.test(topic)) return trigonometricIdentities(safeSubject, safePrompt);
  return { id: idFor(safeSubject, safePrompt), title: safePrompt, blocks: [
    { type: "objective", title: "Target", content: `- Understand the core idea of ${safePrompt}\n- Identify the required rule or process\n- Apply it to a fresh question` },
    { type: "prior", title: "Prerequisites", content: "List the facts and skills you already know. Mark the ones you cannot recall." },
    { type: "concept", title: "Core idea", content: `Use the cached verified curriculum and your saved reference material to identify the core idea of ${safePrompt}. This deterministic offline path does not invent subject facts.` },
    { type: "definition", title: "Key terms", content: "Write the three most important terms as: term → precise meaning → short example." },
    { type: "example", title: "Worked example", content: "Given: write the information supplied by a reference question.\nMethod: name the relevant rule from the reference.\nStep 1: set up the problem.\nStep 2: apply the rule.\nAnswer: check against the reference." },
    { type: "checkpoint", title: "Checkpoint", content: `Question: Can you explain ${safePrompt} without looking?\nThink: Which step would fail first if the conditions changed?` },
    { type: "misconception", title: "Trap check", content: `Find one incorrect approach to ${safePrompt} in your notes or past-paper feedback. State why it fails and the corrected rule.` },
    { type: "exam", title: "Exam transfer", content: `Question: Choose a verified syllabus question involving ${safePrompt}.\nApproach: identify the command word, required knowledge and expected working.\nExaminer looks for: the specific points required by the question and clear reasoning.` },
    { type: "practice", title: "Practice ladder", content: "1. Direct recall.\n2. Routine application.\n3. Unfamiliar application.\n4. Timed exam-style question." },
    { type: "summary", title: "Mastery check", content: `Move on when you can explain ${safePrompt}, select a method without prompting, complete a fresh application and explain a common mistake.` },
  ] };
}

export function hasLocalLessonFallback(_subject: string, _prompt: string) { return true; }
