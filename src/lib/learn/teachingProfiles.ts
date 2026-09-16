export type TeachingProfile = {
  key: string;
  label: string;
  priorities: string[];
  reasoning: string[];
};

const PROFILES: TeachingProfile[] = [
  {
    key: "mathematics",
    label: "Mathematics",
    priorities: [
      "build intuition before symbolic manipulation",
      "state definitions, notation, conditions and domain restrictions precisely",
      "derive or justify important rules where useful instead of presenting them as magic formulas",
      "show complete worked solutions with the reason for each step",
      "include variations, non-routine problems, proof or reasoning where appropriate, and common traps",
    ],
    reasoning: ["What is being asked?", "What information or structure is available?", "Which theorem, identity, model or method applies, and why?", "How can the result be checked independently?"],
  },
  {
    key: "physics",
    label: "Physics",
    priorities: [
      "connect physical intuition to mathematical models",
      "define quantities, units, vectors/scalars, assumptions and sign conventions",
      "explain where equations come from or what model they represent when appropriate",
      "show diagrams, experimental interpretation, limiting cases and applications",
      "make students reason from observations to models and from models to predictions",
    ],
    reasoning: ["What physical system is being modelled?", "Which quantities are known and unknown?", "What assumptions make the model valid?", "What does the result mean physically and are the units and limiting behaviour sensible?"],
  },
  {
    key: "chemistry",
    label: "Chemistry",
    priorities: [
      "move between particles, structure, properties, observations and equations",
      "explain why structure causes reactivity or physical behaviour",
      "teach nomenclature, classification, conditions, mechanisms and reaction patterns systematically",
      "use balanced equations, state symbols, conditions and observations accurately where relevant",
      "connect reactions into transformations, synthesis and analytical reasoning rather than isolated facts",
    ],
    reasoning: ["What particles or bonds are involved?", "How does structure influence behaviour?", "What changes during the process?", "What evidence or observation would distinguish the possible explanations?"],
  },
  {
    key: "computer science",
    label: "Computer Science",
    priorities: [
      "teach the abstraction before the implementation",
      "show data representation, algorithms, pseudocode and code where appropriate",
      "trace execution and state changes step by step",
      "cover complexity, correctness, edge cases, trade-offs and failure modes",
      "connect theory to practical systems and implementation decisions",
    ],
    reasoning: ["What problem is being represented?", "What abstraction or data structure captures it?", "How does the algorithm change state over time?", "What are its correctness, complexity and edge-case implications?"],
  },
  {
    key: "biology",
    label: "Biology",
    priorities: [
      "connect structures to functions and mechanisms",
      "teach processes as causal sequences rather than memorised arrows",
      "distinguish levels of organisation and explain interactions between them",
      "use evidence, experimental reasoning, graphs and data interpretation where relevant",
      "separate core mechanisms from extensions and competing explanations when appropriate",
    ],
    reasoning: ["What structure or system is involved?", "What causes the observed process?", "How do the components interact?", "What evidence supports the explanation and what would change the prediction?"],
  },
];

export function getTeachingProfile(subject: string): TeachingProfile {
  const s = subject.toLowerCase();
  const profile = PROFILES.find((p) => s.includes(p.key) || (p.key === "computer science" && /\b(cs|computing|computer)\b/.test(s)));
  return profile ?? {
    key: "general",
    label: "General",
    priorities: [
      "build a clear mental model before detail",
      "define terms precisely and explain causal relationships",
      "use worked examples, comparisons, misconceptions and applications",
      "make connections to neighbouring concepts visible",
    ],
    reasoning: ["What is the core idea?", "Why does it work or matter?", "How is it applied?", "How can the learner check their understanding?"],
  };
}

export function formatTeachingProfile(subject: string): string {
  const p = getTeachingProfile(subject);
  return `SUBJECT TEACHING PROFILE: ${p.label}\nPriorities:\n${p.priorities.map((x) => `- ${x}`).join("\n")}\n\nPreferred reasoning loop:\n${p.reasoning.map((x, i) => `${i + 1}. ${x}`).join("\n")}`;
}
