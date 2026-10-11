import type { LessonQualityBlock } from "./lessonQuality";

type FallbackLesson = { title: string; blocks: LessonQualityBlock[] };

/**
 * Last-resort, hand-authored lessons used only when every AI provider in the
 * chain fails (a real, observed event -- see production logs for Gemini
 * 503/429 and provider-chain-exhausted errors). This is deliberately a small,
 * curated set of high-traffic foundational topics, not a general offline
 * lesson generator: writing genuine teaching content for every syllabus topic
 * by hand isn't something to fake coverage of. Keyed by normalized
 * "subject|topic" so it's cheap to keep adding entries over time without
 * restructuring callers.
 */
const FALLBACK_LESSONS: Record<string, FallbackLesson> = {
  "mathematics|trigonometric identities": {
    title: "Trigonometric identities: transform, prove, simplify",
    blocks: [
      { type: "objective", title: "Your target", content: "By the end, you should be able to use fundamental trigonometric identities to transform expressions, prove an identity by working on one side, and choose an efficient identity when simplifying." },
      { type: "prior", title: "Before you start", content: "You need to know that tan θ = sin θ / cos θ and that sin²θ means (sin θ)². The identities below hold for every angle for which the expressions are defined." },
      { type: "definition", title: "What is an identity?", content: "A trigonometric identity is an equation that is true for every allowed value of the angle. This differs from an ordinary equation, where you usually find particular values that make the statement true." },
      { type: "formula", title: "The core identities", content: "Pythagorean identities: sin²θ + cos²θ = 1; 1 + tan²θ = sec²θ; 1 + cot²θ = csc²θ. Reciprocal relationships: secθ = 1/cosθ, cscθ = 1/sinθ, cotθ = 1/tanθ. Quotient relationships: tanθ = sinθ/cosθ and cotθ = cosθ/sinθ. These let you replace one form with another without changing its value." },
      { type: "concept", title: "Think in transformations", content: "Do not treat identities as a list to deploy randomly. Inspect the expression and ask what form would make the next step simpler. A numerator such as 1 − sin²θ suggests cos²θ. A term 1 + tan²θ suggests sec²θ. In a proof, transform one side until it becomes exactly the other side." },
      { type: "example", title: "Worked proof: one side only", content: "Prove that (1 − sin²θ) / cosθ = cosθ.\nStep 1: Start with the left side, (1 − sin²θ) / cosθ.\nStep 2: Use sin²θ + cos²θ = 1, so 1 − sin²θ = cos²θ.\nStep 3: Substitute: (1 − sin²θ)/cosθ becomes cos²θ/cosθ.\nStep 4: Simplify cos²θ/cosθ = cosθ, provided the original denominator is defined.\nOnly the left side was transformed, so every step preserves equality." },
      { type: "checkpoint", title: "Pause and choose", content: "Pause before reading further. How would you simplify 1 + tan²θ? Which identity gives the shortest route? Write the next line yourself before checking your notes." },
      { type: "example", title: "Worked simplification: spot the structure", content: "Simplify (1 − cos²θ) / sinθ.\nStep 1: Look at the numerator, 1 − cos²θ.\nStep 2: Match it to the rearranged Pythagorean identity: 1 − cos²θ = sin²θ.\nStep 3: Substitute: the expression becomes sin²θ/sinθ.\nStep 4: Cancel one factor of sinθ (valid when sinθ is non-zero) to get sinθ.\nThe important step was choosing the identity from the structure instead of expanding blindly." },
      { type: "misconception", title: "Common traps", content: "Do not change both sides of an identity proof at the same time, because that can hide an invalid step. Do not cancel terms across addition: (sin²θ + cos²θ)/sinθ is not sinθ + cosθ. Also check denominator restrictions before cancelling a factor." },
      { type: "application", title: "Use it yourself", content: "Task: simplify (sec²θ − 1) / tanθ without a calculator. Success criteria: identify the matching identity, show each transformation, simplify to one basic trigonometric ratio, and state any restriction created by a denominator. Do not expand randomly." },
      { type: "exam", title: "Exam transfer", content: "For an identity-proof question, write a clear chain of equivalent expressions and state the identity used when it matters. For example, if asked to prove an expression involving tanθ and cotθ equals sec²θ, decide whether reciprocal relationships or rewriting in sin and cos gives the cleaner route. Treat an invented practice question as practice, not as an official past-paper question." },
      { type: "practice", title: "Progressive practice", content: "1. Simplify 1 − sin²θ. Answer guidance: identify the Pythagorean identity.\n2. Simplify (1 − cos²θ)/sinθ. Answer guidance: replace the numerator first, then cancel carefully.\n3. Prove that (tanθ + cotθ)/tanθ = sec²θ. Answer guidance: rewrite cotθ as 1/tanθ, then simplify.\n4. Prove that (sec²θ − 1)/tanθ = tanθ. Answer guidance: use the identity connecting tan²θ and sec²θ, then check the domain." },
      { type: "summary", title: "Master the strategy", content: "You should now be able to recognise the Pythagorean identities, use reciprocal and quotient relationships, select an identity from the structure of an expression, prove an identity by transforming one side, and avoid illegal cancellation. The strategic question is: what form will make the next step simpler?" },
    ],
  },
  "computer science|binary number systems": {
    title: "Binary number systems: counting, converting, and why computers use them",
    blocks: [
      { type: "objective", title: "Your target", content: "By the end, you should be able to convert between binary and denary, explain why computers use binary internally, and add two binary numbers by hand." },
      { type: "prior", title: "Before you start", content: "You need to know what a denary (base 10) place value system is: each column is worth ten times the column to its right (units, tens, hundreds)." },
      { type: "concept", title: "Why base 2?", content: "A computer's basic circuits are transistors, which are most reliably built as two-state switches: off or on. Representing off as 0 and on as 1 makes binary (base 2) the natural counting system for hardware, even though it takes more digits than denary to write the same number." },
      { type: "definition", title: "Place value in binary", content: "In binary, each column is worth twice the column to its right: 128, 64, 32, 16, 8, 4, 2, 1 (reading left to right for an 8-bit number), instead of denary's 100s, 10s, 1s." },
      { type: "example", title: "Worked conversion: binary to denary", content: "Convert 1011 0110 to denary.\nStep 1: Write the place values above each bit: 128 64 32 16 8 4 2 1.\nStep 2: Mark which columns have a 1: 128, 32, 16, 4, and 2.\nStep 3: Add those place values: 128 + 32 + 16 + 4 + 2 = 182.\nSo 1011 0110 in binary equals 182 in denary." },
      { type: "example", title: "Worked conversion: denary to binary", content: "Convert 91 to binary.\nStep 1: Find the largest place value that fits: 64 fits (91 − 64 = 27).\nStep 2: 32 does not fit into 27, so that column is 0.\nStep 3: 16 fits (27 − 16 = 11); 8 fits (11 − 8 = 3).\nStep 4: 4 does not fit into 3, so 0; 2 fits (3 − 2 = 1); 1 fits (1 − 1 = 0).\nReading the columns used gives 0101 1011, so 91 = 0101 1011 as an 8-bit number." },
      { type: "checkpoint", title: "Pause and check", content: "Before continuing: what is 0000 1111 in denary? Work it out using the place-value method above, then check your answer sums to 15." },
      { type: "formula", title: "Binary addition", content: "Binary addition follows the same column-by-column method as denary addition, but carries at 2 instead of 10: 0+0=0, 0+1=1, 1+1=10 (write 0, carry 1), 1+1+1(carry)=11 (write 1, carry 1)." },
      { type: "example", title: "Worked example: binary addition", content: "Add 0110 1011 and 0001 0110. Working right to left: 1+0=1; 1+1=10, write 0 carry 1; 0+1+1(carry)=10, write 0 carry 1; 1+0+1(carry)=10, write 0 carry 1; 0+1+1(carry)=10, write 0 carry 1; 1+0+1(carry)=10, write 0 carry 1; 1+0+1(carry)=10, write 0 carry 1; 0+0+1(carry)=1. Result: 1000 0001, and there's a leftover carry, so on an 8-bit system this would be flagged as an overflow." },
      { type: "misconception", title: "Common traps", content: "Don't assume more bits always means a bigger number without checking the actual bit pattern — 0111 1111 (127) is smaller than 1000 0000 (128) even though it has more 1s. Also remember that 8-bit binary addition can overflow (produce a carry beyond the last column), which is a real limitation, not an error in your method." },
      { type: "exam", title: "Exam transfer", content: "Show your place-value working explicitly when converting — most mark schemes award marks for correct method even if the final digit is wrong. For addition questions, line up the columns carefully and mark every carry so an examiner can follow your working." },
      { type: "practice", title: "Progressive practice", content: "1. Convert 0101 0101 to denary. Answer guidance: sum the place values under each 1.\n2. Convert 200 to 8-bit binary. Answer guidance: work from the largest place value (128) downward.\n3. Add 0011 1100 and 0000 1111 in binary. Answer guidance: work column by column from the right, tracking carries.\n4. Explain why an 8-bit register cannot store 300 in binary. Answer guidance: state the maximum value 8 bits can represent." },
      { type: "summary", title: "Master the strategy", content: "You should now be able to convert between binary and denary using place values, add binary numbers with correct carrying, and explain why computer hardware uses base 2 rather than base 10." },
    ],
  },
  "physics|newtons laws of motion": {
    title: "Newton's laws of motion: inertia, force, and reaction",
    blocks: [
      { type: "objective", title: "Your target", content: "By the end, you should be able to state Newton's three laws, apply F = ma to calculate force, mass or acceleration, and identify action-reaction pairs." },
      { type: "prior", title: "Before you start", content: "You need to know that velocity is speed in a given direction, and that acceleration is the rate of change of velocity." },
      { type: "concept", title: "First law: inertia", content: "An object stays at rest, or keeps moving at constant velocity in a straight line, unless a resultant (unbalanced) force acts on it. This tendency to resist a change in motion is called inertia, and it's larger for objects with more mass." },
      { type: "formula", title: "Second law: F = ma", content: "The resultant force on an object equals its mass multiplied by its acceleration: F = ma, where F is in newtons (N), m is in kilograms (kg), and a is in metres per second squared (m/s²). Rearranged: a = F/m, or m = F/a." },
      { type: "example", title: "Worked example: finding acceleration", content: "A resultant force of 40 N acts on a 8 kg trolley. Find its acceleration.\nStep 1: Start with F = ma.\nStep 2: Rearrange to a = F/m.\nStep 3: Substitute values: a = 40/8.\nStep 4: Calculate: a = 5 m/s².\nThe trolley accelerates at 5 m/s² in the direction of the resultant force." },
      { type: "checkpoint", title: "Pause and check", content: "Before continuing: a 2 kg object accelerates at 3 m/s². What resultant force is acting on it? Work it out using F = ma, then check your answer is 6 N." },
      { type: "concept", title: "Third law: action and reaction", content: "When object A exerts a force on object B, object B exerts an equal and opposite force on object A, at the same instant. These two forces act on different objects, so they never cancel each other out." },
      { type: "example", title: "Worked example: identifying pairs", content: "A book rests on a table.\nStep 1: Identify force one: the book pushes down on the table (weight, due to gravity pulling the book down).\nStep 2: Identify force two: the table pushes up on the book (normal contact force) with equal magnitude.\nStep 3: Check they act on different objects: book-on-table and table-on-book.\nThese two forces are a genuine Newton's-third-law pair because they act on different objects and are the same type of interaction reversed." },
      { type: "misconception", title: "Common traps", content: "A very common error is pairing an object's weight with the normal contact force acting on the SAME object — these are not a Newton's-third-law pair because they act on the same object, not on two different interacting objects, even though they happen to be equal in size when the object isn't accelerating vertically. Also, resultant force means the overall unbalanced force after combining all forces, not any single applied force." },
      { type: "exam", title: "Exam transfer", content: "When asked to identify an action-reaction pair, always name both objects involved and check the forces act on different objects. When calculating with F = ma, state your rearranged formula before substituting numbers, and always include correct units in your final answer." },
      { type: "practice", title: "Progressive practice", content: "1. Calculate the force needed to accelerate a 1200 kg car at 2.5 m/s². Answer guidance: apply F = ma directly.\n2. A resultant force of 15 N gives an object an acceleration of 3 m/s². Find its mass. Answer guidance: rearrange F = ma to m = F/a.\n3. Explain, using Newton's third law, what happens when a swimmer pushes against a pool wall. Answer guidance: name both objects and both forces.\n4. A rocket expels gas downward to accelerate upward. Explain this using Newton's third law. Answer guidance: identify the action force on the gas and the reaction force on the rocket." },
      { type: "summary", title: "Master the strategy", content: "You should now be able to state all three of Newton's laws, use F = ma to solve for any one of force, mass or acceleration, and correctly identify genuine action-reaction pairs by checking they act on two different objects." },
    ],
  },
  "physics|waves": {
    title: "Waves: describing, measuring, and explaining wave motion",
    blocks: [
      { type: "objective", title: "Your target", content: "By the end, you should be able to define a wave, distinguish transverse and longitudinal waves, use v = fλ, interpret wave diagrams, and explain reflection, refraction, diffraction and superposition at AS level." },
      { type: "prior", title: "Before you start", content: "A vibration is an oscillation about an equilibrium position. A medium is the material through which a mechanical wave travels. Keep the source of a wave separate from the particles of the medium: particles usually oscillate locally while energy is transferred through the medium." },
      { type: "definition", title: "What a wave transfers", content: "A wave is a travelling disturbance that transfers energy from one place to another without the overall transfer of matter. In a mechanical wave, particles of the medium oscillate about equilibrium as the disturbance passes." },
      { type: "concept", title: "Transverse and longitudinal waves", content: "In a transverse wave, oscillations are perpendicular to the direction of energy transfer. In a longitudinal wave, oscillations are parallel to the direction of energy transfer, producing compressions and rarefactions. Sound in air is longitudinal; electromagnetic waves are transverse." },
      { type: "definition", title: "Amplitude, wavelength, period and frequency", content: "Amplitude is the maximum displacement from equilibrium. Wavelength λ is the distance between adjacent points in phase, such as crest to crest. Period T is the time for one complete oscillation. Frequency f is the number of oscillations per second, measured in hertz (Hz), and f = 1/T." },
      { type: "formula", title: "The wave equation", content: "Wave speed = frequency × wavelength, so v = fλ. Use v in m s⁻¹, f in Hz (s⁻¹), and λ in metres. The equation follows because one wavelength passes a fixed point during each period: v = λ/T = fλ." },
      { type: "example", title: "Worked example: finding wave speed", content: "A wave has frequency 25 Hz and wavelength 0.80 m. Step 1: Write v = fλ. Step 2: Substitute v = 25 × 0.80. Step 3: Calculate v = 20 m s⁻¹. Check the units: Hz × m = s⁻¹ × m = m s⁻¹." },
      { type: "checkpoint", title: "Try it before moving on", content: "A wave travels at 12 m s⁻¹ and has frequency 6.0 Hz. Calculate its wavelength. Write the equation, rearrange it for λ, substitute the values and include the unit." },
      { type: "concept", title: "Phase and points in phase", content: "Two points are in phase when they have the same displacement from equilibrium and are moving in the same direction. Adjacent points in phase are separated by one wavelength. Points half a wavelength apart are in antiphase: their displacements are opposite at the same instant." },
      { type: "example", title: "Worked example: period and frequency", content: "A source makes 18 complete oscillations in 6.0 s. Frequency is oscillations divided by time: f = 18/6.0 = 3.0 Hz. The period is T = 1/f = 1/3.0 = 0.33 s to two significant figures." },
      { type: "concept", title: "Reflection, refraction and diffraction", content: "Reflection is a wave changing direction at a boundary and returning into its original medium. Refraction occurs when wave speed changes on entering a different region; frequency remains fixed by the source, so wavelength changes. Diffraction is the spreading of waves around an obstacle or through a gap. It is most noticeable when the gap width is similar to the wavelength." },
      { type: "concept", title: "Superposition and interference", content: "When waves overlap, the resultant displacement is the algebraic sum of their individual displacements. Constructive interference occurs when displacements reinforce; destructive interference occurs when they oppose. For sustained clear interference, the sources should be coherent, meaning they have the same frequency and a constant phase difference." },
      { type: "misconception", title: "Common mistakes", content: "Do not confuse amplitude with wavelength: amplitude is a displacement, while wavelength is a distance along the wave. Do not claim that frequency changes during refraction; the source fixes the frequency. A larger amplitude does not automatically mean a higher frequency. When using v = fλ, convert wavelength to metres before substituting." },
      { type: "exam", title: "How to earn the marks", content: "For a calculation, state v = fλ, rearrange before substituting, show working and include units. For a diagram, label amplitude from the equilibrium line and wavelength between matching points in phase. For diffraction, explicitly relate the amount of spreading to the gap size compared with wavelength. For refraction, state which quantity changes and which stays constant." },
      { type: "practice", title: "Progressive practice", content: "1. A wave has wavelength 0.40 m and frequency 15 Hz. Calculate its speed. 2. A source completes 50 oscillations in 10 s. Find its frequency and period. 3. Explain why wavelength changes when a wave enters a region where its speed decreases but its frequency stays constant. 4. Explain why diffraction is more pronounced when a gap is about the same width as the wavelength. 5. Two coherent waves meet in phase. Describe the resultant displacement at a point where both have equal positive displacement." },
      { type: "checkpoint", title: "Check the units", content: "A wave has wavelength 2.5 cm and frequency 400 Hz. Convert the wavelength into metres before using v = fλ. What speed do you obtain, and why would using 2.5 directly give the wrong answer?" },
      { type: "example", title: "Worked example: wavelength after a speed change", content: "A wave of frequency 5.0 Hz travels at 10 m s⁻¹ in one region and 6.0 m s⁻¹ in another. In the first region λ = v/f = 10/5.0 = 2.0 m. In the second region λ = 6.0/5.0 = 1.2 m. The frequency remains 5.0 Hz because the source has not changed, while the wavelength decreases with the speed." },
      { type: "checkpoint", title: "Predict the diffraction", content: "Two gaps are used with the same wave: one is much wider than the wavelength, and the other is about one wavelength wide. Through which gap should spreading be more noticeable? Explain your prediction using the gap width compared with wavelength." },
      { type: "synthesis", title: "Connect the ideas", content: "Wave behaviour can be understood by tracking three things: the source frequency, the medium-dependent speed, and the geometry of the wavefront and obstacle. The equation v = fλ links speed, frequency and wavelength; refraction changes speed and wavelength together while frequency stays fixed. Diffraction depends on wavelength compared with gap size, and interference depends on adding displacements at the same point." },
      { type: "summary", title: "What to retain", content: "A wave transfers energy without overall transfer of matter. Identify transverse or longitudinal motion from the direction of oscillation. Use f = 1/T and v = fλ with consistent SI units. Reflection changes direction, refraction follows a speed change, diffraction produces spreading, and superposition adds displacements." }
    ]
  }
};

const SUBJECT_ALIASES: Record<string, string> = {
  math: "mathematics",
  maths: "mathematics",
  "computer science": "computer science",
  "cs": "computer science",
  ict: "computer science",
  physics: "physics",
};

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/['’]/g, "").replace(/\s+/g, " ");
}

function normalizeSubject(value: string): string {
  const cleaned = normalize(value)
    .replace(/\b(970[0-9]|961[0-9]|9[0-9]{3})\b/g, " ")
    .replace(/\b(as|a level|a-level|a-levels|cambridge|international|igcse|o level|o-level|gcse)\b/g, " ")
    .replace(/[()[\]_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (/^(physics|phys|physical science)\b/.test(cleaned)) return "physics";
  if (/^(math|maths|mathematics|pure mathematics)\b/.test(cleaned)) return "mathematics";
  if (/^(computer science|computing|comp sci|cs|ict)\b/.test(cleaned)) return "computer science";
  if (/^(chemistry|chem)\b/.test(cleaned)) return "chemistry";
  if (/^(biology|bio)\b/.test(cleaned)) return "biology";
  return SUBJECT_ALIASES[cleaned] ?? cleaned;
}

function normalizeTopic(value: string): string {
  return normalize(value)
    .replace(/\b(topic|chapter|unit|notes|lesson|please teach me|teach me|explain)\b/g, " ")
    .replace(/[,:;.!?]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildDeterministicLessonFallback(subject: string, topic: string): FallbackLesson | null {
  const normalizedSubject = normalizeSubject(subject);
  const normalizedTopic = normalizeTopic(topic);
  const exact = FALLBACK_LESSONS[`${normalizedSubject}|${normalizedTopic}`];
  if (exact) return exact;

  // Match a curated topic when the learner adds a natural-language request,
  // syllabus code, or exam phrasing around the topic. Never broaden the
  // subject match: a Physics lesson must not leak into another subject.
  for (const [key, lesson] of Object.entries(FALLBACK_LESSONS)) {
    const separator = key.indexOf("|");
    const knownSubject = key.slice(0, separator);
    const knownTopic = key.slice(separator + 1);
    if (knownSubject !== normalizedSubject) continue;
    if (normalizedTopic === knownTopic || normalizedTopic.startsWith(`${knownTopic} `) || normalizedTopic.endsWith(` ${knownTopic}`) || normalizedTopic.includes(` ${knownTopic} `)) {
      return lesson;
    }
  }
  return null;
}
