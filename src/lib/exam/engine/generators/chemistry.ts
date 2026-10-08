import { exactInteger, roundDP, roundSF } from "../numeric";
import type { QuestionGenerator } from "../types";

/** Ar values as printed on Cambridge International papers. */
export const AR: Record<string, number> = {
  H: 1.0, C: 12.0, N: 14.0, O: 16.0, Na: 23.0, Mg: 24.3, Al: 27.0, S: 32.1, Cl: 35.5, K: 39.1, Ca: 40.1, Fe: 55.8, Cu: 63.5, Zn: 65.4,
};

/** Relative formula mass of a simple formula such as "CaCO3" or "Mg(OH)2". */
export function formulaMass(formula: string): number {
  const stack: Array<Record<string, number>> = [{}];
  const pattern = /([A-Z][a-z]?)(\d*)|(\()|(\))(\d*)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(formula)) !== null) {
    if (match[1]) {
      const count = match[2] ? Number(match[2]) : 1;
      stack[stack.length - 1][match[1]] = (stack[stack.length - 1][match[1]] ?? 0) + count;
    } else if (match[3]) stack.push({});
    else if (match[4] !== undefined) {
      const group = stack.pop() ?? {};
      const multiplier = match[5] ? Number(match[5]) : 1;
      for (const [element, count] of Object.entries(group)) stack[stack.length - 1][element] = (stack[stack.length - 1][element] ?? 0) + count * multiplier;
    }
  }
  return Object.entries(stack[0]).reduce((sum, [element, count]) => {
    if (!(element in AR)) throw new Error(`Unknown element ${element}`);
    return sum + AR[element] * count;
  }, 0);
}

const COMPOUNDS = ["NaCl", "CaCO3", "NaOH", "H2SO4", "MgO", "H2O", "CO2", "NH3", "Mg(OH)2", "Al2O3", "CuSO4", "KOH", "HCl", "Fe2O3", "ZnO"];

function arLine(formula: string): string {
  const elements = [...new Set(formula.match(/[A-Z][a-z]?/g) ?? [])];
  return `(${elements.map((element) => `A_r: ${element} = ${AR[element].toFixed(1)}`).join(", ")})`;
}

const pretty = (formula: string) => formula.replace(/(\d+)/g, (digits) => digits.replace(/\d/g, (d) => "₀₁₂₃₄₅₆₇₈₉"[Number(d)]));

export const chemistryGenerators: QuestionGenerator[] = [
  {
    id: "chemistry.relative-formula-mass",
    subject: "Chemistry",
    topic: "The mole and Mr",
    keywords: ["mole", "moles", "relative", "mass", "mr", "formula", "stoichiometry", "atomic"],
    build(rng) {
      const formula = rng.pick(COMPOUNDS);
      const mr = formulaMass(formula);
      const { value, tolerance } = roundDP(mr, 1);
      return {
        question: `Calculate the relative formula mass, M_r, of ${pretty(formula)} ${arLine(formula)}. Give your answer to 1 decimal place.`,
        numeric: { exact: mr, tolerance },
        working: [`Add the A_r values for each atom in ${pretty(formula)}`, `M_r = ${value}`],
        marks: 2,
        params: { formula },
      };
    },
  },
  {
    id: "chemistry.moles-from-mass",
    subject: "Chemistry",
    topic: "The mole and Mr",
    keywords: ["mole", "moles", "mass", "amount", "stoichiometry", "calculations"],
    build(rng) {
      const formula = rng.pick(COMPOUNDS);
      const mass = rng.int(5, 80);
      const mr = formulaMass(formula);
      const exact = mass / mr;
      const { value, tolerance } = roundSF(exact, 3);
      return {
        question: `Calculate the amount, in mol, in ${mass} g of ${pretty(formula)} ${arLine(formula)}. Give 3 significant figures.`,
        numeric: { exact, tolerance, unit: "mol" },
        working: [`M_r = ${mr.toFixed(1)}`, `n = m ÷ M_r = ${mass} ÷ ${mr.toFixed(1)} = ${value} mol`],
        marks: 2,
        params: { formula, mass },
      };
    },
  },
  {
    id: "chemistry.mass-from-moles",
    subject: "Chemistry",
    topic: "The mole and Mr",
    keywords: ["mole", "moles", "mass", "stoichiometry", "calculations"],
    build(rng) {
      const formula = rng.pick(COMPOUNDS);
      const n = rng.int(5, 90) / 20;
      const exact = n * formulaMass(formula);
      const { value, tolerance } = roundSF(exact, 3);
      return {
        question: `Calculate the mass of ${n} mol of ${pretty(formula)} ${arLine(formula)}. Give 3 significant figures (g).`,
        numeric: { exact, tolerance, unit: "g" },
        working: [`M_r = ${formulaMass(formula).toFixed(1)}`, `m = n × M_r = ${value} g`],
        marks: 2,
        params: { formula, n },
      };
    },
  },
  {
    id: "chemistry.concentration",
    subject: "Chemistry",
    topic: "Solutions and titration",
    keywords: ["concentration", "solution", "solutions", "titration", "volume", "moles", "mol"],
    build(rng) {
      const n = rng.int(2, 60) / 100;
      const volume = rng.int(10, 50) * 5;
      const exact = n / (volume / 1000);
      const { value, tolerance } = roundSF(exact, 3);
      return {
        question: `${n} mol of solute is dissolved to make ${volume} cm³ of solution. Calculate the concentration, to 3 significant figures (mol dm⁻³).`,
        numeric: { exact, tolerance, unit: "mol dm^-3" },
        working: [`V = ${volume} ÷ 1000 = ${volume / 1000} dm³`, `c = n ÷ V = ${value} mol dm⁻³`],
        marks: 2,
        params: { n, volume },
      };
    },
  },
  {
    id: "chemistry.gas-volume",
    subject: "Chemistry",
    topic: "Gases",
    keywords: ["gas", "gases", "volume", "mole", "moles", "rtp", "molar"],
    build(rng) {
      const n = rng.int(2, 80) / 20;
      const { value, tolerance } = roundSF(n * 24, 3);
      return {
        question: `Calculate the volume of ${n} mol of a gas at room temperature and pressure (24 dm³ mol⁻¹). Give 3 significant figures (dm³).`,
        numeric: { exact: n * 24, tolerance, unit: "dm^3" },
        working: ["V = n × 24", `V = ${value} dm³`],
        marks: 1,
        params: { n },
      };
    },
  },
  {
    id: "chemistry.ph-strong-acid",
    subject: "Chemistry",
    topic: "Acids, bases and pH",
    keywords: ["ph", "acid", "acids", "base", "bases", "hydrogen", "strong", "equilibria"],
    build(rng) {
      const c = rng.pick([0.1, 0.05, 0.02, 0.2, 0.01, 0.005, 0.5] as const);
      const exact = -Math.log10(c);
      const { value, tolerance } = roundDP(exact, 2);
      return {
        question: `Calculate the pH of ${c} mol dm⁻³ hydrochloric acid, a strong monobasic acid. Give your answer to 2 decimal places.`,
        numeric: { exact, tolerance },
        working: ["pH = −log₁₀[H⁺]", `pH = −log₁₀(${c}) = ${value.toFixed(2)}`],
        marks: 2,
        params: { c },
      };
    },
  },
  {
    id: "chemistry.percentage-yield",
    subject: "Chemistry",
    topic: "Yield and efficiency",
    keywords: ["yield", "percentage", "efficiency", "stoichiometry", "calculations", "reacting"],
    build(rng) {
      const theoretical = rng.int(40, 400) / 10;
      const actual = Math.round(theoretical * (rng.int(40, 95) / 100) * 10) / 10;
      const exact = (actual / theoretical) * 100;
      const { value, tolerance } = roundSF(exact, 3);
      return {
        question: `A reaction has a theoretical yield of ${theoretical} g. The actual yield is ${actual} g. Calculate the percentage yield, to 3 significant figures.`,
        numeric: { exact, tolerance, unit: "%" },
        working: ["% yield = actual ÷ theoretical × 100", `= ${value}%`],
        marks: 2,
        params: { theoretical, actual },
      };
    },
  },
  {
    id: "chemistry.dilution",
    subject: "Chemistry",
    topic: "Solutions and titration",
    keywords: ["dilution", "dilute", "concentration", "solution", "solutions", "volume"],
    build(rng) {
      const c1 = rng.pick([0.5, 1.0, 2.0, 0.8, 1.5] as const);
      const v1 = rng.int(10, 50);
      const c2 = rng.pick([0.1, 0.2, 0.25, 0.05] as const);
      const exact = (c1 * v1) / c2;
      const { value, tolerance } = roundSF(exact, 3);
      return {
        question: `${v1} cm³ of ${c1} mol dm⁻³ solution is diluted until its concentration is ${c2} mol dm⁻³. Calculate the final volume, to 3 significant figures (cm³).`,
        numeric: { exact, tolerance, unit: "cm^3" },
        working: ["c₁V₁ = c₂V₂", `V₂ = ${c1} × ${v1} ÷ ${c2} = ${value} cm³`],
        marks: 2,
        params: { c1, v1, c2 },
      };
    },
  },
];

// Re-exported for tests that want an exact-integer helper alongside the table.
export const _exactInteger = exactInteger;
