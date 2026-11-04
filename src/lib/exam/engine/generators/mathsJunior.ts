/**
 * Form 1-4 (junior secondary and O-Level) Mathematics generators.
 * Every item has one exact numeric answer and a worked solution, so it is marked exactly with no AI.
 * Money is written as "dollars" (never a dollar sign) because `$` delimits maths in the exam UI.
 */
import { exactInteger, roundDP } from "../numeric";
import type { BuiltItem, QuestionGenerator } from "../types";

const signed = (value: number) => (value < 0 ? `- ${Math.abs(value)}` : `+ ${value}`);
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

export const mathsJuniorGenerators: QuestionGenerator[] = [
  {
    id: "maths.jr.percentage-of",
    subject: "Mathematics",
    level: "olevel",
    topic: "Percentages",
    keywords: ["percentage", "percentages", "percent", "discount", "fractions", "decimals"],
    build(rng): BuiltItem {
      const pct = rng.pick([5, 10, 15, 20, 25, 30, 35, 40, 45, 60, 75]);
      const amount = rng.int(4, 60) * 20;
      const ans = (pct * amount) / 100;
      return {
        question: `Find ${pct}% of ${amount}.`,
        numeric: exactInteger(ans),
        working: [`${pct}% of ${amount} = ${pct}/100 × ${amount}`, `= ${ans}`],
        marks: 2,
        params: { pct, amount },
      };
    },
  },
  {
    id: "maths.jr.percentage-change",
    subject: "Mathematics",
    level: "olevel",
    topic: "Percentages",
    keywords: ["percentage", "percentages", "percent", "increase", "decrease", "profit", "loss", "change"],
    build(rng): BuiltItem {
      const oldValue = rng.int(2, 20) * 20;
      const pct = rng.pick([5, 10, 15, 20, 25, 30, 40, 50]);
      const up = rng.int(0, 1) === 1;
      const newValue = oldValue + (up ? 1 : -1) * ((oldValue * pct) / 100);
      return {
        question: up
          ? `The price of an item rises from ${oldValue} dollars to ${newValue} dollars. Find the percentage increase.`
          : `The price of an item falls from ${oldValue} dollars to ${newValue} dollars. Find the percentage decrease.`,
        numeric: exactInteger(pct),
        working: [`Change = ${Math.abs(newValue - oldValue)}`, `Percentage change = change ÷ original × 100 = ${Math.abs(newValue - oldValue)} ÷ ${oldValue} × 100 = ${pct}%`],
        marks: 3,
        params: { oldValue, newValue },
      };
    },
  },
  {
    id: "maths.jr.simple-interest",
    subject: "Mathematics",
    level: "olevel",
    topic: "Percentages",
    keywords: ["interest", "simple", "percentage", "percentages", "invest", "investment", "loan", "commerce"],
    build(rng): BuiltItem {
      const principal = rng.int(2, 50) * 100;
      const rate = rng.pick([2, 3, 4, 5, 6, 8, 10]);
      const years = rng.int(1, 6);
      const interest = (principal * rate * years) / 100;
      return {
        question: `Find the simple interest on ${principal} dollars invested at ${rate}% per year for ${years} years.`,
        numeric: exactInteger(interest),
        working: ["Simple interest = P × R × T ÷ 100", `= ${principal} × ${rate} × ${years} ÷ 100 = ${interest}`],
        marks: 2,
        params: { principal, rate, years },
      };
    },
  },
  {
    id: "maths.jr.ratio-share",
    subject: "Mathematics",
    level: "olevel",
    topic: "Ratio and proportion",
    keywords: ["ratio", "ratios", "share", "sharing", "proportion", "divide"],
    build(rng): BuiltItem {
      let a = rng.int(1, 9);
      let b = rng.int(1, 9);
      if (a === b) b = a === 9 ? 8 : a + 1;
      const unit = rng.int(5, 60);
      const total = (a + b) * unit;
      const larger = Math.max(a, b) * unit;
      return {
        question: `Share ${total} dollars in the ratio ${a} : ${b}. Find the larger share.`,
        numeric: exactInteger(larger),
        working: [`Total parts = ${a + b}`, `One part = ${total} ÷ ${a + b} = ${unit}`, `Larger share = ${Math.max(a, b)} × ${unit} = ${larger}`],
        marks: 3,
        params: { a, b, total },
      };
    },
  },
  {
    id: "maths.jr.direct-proportion",
    subject: "Mathematics",
    level: "olevel",
    topic: "Ratio and proportion",
    keywords: ["proportion", "direct", "rate", "rates", "unitary", "cost", "ratio"],
    build(rng): BuiltItem {
      const unitCents = rng.pick([20, 25, 30, 40, 45, 60, 75, 80]);
      const n1 = rng.int(2, 9);
      let n2 = rng.int(10, 30);
      if (n2 === n1) n2 += 1;
      const firstCost = (n1 * unitCents) / 100;
      const answer = (n2 * unitCents) / 100;
      const rounded = roundDP(answer, 2);
      return {
        question: `${n1} pencils cost ${firstCost.toFixed(2)} dollars. Find the cost of ${n2} pencils, in dollars.`,
        numeric: { exact: rounded.value, tolerance: rounded.tolerance },
        working: [`Cost of 1 pencil = ${firstCost.toFixed(2)} ÷ ${n1} = ${(unitCents / 100).toFixed(2)}`, `Cost of ${n2} pencils = ${n2} × ${(unitCents / 100).toFixed(2)} = ${answer.toFixed(2)}`],
        marks: 2,
        params: { n1, n2, unitCents },
      };
    },
  },
  {
    id: "maths.jr.linear-equation",
    subject: "Mathematics",
    level: "olevel",
    topic: "Linear equations",
    keywords: ["linear", "equation", "equations", "solve", "algebra", "unknown", "variable"],
    build(rng): BuiltItem {
      // a x + b = c x + d, with c = 0 for the one-sided form.
      const x = rng.int(-9, 12);
      const bothSides = rng.int(0, 1) === 1;
      const c = bothSides ? rng.int(1, 5) : 0;
      const a = c + rng.int(1, 6);
      const b = rng.int(-15, 15) || 7;
      const d = (a - c) * x + b;
      const rhs = bothSides ? `${c}x ${signed(d)}` : `${d}`;
      return {
        question: `Solve $${a}x ${signed(b)} = ${rhs}$.`,
        numeric: exactInteger(x),
        working: [`Collect the terms in $x$ on one side and the numbers on the other: $${a - c}x = ${d - b}$`, `$x = ${x}$`],
        marks: 3,
        params: { a, b, c, d, x },
      };
    },
  },
  {
    id: "maths.jr.substitution",
    subject: "Mathematics",
    level: "olevel",
    topic: "Algebra",
    keywords: ["algebra", "substitution", "substitute", "evaluate", "expression", "expressions", "formula", "formulae"],
    build(rng): BuiltItem {
      const a = rng.int(2, 7);
      const b = rng.int(-8, 8) || 3;
      const x = rng.int(-4, 5);
      const y = rng.int(-6, 6);
      const value = a * x * x + b * y;
      return {
        question: `Evaluate $${a}x^2 ${signed(b)}y$ when $x = ${x}$ and $y = ${y}$.`,
        numeric: exactInteger(value),
        working: [`$${a}(${x})^2 ${signed(b)}(${y}) = ${a * x * x} ${signed(b * y)}$`, `$= ${value}$`],
        marks: 2,
        params: { a, b, x, y },
      };
    },
  },
  {
    id: "maths.jr.indices",
    subject: "Mathematics",
    level: "olevel",
    topic: "Indices and standard form",
    keywords: ["indices", "index", "powers", "power", "standard", "form", "exponent", "exponents"],
    build(rng): BuiltItem {
      if (rng.int(0, 1) === 0) {
        const base = rng.pick([2, 3, 5]);
        const p = rng.int(2, 5);
        const q = rng.int(2, 5);
        const r = rng.int(1, p + q - 1);
        const result = base ** (p + q - r);
        return {
          question: `Evaluate $${base}^{${p}} \\times ${base}^{${q}} \\div ${base}^{${r}}$.`,
          numeric: exactInteger(result),
          working: [`Add the indices when multiplying and subtract when dividing: $${base}^{${p} + ${q} - ${r}} = ${base}^{${p + q - r}}$`, `$= ${result}$`],
          marks: 2,
          params: { kind: "indices", base, p, q, r },
        };
      }
      const mantissaTenths = rng.pick([12, 25, 35, 47, 62, 85, 91]);
      const exponent = rng.int(2, 5);
      const value = mantissaTenths * 10 ** (exponent - 1);
      return {
        question: `Write $${(mantissaTenths / 10).toFixed(1)} \\times 10^{${exponent}}$ as an ordinary number.`,
        numeric: exactInteger(value),
        working: [`Multiply ${(mantissaTenths / 10).toFixed(1)} by 10 ${exponent} times, moving the decimal point ${exponent} places right.`, `= ${value}`],
        marks: 1,
        params: { kind: "standard", mantissaTenths, exponent },
      };
    },
  },
  {
    id: "maths.jr.pythagoras",
    subject: "Mathematics",
    level: "olevel",
    topic: "Pythagoras theorem",
    keywords: ["pythagoras", "pythagorean", "right", "angled", "triangle", "hypotenuse", "theorem"],
    build(rng): BuiltItem {
      const [a0, b0, c0] = rng.pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29], [9, 12, 15]] as const);
      const k = rng.int(1, 3);
      const a = a0 * k, b = b0 * k, c = c0 * k;
      const findHypotenuse = rng.int(0, 1) === 1;
      return {
        question: findHypotenuse
          ? `A right-angled triangle has shorter sides of ${a} cm and ${b} cm. Find the length of the hypotenuse.`
          : `A right-angled triangle has a hypotenuse of ${c} cm and one other side of ${a} cm. Find the length of the third side.`,
        numeric: { ...exactInteger(findHypotenuse ? c : b), unit: "cm" },
        working: findHypotenuse
          ? [`$c^2 = ${a}^2 + ${b}^2 = ${a * a + b * b}$`, `$c = ${c}$ cm`]
          : [`$b^2 = ${c}^2 - ${a}^2 = ${c * c - a * a}$`, `$b = ${b}$ cm`],
        marks: 3,
        params: { a, b, c, findHypotenuse: findHypotenuse ? 1 : 0 },
      };
    },
  },
  {
    id: "maths.jr.area-perimeter",
    subject: "Mathematics",
    level: "olevel",
    topic: "Area and perimeter",
    keywords: ["area", "perimeter", "rectangle", "triangle", "circle", "circumference", "mensuration"],
    build(rng): BuiltItem {
      const kind = rng.pick(["rectangle", "triangle", "circle-area", "circumference"] as const);
      if (kind === "rectangle") {
        const l = rng.int(4, 25);
        const w = rng.int(3, 18);
        return { question: `A rectangle measures ${l} cm by ${w} cm. Find its area.`, numeric: { ...exactInteger(l * w), unit: "cm^2" }, working: [`Area = length × width = ${l} × ${w} = ${l * w}`], marks: 2, params: { kind, a: l, b: w } };
      }
      if (kind === "triangle") {
        const base = rng.int(2, 15) * 2;
        const h = rng.int(3, 20);
        return { question: `A triangle has a base of ${base} cm and a perpendicular height of ${h} cm. Find its area.`, numeric: { ...exactInteger((base * h) / 2), unit: "cm^2" }, working: [`Area = ½ × base × height = ½ × ${base} × ${h} = ${(base * h) / 2}`], marks: 2, params: { kind, a: base, b: h } };
      }
      const m = rng.int(1, 4);
      const r = 7 * m;
      if (kind === "circle-area") {
        return { question: `Find the area of a circle of radius ${r} cm. Use $\\pi = \\frac{22}{7}$.`, numeric: { ...exactInteger(154 * m * m), unit: "cm^2" }, working: [`Area = πr² = 22/7 × ${r} × ${r} = ${154 * m * m}`], marks: 2, params: { kind, a: r, b: 0 } };
      }
      return { question: `Find the circumference of a circle of radius ${r} cm. Use $\\pi = \\frac{22}{7}$.`, numeric: { ...exactInteger(44 * m), unit: "cm" }, working: [`Circumference = 2πr = 2 × 22/7 × ${r} = ${44 * m}`], marks: 2, params: { kind, a: r, b: 0 } };
    },
  },
  {
    id: "maths.jr.angles",
    subject: "Mathematics",
    level: "olevel",
    topic: "Angles and polygons",
    keywords: ["angles", "angle", "polygon", "polygons", "interior", "exterior", "triangle", "degrees", "geometry"],
    build(rng): BuiltItem {
      const kind = rng.pick(["sum", "regular", "triangle"] as const);
      if (kind === "sum") {
        const n = rng.int(5, 12);
        return { question: `Find the sum of the interior angles of a polygon with ${n} sides, in degrees.`, numeric: exactInteger((n - 2) * 180), working: [`Sum = (n − 2) × 180 = ${n - 2} × 180 = ${(n - 2) * 180}`], marks: 2, params: { kind, a: n, b: 0 } };
      }
      if (kind === "regular") {
        const n = rng.pick([5, 6, 8, 9, 10, 12, 15, 18, 20, 24]);
        return { question: `Find the size of one interior angle of a regular polygon with ${n} sides, in degrees.`, numeric: exactInteger(180 - 360 / n), working: [`Exterior angle = 360 ÷ ${n} = ${360 / n}`, `Interior angle = 180 − ${360 / n} = ${180 - 360 / n}`], marks: 3, params: { kind, a: n, b: 0 } };
      }
      const a = rng.int(25, 80);
      const b = rng.int(25, 80);
      return { question: `Two angles of a triangle are ${a}° and ${b}°. Find the third angle, in degrees.`, numeric: exactInteger(180 - a - b), working: [`Angles in a triangle add up to 180°`, `Third angle = 180 − ${a} − ${b} = ${180 - a - b}`], marks: 2, params: { kind, a, b } };
    },
  },
  {
    id: "maths.jr.speed-distance-time",
    subject: "Mathematics",
    level: "olevel",
    topic: "Speed, distance and time",
    keywords: ["speed", "distance", "time", "velocity", "rate", "journey", "average"],
    build(rng): BuiltItem {
      const speed = rng.int(5, 30) * 4;
      const time = rng.pick([2, 2.5, 3, 4, 5]);
      const distance = speed * time;
      const kind = rng.pick(["speed", "time", "distance"] as const);
      if (kind === "speed") return { question: `A car travels ${distance} km in ${time} hours. Find its average speed in km/h.`, numeric: { ...exactInteger(speed), unit: "km/h" }, working: [`Speed = distance ÷ time = ${distance} ÷ ${time} = ${speed}`], marks: 2, params: { kind, speed, time, distance } };
      if (kind === "time") return { question: `A bus travels ${distance} km at an average speed of ${speed} km/h. Find the time taken in hours.`, numeric: { exact: time, tolerance: 1e-6, unit: "hours" }, working: [`Time = distance ÷ speed = ${distance} ÷ ${speed} = ${time}`], marks: 2, params: { kind, speed, time, distance } };
      return { question: `A cyclist rides at ${speed} km/h for ${time} hours. Find the distance travelled in km.`, numeric: { ...exactInteger(distance), unit: "km" }, working: [`Distance = speed × time = ${speed} × ${time} = ${distance}`], marks: 2, params: { kind, speed, time, distance } };
    },
  },
  {
    id: "maths.jr.hcf-lcm",
    subject: "Mathematics",
    level: "olevel",
    topic: "Factors and multiples",
    keywords: ["hcf", "lcm", "factors", "factor", "multiples", "multiple", "highest", "lowest", "common", "prime"],
    build(rng): BuiltItem {
      const g = rng.pick([2, 3, 4, 5, 6, 7, 9, 12]);
      const [p, q] = rng.pick([[2, 3], [3, 4], [4, 5], [3, 5], [2, 5], [5, 6], [3, 7], [4, 7], [5, 7], [2, 7]] as const);
      const a = g * p, b = g * q;
      const askHcf = rng.int(0, 1) === 1;
      return {
        question: askHcf ? `Find the highest common factor (HCF) of ${a} and ${b}.` : `Find the lowest common multiple (LCM) of ${a} and ${b}.`,
        numeric: exactInteger(askHcf ? g : g * p * q),
        working: [`${a} = ${g} × ${p} and ${b} = ${g} × ${q}`, askHcf ? `HCF = ${g}` : `LCM = ${g} × ${p} × ${q} = ${g * p * q}`],
        marks: 2,
        params: { a, b, askHcf: askHcf ? 1 : 0 },
      };
    },
  },
  {
    id: "maths.jr.probability",
    subject: "Mathematics",
    level: "olevel",
    topic: "Probability",
    keywords: ["probability", "chance", "likelihood", "bag", "counters", "marbles", "outcomes", "random"],
    build(rng): BuiltItem {
      const total = rng.pick([4, 5, 8, 10, 20, 25, 40, 50]);
      const red = rng.int(1, total - 2);
      const blue = rng.int(1, total - red - 1);
      const green = total - red - blue;
      const p = roundDP(red / total, 3);
      return {
        question: `A bag holds ${red} red, ${blue} blue and ${green} green counters. One counter is taken at random. Find the probability that it is red, as a decimal.`,
        numeric: { exact: p.value, tolerance: p.tolerance },
        working: [`Total counters = ${total}`, `P(red) = ${red}/${total} = ${p.value}`],
        marks: 2,
        params: { red, blue, green },
      };
    },
  },
  {
    id: "maths.jr.nth-term",
    subject: "Mathematics",
    level: "olevel",
    topic: "Sequences",
    keywords: ["sequence", "sequences", "nth", "term", "terms", "pattern", "patterns", "arithmetic"],
    build(rng): BuiltItem {
      const first = rng.int(-5, 20);
      const diff = rng.pick([2, 3, 4, 5, 6, 7, 9, -2, -3, -4]);
      const n = rng.int(10, 40);
      const term = (k: number) => first + (k - 1) * diff;
      return {
        question: `The first three terms of a sequence are ${term(1)}, ${term(2)}, ${term(3)}. Find the ${n}th term.`,
        numeric: exactInteger(term(n)),
        working: [`Common difference = ${diff}`, `nth term = ${first} + (n − 1) × ${diff}`, `${n}th term = ${first} + ${n - 1} × ${diff} = ${term(n)}`],
        marks: 3,
        params: { first, diff, n },
      };
    },
  },
  {
    id: "maths.jr.fractions",
    subject: "Mathematics",
    level: "olevel",
    topic: "Fractions",
    keywords: ["fraction", "fractions", "numerator", "denominator", "decimal", "decimals", "proper", "improper"],
    build(rng): BuiltItem {
      if (rng.int(0, 1) === 0) {
        const q = rng.pick([3, 4, 5, 6, 8, 10]);
        const p = rng.int(1, q - 1);
        const whole = q * rng.int(2, 25);
        return {
          question: `Find $\\frac{${p}}{${q}}$ of ${whole}.`,
          numeric: exactInteger((p * whole) / q),
          working: [`${whole} ÷ ${q} = ${whole / q}`, `${whole / q} × ${p} = ${(p * whole) / q}`],
          marks: 2,
          params: { kind: "of", p, q, a: whole, r: 0, s: 1 },
        };
      }
      const dens = [2, 4, 5, 8, 10] as const;
      const q = rng.pick(dens);
      const s = rng.pick(dens);
      const p = rng.int(1, q - 1);
      const r = rng.int(1, s - 1);
      const sum = roundDP(p / q + r / s, 3);
      return {
        question: `Evaluate $\\frac{${p}}{${q}} + \\frac{${r}}{${s}}$, giving your answer as a decimal.`,
        numeric: { exact: sum.value, tolerance: sum.tolerance },
        working: [`${p}/${q} = ${p / q} and ${r}/${s} = ${r / s}`, `Sum = ${sum.value}`],
        marks: 2,
        params: { kind: "sum", p, q, a: 0, r, s },
      };
    },
  },
  {
    id: "maths.jr.volume",
    subject: "Mathematics",
    level: "olevel",
    topic: "Volume",
    keywords: ["volume", "cuboid", "cylinder", "prism", "capacity", "mensuration"],
    build(rng): BuiltItem {
      if (rng.int(0, 1) === 0) {
        const l = rng.int(3, 15), w = rng.int(2, 12), h = rng.int(2, 10);
        return { question: `A cuboid measures ${l} cm by ${w} cm by ${h} cm. Find its volume.`, numeric: { ...exactInteger(l * w * h), unit: "cm^3" }, working: [`Volume = l × w × h = ${l} × ${w} × ${h} = ${l * w * h}`], marks: 2, params: { kind: "cuboid", a: l, b: w, c: h } };
      }
      const m = rng.int(1, 3);
      const r = 7 * m;
      const h = rng.int(2, 15);
      return { question: `A cylinder has a radius of ${r} cm and a height of ${h} cm. Find its volume. Use $\\pi = \\frac{22}{7}$.`, numeric: { ...exactInteger(154 * m * m * h), unit: "cm^3" }, working: [`Volume = πr²h = 22/7 × ${r} × ${r} × ${h} = ${154 * m * m * h}`], marks: 3, params: { kind: "cylinder", a: r, b: h, c: 0 } };
    },
  },
  {
    id: "maths.jr.median-range",
    subject: "Mathematics",
    level: "olevel",
    topic: "Statistics",
    keywords: ["statistics", "median", "range", "mode", "data", "average", "averages"],
    build(rng): BuiltItem {
      const size = rng.pick([7, 9]);
      const values: number[] = [];
      while (values.length < size) {
        const v = rng.int(1, 40);
        if (!values.includes(v)) values.push(v);
      }
      const sorted = [...values].sort((a, b) => a - b);
      const askMedian = rng.int(0, 1) === 1;
      return {
        question: askMedian ? `Find the median of these numbers: ${values.join(", ")}.` : `Find the range of these numbers: ${values.join(", ")}.`,
        numeric: exactInteger(askMedian ? sorted[(size - 1) / 2] : sorted[size - 1] - sorted[0]),
        working: [`In order: ${sorted.join(", ")}`, askMedian ? `The middle value is ${sorted[(size - 1) / 2]}` : `Range = ${sorted[size - 1]} − ${sorted[0]} = ${sorted[size - 1] - sorted[0]}`],
        marks: 2,
        params: { data: values.join(","), askMedian: askMedian ? 1 : 0 },
      };
    },
  },
];
