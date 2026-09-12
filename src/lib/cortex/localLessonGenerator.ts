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

function quadraticEquations(subject: string, prompt: string): LocalLesson {
  return { id: idFor(subject, prompt), title: "Quadratic equations: solve, factor and interpret", blocks: [
    { type: "objective", title: "Target", content: "- Recognise a quadratic equation\n- Solve by factorisation\n- Use the quadratic formula when factorisation is unsuitable\n- Check solutions in the original equation" },
    { type: "definition", title: "Quadratic", content: "A quadratic equation has the form ax² + bx + c = 0, where a ≠ 0." },
    { type: "formula", title: "Quadratic formula", content: "x = [−b ± √(b² − 4ac)] / (2a)\nDiscriminant: Δ = b² − 4ac" },
    { type: "concept", title: "Choose a method", content: "- Try factorisation when the coefficients make simple factors visible.\n- Use the quadratic formula when factorisation is difficult or impossible over the required number system.\n- Always rearrange into ax² + bx + c = 0 first." },
    { type: "example", title: "Factorisation", content: "Given: x² − 5x + 6 = 0.\nMethod: find two numbers with product 6 and sum −5.\nStep 1: (x − 2)(x − 3) = 0.\nStep 2: x − 2 = 0 or x − 3 = 0.\nAnswer: x = 2 or x = 3." },
    { type: "checkpoint", title: "Checkpoint", content: "Question: What must be true before using the quadratic formula?\nThink: identify a, b and c from the equation in standard form.\nAnswer: the equation must be arranged as ax² + bx + c = 0." },
    { type: "example", title: "Quadratic formula", content: "Given: 2x² + x − 3 = 0.\nMethod: a = 2, b = 1, c = −3.\nStep 1: x = [−1 ± √(1 + 24)]/4.\nStep 2: x = [−1 ± 5]/4.\nAnswer: x = 1 or x = −3/2." },
    { type: "misconception", title: "Common trap", content: "Do not lose the sign of b or c.\nFor 2x² + x − 3, c is −3, so −4ac becomes +24." },
    { type: "application", title: "Discriminant", content: "Question: What does the discriminant tell you?\nApproach: calculate Δ = b² − 4ac.\n- Δ > 0: two distinct real roots.\n- Δ = 0: one repeated real root.\n- Δ < 0: no real roots." },
    { type: "exam", title: "Exam transfer", content: "Question: Solve a quadratic and state the nature of its roots.\nApproach: put it in standard form, choose a method, show working, then interpret Δ when required.\nExaminer looks for: correct algebra and all valid roots." },
    { type: "practice", title: "Practice ladder", content: "1. Solve x² − 7x + 12 = 0.\n2. Solve 2x² − 5x − 3 = 0.\n3. Solve x² + 4x + 1 = 0 using the formula.\n4. Determine the values of k for which x² + kx + 9 = 0 has equal roots." },
    { type: "summary", title: "Mastery check", content: "- Standard form first.\n- Identify a, b and c carefully.\n- Factorise when convenient.\n- Use the formula reliably.\n- Check whether the question asks for the nature of the roots." },
  ] };
}

function differentiation(subject: string, prompt: string): LocalLesson {
  return { id: idFor(subject, prompt), title: "Differentiation: gradient, rules and applications", blocks: [
    { type: "objective", title: "Target", content: "- Understand differentiation as a rate of change\n- Differentiate powers using the power rule\n- Find gradients and stationary points\n- Interpret a derivative in context" },
    { type: "definition", title: "Derivative", content: "The derivative gives the instantaneous rate of change of a function with respect to its variable. Geometrically, it is the gradient of the tangent." },
    { type: "formula", title: "Power rule", content: "If y = ax^n, then dy/dx = anx^(n−1).\nConstant rule: d(c)/dx = 0." },
    { type: "concept", title: "What changes?", content: "- The coefficient is multiplied by the original power.\n- The power decreases by 1.\n- Differentiate each term separately for sums and differences." },
    { type: "example", title: "Worked derivative", content: "Given: y = 3x^4 − 5x² + 7x − 2.\nMethod: differentiate each term.\nStep 1: d(3x^4)/dx = 12x^3.\nStep 2: d(−5x²)/dx = −10x.\nStep 3: d(7x)/dx = 7.\nStep 4: d(−2)/dx = 0.\nAnswer: dy/dx = 12x^3 − 10x + 7." },
    { type: "checkpoint", title: "Checkpoint", content: "Question: What happens to a constant when differentiated?\nThink: a horizontal graph has no change in y.\nAnswer: its derivative is zero." },
    { type: "example", title: "Stationary point", content: "Given: y = x² − 4x + 1.\nMethod: stationary points occur where dy/dx = 0.\nStep 1: dy/dx = 2x − 4.\nStep 2: 2x − 4 = 0 gives x = 2.\nStep 3: y = 4 − 8 + 1 = −3.\nAnswer: stationary point (2, −3)." },
    { type: "misconception", title: "Common trap", content: "Do not differentiate the exponent without multiplying by it.\nFor x^5, the derivative is 5x^4, not x^4." },
    { type: "application", title: "Rate of change", content: "Question: If s = t^3 + 2t, find the velocity.\nApproach: velocity is ds/dt, so differentiate displacement with respect to time." },
    { type: "exam", title: "Exam transfer", content: "Question: Find and interpret a stationary point.\nApproach: differentiate, set the derivative to zero, solve for the variable, substitute back to find the coordinate, then classify if required.\nExaminer looks for: the derivative equation, correct solving and clear interpretation." },
    { type: "practice", title: "Practice ladder", content: "1. Differentiate 5x^3 − 2x + 8.\n2. Find the gradient of y = x^3 − 3x at x = 2.\n3. Find the stationary points of y = x^3 − 3x² + 2.\n4. A particle has s = t^3 − 6t² + 9t. Find when its velocity is zero." },
    { type: "summary", title: "Mastery check", content: "- Power rule: multiply by the power, then reduce the power by one.\n- Constants differentiate to zero.\n- Gradient at x is found by substituting x into dy/dx.\n- Stationary points satisfy dy/dx = 0." },
  ] };
}

function integration(subject: string, prompt: string): LocalLesson {
  return { id: idFor(subject, prompt), title: "Integration: reverse differentiation and area", blocks: [
    { type: "objective", title: "Target", content: "- Integrate powers using the reverse power rule\n- Include the constant of integration\n- Use a given point to find the constant\n- Connect integration with area under a curve" },
    { type: "definition", title: "Indefinite integral", content: "Integration finds a family of functions whose derivative is the given function." },
    { type: "formula", title: "Power rule", content: "∫ ax^n dx = a x^(n+1)/(n+1) + C, for n ≠ −1.\n∫ 1/x dx = ln|x| + C." },
    { type: "concept", title: "Reverse the derivative", content: "- Increase the power by 1.\n- Divide by the new power.\n- Integrate each term separately.\n- Add C for an indefinite integral." },
    { type: "example", title: "Worked integral", content: "Given: ∫(6x² − 4x + 5) dx.\nMethod: apply the power rule term by term.\nStep 1: ∫6x² dx = 2x³.\nStep 2: ∫−4x dx = −2x².\nStep 3: ∫5 dx = 5x.\nAnswer: 2x³ − 2x² + 5x + C." },
    { type: "checkpoint", title: "Checkpoint", content: "Question: Why is +C required for an indefinite integral?\nThink: many functions have the same derivative.\nAnswer: differentiation removes constants, so integration must allow any constant." },
    { type: "example", title: "Find the constant", content: "Given: dy/dx = 6x + 2 and y = 5 when x = 1.\nMethod: integrate, then use the point.\nStep 1: y = 3x² + 2x + C.\nStep 2: 5 = 3 + 2 + C.\nAnswer: C = 0, so y = 3x² + 2x." },
    { type: "misconception", title: "Common trap", content: "Do not forget to divide by the new power.\n∫x^4 dx is x^5/5 + C, not x^5 + C." },
    { type: "application", title: "Area", content: "Question: Find the area under y = f(x) between x = a and x = b.\nApproach: find an antiderivative F(x), then evaluate F(b) − F(a)." },
    { type: "exam", title: "Exam transfer", content: "Question: Integrate a function and use a condition to determine C.\nApproach: integrate first, substitute the given coordinate, solve for C, then state the final function.\nExaminer looks for: correct antiderivative and accurate use of the condition." },
    { type: "practice", title: "Practice ladder", content: "1. Integrate 4x³ − 2x.\n2. Find y if dy/dx = 8x − 3 and y = 4 at x = 1.\n3. Find the area under y = x² from x = 1 to x = 3.\n4. Differentiate your final answer to check it." },
    { type: "summary", title: "Mastery check", content: "- Increase the power and divide by it.\n- Add C for indefinite integrals.\n- Use a known point to determine C.\n- For definite area, evaluate the antiderivative at the limits." },
  ] };
}

function genericLesson(subject: string, prompt: string): LocalLesson {
  return { id: idFor(subject, prompt), title: `${prompt}: guided lesson`, blocks: [
    { type: "objective", title: "Target", content: `- Identify the core idea of ${prompt}\n- Understand the key terms and rules\n- Work through an example\n- Apply the idea to a fresh question` },
    { type: "prior", title: "Prerequisites", content: `Before ${prompt}, make sure you can recall the prerequisite definitions, symbols, rules and operations required by your selected curriculum.` },
    { type: "concept", title: "Core idea", content: `${prompt} should be learned as a sequence: definition → rule or principle → worked reasoning → application. The local engine will use verified curriculum context or an installed local model when available.` },
    { type: "definition", title: "Key terms", content: `Build the vocabulary for ${prompt} from the verified curriculum context. Keep each definition short and precise: term → meaning → example.` },
    { type: "example", title: "Worked example", content: `Given: a verified question about ${prompt}.\nMethod: identify the exact rule or principle required.\nStep 1: extract the information that matters.\nStep 2: apply the rule in small steps.\nStep 3: check the result against the conditions.\nAnswer: state the result and the reason it is valid.` },
    { type: "checkpoint", title: "Checkpoint", content: `Question: Can you explain ${prompt} without looking?\nThink: Which definition, rule or step would you be least confident reproducing?` },
    { type: "misconception", title: "Trap check", content: `A reliable local lesson must use verified subject content rather than inventing facts. When a curriculum pack is available, compare the common mistake against its exact objective and wording.` },
    { type: "exam", title: "Exam transfer", content: `Question: Apply ${prompt} to a verified syllabus question.\nApproach: identify the command word, required knowledge, method and expected final response.\nExaminer looks for: the syllabus-required knowledge, valid reasoning and clear working where applicable.` },
    { type: "practice", title: "Practice ladder", content: `1. Recall the definition or rule for ${prompt}.\n2. Complete a routine application.\n3. Complete an unfamiliar application.\n4. Complete a timed syllabus question.` },
    { type: "summary", title: "Mastery check", content: `You are ready to move on from ${prompt} when you can explain the idea, select a method without prompting, complete a fresh application and diagnose a common mistake.` },
  ] };
}

export function generateLocalLesson(subject: string, prompt: string): LocalLesson {
  const safeSubject = clean(subject) || "your subject";
  const safePrompt = clean(prompt) || "this topic";
  const topic = safePrompt.toLowerCase();
  if (isMath(safeSubject) && /binomial expansion|binomial theorem/.test(topic)) return binomialExpansion(safeSubject, safePrompt);
  if (isMath(safeSubject) && /trigonometric identities?/.test(topic)) return trigonometricIdentities(safeSubject, safePrompt);
  if (isMath(safeSubject) && /quadratic equations?|quadratics?/.test(topic)) return quadraticEquations(safeSubject, safePrompt);
  if (isMath(safeSubject) && /differentiat|derivative|gradient of a curve|stationary point/.test(topic)) return differentiation(safeSubject, safePrompt);
  if (isMath(safeSubject) && /integrat|integration|area under (a|the) curve/.test(topic)) return integration(safeSubject, safePrompt);
  return genericLesson(safeSubject, safePrompt);
}

export function hasLocalLessonFallback(_subject: string, _prompt: string) { return true; }
