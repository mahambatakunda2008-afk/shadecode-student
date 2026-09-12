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
  const cleaned = normalize(value);
  return SUBJECT_ALIASES[cleaned] ?? cleaned;
}

export function buildDeterministicLessonFallback(subject: string, topic: string): FallbackLesson | null {
  return FALLBACK_LESSONS[`${normalizeSubject(subject)}|${normalize(topic)}`] ?? null;
}
