export type CurriculumUnit = {
  title: string;
  purpose: string;
  kind: "foundation" | "core" | "application" | "mastery" | "exploration";
};

export type CurriculumPlan = {
  isBroad: boolean;
  title: string;
  map: string[];
  units: CurriculumUnit[];
};

const MAPS: Array<{ match: RegExp; title: string; units: CurriculumUnit[] }> = [
  {
    match: /organic chemistry/i,
    title: "Organic Chemistry Masterclass",
    units: [
      { title: "Foundations: carbon, bonding and structure", purpose: "Build the particle-level mental model that makes organic chemistry predictable.", kind: "foundation" },
      { title: "Nomenclature and structural representation", purpose: "Learn to read, name and draw organic structures accurately.", kind: "core" },
      { title: "Isomerism and three-dimensional structure", purpose: "Understand how the same formula can encode different structures and properties.", kind: "core" },
      { title: "Hydrocarbons and reaction patterns", purpose: "Build a connected model of alkanes, alkenes and related transformations.", kind: "core" },
      { title: "Functional groups and characteristic reactions", purpose: "Organise organic chemistry around functional groups rather than isolated reactions.", kind: "core" },
      { title: "Mechanisms: why reactions happen", purpose: "Move from memorising equations to explaining electron movement, conditions and products.", kind: "core" },
      { title: "Carbonyl chemistry and important families", purpose: "Understand aldehydes, ketones, acids and derivatives as an interconnected reaction network.", kind: "core" },
      { title: "Synthesis and interconversion", purpose: "Plan multi-step transformations and reason backwards from a target molecule.", kind: "application" },
      { title: "Identification and analysis", purpose: "Use chemical and spectroscopic evidence to infer structures where appropriate.", kind: "application" },
      { title: "Integration, problem solving and exam reasoning", purpose: "Combine structures, mechanisms, observations and quantitative reasoning in unfamiliar problems.", kind: "mastery" },
      { title: "Frontiers and curiosity", purpose: "Open paths into biomolecules, materials, pharmaceuticals, catalysis and modern organic research.", kind: "exploration" },
    ],
  },
  {
    match: /trigonometry/i,
    title: "Trigonometry Masterclass",
    units: [
      { title: "Angles, radians and the unit-circle model", purpose: "Build the geometric model behind trigonometric functions.", kind: "foundation" },
      { title: "Sine, cosine and tangent", purpose: "Connect definitions, graphs, signs and exact values.", kind: "core" },
      { title: "Identities and transformations", purpose: "Understand and manipulate identities without treating them as symbol tricks.", kind: "core" },
      { title: "Equations and general solutions", purpose: "Solve trigonometric equations systematically and interpret their families of solutions.", kind: "application" },
      { title: "Graphs, inverse functions and modelling", purpose: "Use transformations and inverse functions to model periodic behaviour.", kind: "application" },
      { title: "Proof, synthesis and problem solving", purpose: "Combine identities, geometry and algebra in unfamiliar problems.", kind: "mastery" },
      { title: "Extensions and deeper connections", purpose: "Explore complex numbers, calculus links and harmonic ideas where appropriate.", kind: "exploration" },
    ],
  },
  {
    match: /calculus/i,
    title: "Calculus Masterclass",
    units: [
      { title: "Functions, limits and the central idea", purpose: "Build intuition for change and accumulation.", kind: "foundation" },
      { title: "Differentiation from first principles", purpose: "Understand the derivative before collecting rules.", kind: "core" },
      { title: "Derivative rules and applications", purpose: "Use differentiation to analyse functions, motion and optimisation.", kind: "core" },
      { title: "Integration and accumulation", purpose: "Connect area, antiderivatives and accumulation.", kind: "core" },
      { title: "Techniques and modelling", purpose: "Solve richer integration and modelling problems.", kind: "application" },
      { title: "Differential equations and connected problems", purpose: "Use calculus as a language for changing systems.", kind: "application" },
      { title: "Synthesis and mastery", purpose: "Select methods intelligently in unfamiliar multi-step problems.", kind: "mastery" },
      { title: "Extensions and deeper mathematics", purpose: "Open routes into series, multivariable ideas and mathematical analysis.", kind: "exploration" },
    ],
  },
];

function genericPlan(topic: string): CurriculumPlan {
  return {
    isBroad: true,
    title: `${topic.trim()} Learning Journey`,
    map: ["Foundations", "Core concepts", "Structures and patterns", "Methods and mechanisms", "Worked applications", "Common misconceptions", "Synthesis and problem solving", "Mastery", "Further exploration"],
    units: [
      { title: `${topic}: foundations and mental model`, purpose: "Establish prerequisites, vocabulary and the big picture.", kind: "foundation" },
      { title: `${topic}: core concepts`, purpose: "Build the central ideas carefully from first principles.", kind: "core" },
      { title: `${topic}: structures, patterns and relationships`, purpose: "Reveal the organising patterns that connect the subject.", kind: "core" },
      { title: `${topic}: methods and mechanisms`, purpose: "Explain how to reason, calculate, construct or analyse within the topic.", kind: "core" },
      { title: `${topic}: worked applications`, purpose: "Turn understanding into practical and unfamiliar applications.", kind: "application" },
      { title: `${topic}: synthesis and mastery`, purpose: "Combine the major ideas into multi-step reasoning and challenging problems.", kind: "mastery" },
      { title: `${topic}: further questions and exploration`, purpose: "Connect the topic to neighbouring fields and open deeper questions.", kind: "exploration" },
    ],
  };
}

export function isBroadTopic(topic: string): boolean {
  const normalized = topic.trim().toLowerCase();
  if (!normalized) return false;
  if (MAPS.some((m) => m.match.test(normalized))) return true;
  return /^(the )?(fundamentals|basics|introduction to|intro to|everything about|complete guide to)\b/i.test(normalized) || normalized.split(/\s+/).length <= 2;
}

export function planCurriculum(topic: string): CurriculumPlan {
  const trimmed = topic.trim();
  const found = MAPS.find((m) => m.match.test(trimmed));
  if (found) return { isBroad: true, title: found.title, map: found.units.map((u) => u.title), units: found.units };
  return isBroadTopic(trimmed) ? genericPlan(trimmed) : { isBroad: false, title: trimmed, map: [trimmed], units: [{ title: trimmed, purpose: "Teach the requested topic deeply and connect it to prerequisites and next ideas.", kind: "core" }] };
}

export function formatCurriculumPlan(topic: string): string {
  const plan = planCurriculum(topic);
  if (!plan.isBroad) return `CURRICULUM SCOPE: focused topic\nTeach ${topic} deeply, then identify prerequisites and natural next steps.`;
  return `CURRICULUM MAP: ${plan.title}\n${plan.units.map((u, i) => `${i + 1}. ${u.title} [${u.kind}]\n   Purpose: ${u.purpose}`).join("\n")}`;
}
