import { exactInteger, roundSF } from "../numeric";
import type { QuestionGenerator } from "../types";

const signed = (value: number) => (value < 0 ? `- ${Math.abs(value)}` : `+ ${value}`);
const coeff = (value: number, variable: string) => (value === 1 ? variable : value === -1 ? `-${variable}` : `${value}${variable}`);

function polynomial(terms: Array<[number, string]>): string {
  const parts: string[] = [];
  for (const [value, variable] of terms) {
    if (value === 0) continue;
    const body = variable ? coeff(Math.abs(value), variable) : String(Math.abs(value));
    if (!parts.length) parts.push(`${value < 0 ? "-" : ""}${body}`);
    else parts.push(`${value < 0 ? "-" : "+"} ${body}`);
  }
  return parts.join(" ") || "0";
}

export const mathsGenerators: QuestionGenerator[] = [
  {
    id: "maths.quadratic-roots",
    subject: "Mathematics",
    topic: "Quadratic equations",
    keywords: ["quadratic", "quadratics", "equation", "equations", "roots", "factorise", "factorising", "algebra"],
    build(rng) {
      let r1 = rng.int(-9, 8);
      let r2 = rng.int(-9, 9);
      if (r1 === r2) r2 = r1 + rng.int(1, 3);
      const low = Math.min(r1, r2);
      const high = Math.max(r1, r2);
      const b = -(low + high);
      const c = low * high;
      return {
        question: `Solve $x^2 ${b === 0 ? "" : signed(b) + "x "}${c === 0 ? "" : signed(c) + " "}= 0$. Give the larger root.`,
        numeric: exactInteger(high),
        working: [`Factorise: $(x ${signed(-low)})(x ${signed(-high)}) = 0$`, `Roots: $x = ${low}$ and $x = ${high}$`, `Larger root = ${high}`],
        marks: 2,
        params: { low, high, b, c },
      };
    },
  },
  {
    id: "maths.discriminant",
    subject: "Mathematics",
    topic: "Quadratic equations",
    keywords: ["quadratic", "quadratics", "discriminant", "roots", "algebra"],
    build(rng) {
      const a = rng.int(1, 5);
      const b = rng.int(-9, 9);
      const c = rng.int(-9, 9);
      const value = b * b - 4 * a * c;
      return {
        question: `Find the value of the discriminant of $${polynomial([[a, "x^2"], [b, "x"], [c, ""]])} = 0$.`,
        numeric: exactInteger(value),
        working: ["Discriminant $= b^2 - 4ac$", `$= (${b})^2 - 4(${a})(${c}) = ${value}$`],
        marks: 2,
        params: { a, b, c },
      };
    },
  },
  {
    id: "maths.differentiate-at-point",
    subject: "Mathematics",
    topic: "Differentiation",
    keywords: ["differentiation", "differentiate", "calculus", "gradient", "derivative", "derivatives", "tangent", "rate"],
    build(rng) {
      const a = rng.int(1, 4);
      const b = rng.int(-6, 6);
      const c = rng.int(-8, 8);
      const d = rng.int(-9, 9);
      const k = rng.int(-3, 3);
      const value = 3 * a * k * k + 2 * b * k + c;
      return {
        question: `Given $f(x) = ${polynomial([[a, "x^3"], [b, "x^2"], [c, "x"], [d, ""]])}$, find the value of $f'(${k})$.`,
        numeric: exactInteger(value),
        working: [`$f'(x) = ${polynomial([[3 * a, "x^2"], [2 * b, "x"], [c, ""]])}$`, `$f'(${k}) = ${value}$`],
        marks: 3,
        params: { a, b, c, d, k },
      };
    },
  },
  {
    id: "maths.definite-integral",
    subject: "Mathematics",
    topic: "Integration",
    keywords: ["integration", "integrate", "integral", "integrals", "calculus", "area", "definite"],
    build(rng) {
      const a = rng.int(1, 4);
      const b = rng.int(1, 5);
      const c = rng.int(1, 6);
      const k = rng.int(1, 4);
      const value = a * k ** 3 + b * k ** 2 + c * k;
      return {
        question: `Evaluate $\\int_0^{${k}} \\left(${3 * a}x^2 + ${2 * b}x + ${c}\\right)\\,dx$.`,
        numeric: exactInteger(value),
        working: [`Antiderivative: $${a}x^3 + ${b}x^2 + ${c}x$`, `Value at ${k} minus value at 0 $= ${value}$`],
        marks: 3,
        params: { a, b, c, k },
      };
    },
  },
  {
    id: "maths.arithmetic-sum",
    subject: "Mathematics",
    topic: "Sequences and series",
    keywords: ["series", "sequence", "sequences", "arithmetic", "progression", "sum"],
    build(rng) {
      const a = rng.int(2, 12);
      const d = rng.int(1, 6);
      const n = rng.int(8, 25);
      const value = (n * (2 * a + (n - 1) * d)) / 2;
      return {
        question: `An arithmetic series has first term ${a} and common difference ${d}. Find the sum of the first ${n} terms.`,
        numeric: exactInteger(value),
        working: ["$S_n = \\frac{n}{2}\\left(2a + (n-1)d\\right)$", `$S_{${n}} = ${value}$`],
        marks: 2,
        params: { a, d, n },
      };
    },
  },
  {
    id: "maths.geometric-infinity",
    subject: "Mathematics",
    topic: "Sequences and series",
    keywords: ["series", "geometric", "progression", "convergent", "convergence", "infinity", "sum"],
    build(rng) {
      const a = rng.int(2, 20);
      const [p, q] = rng.pick([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5]] as const);
      const { value, tolerance } = roundSF(a / (1 - p / q), 3);
      return {
        question: `A geometric series has first term ${a} and common ratio $\\frac{${p}}{${q}}$. Find the sum to infinity, to 3 significant figures.`,
        numeric: { exact: a / (1 - p / q), tolerance },
        working: ["$S_\\infty = \\frac{a}{1 - r}$", `$= ${value}$`],
        marks: 2,
        params: { a, p, q },
      };
    },
  },
  {
    id: "maths.simultaneous",
    subject: "Mathematics",
    topic: "Simultaneous equations",
    keywords: ["simultaneous", "linear", "equations", "algebra", "elimination", "substitution"],
    build(rng) {
      const x = rng.int(-6, 6);
      const y = rng.int(-6, 6);
      let a1 = rng.int(1, 5), b1 = rng.int(1, 5), a2 = rng.int(1, 5), b2 = -rng.int(1, 5);
      if (a1 * b2 - a2 * b1 === 0) a2 += 1;
      const c1 = a1 * x + b1 * y;
      const c2 = a2 * x + b2 * y;
      return {
        question: `Solve the simultaneous equations $${a1}x + ${b1}y = ${c1}$ and $${a2}x ${signed(b2)}y = ${c2}$. Give the value of $x$.`,
        numeric: exactInteger(x),
        working: ["Eliminate $y$ by matching coefficients and subtracting.", `$x = ${x}$, $y = ${y}$`],
        marks: 3,
        params: { a1, b1, c1, a2, b2, c2, x, y },
      };
    },
  },
  {
    id: "maths.logarithm",
    subject: "Mathematics",
    topic: "Logarithms and exponentials",
    keywords: ["logarithm", "logarithms", "log", "logs", "exponential", "exponentials", "indices", "powers"],
    build(rng) {
      const base = rng.pick([2, 3, 5, 10] as const);
      const n = rng.int(2, base === 10 ? 4 : 5);
      return {
        question: `Evaluate $\\log_{${base}} ${base ** n}$.`,
        numeric: exactInteger(n),
        working: [`$${base}^{${n}} = ${base ** n}$, so $\\log_{${base}} ${base ** n} = ${n}$`],
        marks: 1,
        params: { base, n },
      };
    },
  },
  {
    id: "maths.right-triangle-side",
    subject: "Mathematics",
    topic: "Trigonometry",
    keywords: ["trigonometry", "trigonometric", "triangle", "triangles", "sine", "sin", "cosine", "angles"],
    build(rng) {
      const h = rng.int(5, 20);
      const theta = rng.int(20, 70);
      const exact = h * Math.sin((theta * Math.PI) / 180);
      const { value, tolerance } = roundSF(exact, 3);
      return {
        question: `In a right-angled triangle the hypotenuse is ${h} cm and one angle is ${theta}°. Find the length of the side opposite this angle, to 3 significant figures (cm).`,
        numeric: { exact, tolerance, unit: "cm" },
        working: [`$\\text{opposite} = ${h}\\sin ${theta}^\\circ$`, `$= ${value}$ cm`],
        marks: 2,
        params: { h, theta },
      };
    },
  },
  {
    id: "maths.mean",
    subject: "Mathematics",
    topic: "Statistics",
    keywords: ["statistics", "mean", "average", "data", "averages"],
    build(rng) {
      const data = Array.from({ length: 6 }, () => rng.int(2, 40));
      const exact = data.reduce((sum, value) => sum + value, 0) / data.length;
      const { value, tolerance } = roundSF(exact, 3);
      return {
        question: `Find the mean of the data set ${data.join(", ")}. Give your answer to 3 significant figures.`,
        numeric: { exact, tolerance },
        working: [`Sum $= ${data.reduce((s, v) => s + v, 0)}$`, `Mean $= ${value}$`],
        marks: 1,
        params: { data: data.join(",") },
      };
    },
  },
  {
    id: "maths.binomial-coefficient",
    subject: "Mathematics",
    topic: "Binomial expansion and counting",
    keywords: ["binomial", "combinations", "choose", "probability", "expansion", "permutations"],
    build(rng) {
      const n = rng.int(5, 10);
      const r = rng.int(2, 4);
      let value = 1;
      for (let i = 1; i <= r; i++) value = (value * (n - r + i)) / i;
      return {
        question: `Evaluate $\\binom{${n}}{${r}}$.`,
        numeric: exactInteger(value),
        working: [`$\\binom{${n}}{${r}} = \\frac{${n}!}{${r}!\\,${n - r}!} = ${value}$`],
        marks: 1,
        params: { n, r },
      };
    },
  },
  {
    id: "maths.gradient",
    subject: "Mathematics",
    topic: "Coordinate geometry",
    keywords: ["coordinate", "geometry", "gradient", "line", "lines", "straight", "points"],
    build(rng) {
      const m = rng.int(-5, 5) || 2;
      const dx = rng.int(1, 5);
      const x1 = rng.int(-6, 4);
      const y1 = rng.int(-6, 6);
      return {
        question: `Find the gradient of the line through $A(${x1}, ${y1})$ and $B(${x1 + dx}, ${y1 + m * dx})$.`,
        numeric: exactInteger(m),
        working: ["$m = \\frac{y_2 - y_1}{x_2 - x_1}$", `$= \\frac{${m * dx}}{${dx}} = ${m}$`],
        marks: 1,
        params: { m, dx, x1, y1 },
      };
    },
  },
];
