import type { LessonQualityBlock } from "./lessonQuality";

export function buildDeterministicLessonFallback(subject: string, topic: string): { title: string; blocks: LessonQualityBlock[] } | null {
  const normalizedTopic = topic.trim().toLowerCase().replace(/\s+/g, " ");
  const normalizedSubject = subject.trim().toLowerCase();

  if (!["mathematics", "math", "maths"].includes(normalizedSubject) || normalizedTopic !== "trigonometric identities") return null;

  return {
    title: "Trigonometric identities: transform, prove, simplify",
    blocks: [
      { type: "objective", title: "Your target", content: "By the end, you should be able to use fundamental trigonometric identities to transform expressions, prove an identity by working on one side, and choose an efficient identity when simplifying." },
      { type: "prior", title: "Before you start", content: "You need to know that tan θ = sin θ / cos θ and that sin²θ means (sin θ)². The identities below hold for every angle for which the expressions are defined." },
      { type: "definition", title: "What is an identity?", content: "A trigonometric identity is an equation that is true for every allowed value of the angle. This differs from an ordinary equation, where you usually find particular values that make the statement true." },
      { type: "formula", title: "The core identities", content: "Pythagorean identities: sin²θ + cos²θ = 1; 1 + tan²θ = sec²θ; 1 + cot²θ = csc²θ. Reciprocal relationships: secθ = 1/cosθ, cscθ = 1/sinθ, cotθ = 1/tanθ. Quotient relationships: tanθ = sinθ/cosθ and cotθ = cosθ/sinθ. These let you replace one form with another without changing its value." },
      { type: "concept", title: "Think in transformations", content: "Do not treat identities as a list to deploy randomly. Inspect the expression and ask what form would make the next step simpler. A numerator such as 1 − sin²θ suggests cos²θ. A term 1 + tan²θ suggests sec²θ. In a proof, transform one side until it becomes exactly the other side." },
      { type: "example", title: "Worked proof: one side only", content: "Prove that (1 − sin²θ) / cosθ = cosθ. Start with the left side. Use sin²θ + cos²θ = 1, so 1 − sin²θ = cos²θ. Therefore (1 − sin²θ)/cosθ = cos²θ/cosθ = cosθ, provided the original denominator is defined. Only the left side was transformed, so every step preserves equality." },
      { type: "checkpoint", title: "Pause and choose", content: "Pause before reading further. How would you simplify 1 + tan²θ? Which identity gives the shortest route? Write the next line yourself before checking your notes." },
      { type: "example", title: "Worked simplification: spot the structure", content: "Simplify (1 − cos²θ) / sinθ. The numerator matches the rearranged Pythagorean identity, so 1 − cos²θ = sin²θ. The expression becomes sin²θ/sinθ = sinθ when sinθ is non-zero. The important step was choosing the identity from the structure instead of expanding blindly." },
      { type: "misconception", title: "Common traps", content: "Do not change both sides of an identity proof at the same time, because that can hide an invalid step. Do not cancel terms across addition: (sin²θ + cos²θ)/sinθ is not sinθ + cosθ. Also check denominator restrictions before cancelling a factor." },
      { type: "application", title: "Use it yourself", content: "Task: simplify (sec²θ − 1) / tanθ without a calculator. Success criteria: identify the matching identity, show each transformation, simplify to one basic trigonometric ratio, and state any restriction created by a denominator. Do not expand randomly." },
      { type: "exam", title: "Exam transfer", content: "For an identity-proof question, write a clear chain of equivalent expressions and state the identity used when it matters. For example, if asked to prove an expression involving tanθ and cotθ equals sec²θ, decide whether reciprocal relationships or rewriting in sin and cos gives the cleaner route. Treat an invented practice question as practice, not as an official past-paper question." },
      { type: "practice", title: "Progressive practice", content: "1. Simplify 1 − sin²θ. Answer guidance: identify the Pythagorean identity.\n2. Simplify (1 − cos²θ)/sinθ. Answer guidance: replace the numerator first, then cancel carefully.\n3. Prove that (tanθ + cotθ)/tanθ = sec²θ. Answer guidance: rewrite cotθ as 1/tanθ, then simplify.\n4. Prove that (sec²θ − 1)/tanθ = tanθ. Answer guidance: use the identity connecting tan²θ and sec²θ, then check the domain." },
      { type: "summary", title: "Master the strategy", content: "You should now be able to recognise the Pythagorean identities, use reciprocal and quotient relationships, select an identity from the structure of an expression, prove an identity by transforming one side, and avoid illegal cancellation. The strategic question is: what form will make the next step simpler?" },
    ],
  };
}
