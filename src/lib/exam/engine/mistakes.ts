/**
 * src/lib/exam/engine/mistakes.ts
 *
 * The classic wrong answers for each question type, computed from the same
 * parameters as the question. A wrong answer that matches one gets a specific,
 * kind hint ("you forgot the ½") instead of a bare "incorrect", and the mistake
 * id is recorded so the platform can learn which mistakes are common.
 *
 * This is expert knowledge written down, not a model: it is exact, instant and
 * works from the very first student.
 */

import { formulaMassIgnoringCounts } from "./generators/chemistry";
import { mistakeAllowance, type NumericMistake } from "./numeric";

type P = Record<string, number | string>;
type Entry = [value: number, id: string, hint: string];
const n = (value: number | string) => Number(value);
const factorial = (value: number): number => (value <= 1 ? 1 : value * factorial(value - 1));

export const MISTAKES: Record<string, (p: P, exact: number) => Entry[]> = {
  "maths.quadratic-roots": (p) => [
    [n(p.low), "other-root", "That is the smaller root. The question asks for the larger one."],
    [-n(p.high), "sign-slip", "Check the sign: if (x − r) = 0 then x = +r."],
  ],
  "maths.discriminant": (p) => [
    [n(p.b) ** 2 - n(p.a) * n(p.c), "forgot-4", "The discriminant is b² − 4ac. Don't forget the 4."],
    [n(p.b) ** 2 + 4 * n(p.a) * n(p.c), "sign-of-4ac", "The 4ac term is subtracted, so mind its sign."],
  ],
  "maths.differentiate-at-point": (p) => {
    const [a, b, c, d, k] = [n(p.a), n(p.b), n(p.c), n(p.d), n(p.k)];
    return [
      [a * k ** 3 + b * k ** 2 + c * k + d, "evaluated-f", "You evaluated f(x). The question asks for the gradient f′(x)."],
      [3 * a * k * k + b * k + c, "dropped-the-2", "Differentiating bx² gives 2bx. Don't drop the 2."],
    ];
  },
  "maths.definite-integral": (p) => {
    const [a, b, c, k] = [n(p.a), n(p.b), n(p.c), n(p.k)];
    return [
      [3 * a * k * k + 2 * b * k + c, "evaluated-integrand", "You evaluated the expression itself. Integrate first, then substitute the limits."],
      [3 * a * k ** 3 + 2 * b * k ** 2 + c * k, "forgot-to-divide", "When integrating, divide by the new power: xⁿ becomes xⁿ⁺¹ ÷ (n + 1)."],
    ];
  },
  "maths.arithmetic-sum": (p) => [
    [n(p.n) * (2 * n(p.a) + (n(p.n) - 1) * n(p.d)), "forgot-half", "Remember the ½: Sₙ = (n/2)(2a + (n − 1)d)."],
    [n(p.a) + (n(p.n) - 1) * n(p.d), "nth-term", "That is the nth term, not the sum of n terms."],
  ],
  "maths.geometric-infinity": (p) => {
    const [a, r] = [n(p.a), n(p.p) / n(p.q)];
    return [
      [a / (1 + r), "sign-of-r", "The sum to infinity is a ÷ (1 − r). The denominator has a minus."],
      [(a * r) / (1 - r), "started-at-second-term", "Start from the first term a, not from ar."],
    ];
  },
  "maths.simultaneous": (p) => [
    [n(p.y), "gave-y", "You found y. The question asks for x."],
    [-n(p.x), "sign-slip", "Check the sign of x when you substitute back."],
  ],
  "maths.logarithm": (p) => [
    [n(p.base) * n(p.n), "multiplied", "A logarithm is the power, not a product: log_b(bⁿ) = n."],
    [n(p.base) ** n(p.n), "gave-the-number", "That is the number inside the log. The answer is the power you raise the base to."],
  ],
  "maths.right-triangle-side": (p) => [
    [n(p.h) * Math.sin(n(p.theta)), "radians-mode", "Your calculator is in radians. Switch it to degrees."],
    [n(p.h) * Math.cos((n(p.theta) * Math.PI) / 180), "used-cosine", "The side opposite the angle uses sine (SOH), not cosine."],
  ],
  "maths.mean": (p) => [[String(p.data).split(",").map(Number).reduce((s, v) => s + v, 0), "forgot-to-divide", "Divide the total by how many values there are."]],
  "maths.binomial-coefficient": (p) => [[factorial(n(p.n)) / factorial(n(p.n) - n(p.r)), "permutation", "Order does not matter here, so also divide by r!."]],
  "maths.gradient": (p) => [
    [1 / n(p.m), "inverted", "Gradient is change in y ÷ change in x, not the other way round."],
    [-n(p.m), "sign-slip", "Check the signs when you subtract the coordinates."],
  ],

  "physics.suvat-v": (p) => [[n(p.a) * n(p.t), "forgot-initial-speed", "Add the initial speed: v = u + at."]],
  "physics.suvat-s": (p) => [
    [n(p.u) * n(p.t) + n(p.a) * n(p.t) ** 2, "forgot-half", "The acceleration term has a ½: s = ut + ½at²."],
    [(n(p.u) + n(p.a) * n(p.t)) * n(p.t), "used-final-speed", "Use the average speed (or ut + ½at²), not final speed × time."],
  ],
  "physics.newton-second": (p) => [
    [n(p.applied) / n(p.m), "ignored-friction", "Use the resultant force: the applied force minus friction."],
    [(n(p.applied) + n(p.f)) / n(p.m), "added-friction", "Friction opposes the motion, so subtract it."],
  ],
  "physics.kinetic-energy": (p) => [
    [n(p.m) * n(p.v) ** 2, "forgot-half", "Kinetic energy is ½mv². Don't forget the ½."],
    [0.5 * n(p.m) * n(p.v), "forgot-to-square", "The speed is squared in ½mv²."],
  ],
  "physics.gravitational-pe": (p) => [
    [n(p.m) * 10 * n(p.h), "used-g-10", "Use g = 9.81 m s⁻² as stated in the question."],
    [n(p.m) * n(p.h), "forgot-g", "Multiply by g as well: ΔEp = mgΔh."],
  ],
  "physics.power": (p) => [[n(p.work) * n(p.t), "multiplied", "Power is work divided by time, not multiplied."]],
  "physics.momentum-collision": (p) => [
    [n(p.u1), "ignored-masses", "Use conservation of momentum: m₁u₁ = (m₁ + m₂)v."],
    [(n(p.m1) * n(p.u1)) / n(p.m2), "used-one-mass", "After they stick together both masses move: divide by m₁ + m₂."],
  ],
  "physics.parallel-resistors": (p) => [
    [n(p.r1) + n(p.r2), "added-as-series", "That is the series total. For parallel, add the reciprocals."],
    [1 / n(p.r1) + 1 / n(p.r2), "forgot-to-invert", "That is 1/R. Invert it to get R."],
  ],
  "physics.ohms-law": (p) => [
    [n(p.v) * n(p.r), "multiplied", "Current is V ÷ R."],
    [n(p.r) / n(p.v), "inverted", "I = V/R, not R/V."],
  ],
  "physics.wave-speed": (p) => [[n(p.f) / n(p.lambda), "divided", "Wave speed is frequency × wavelength."]],
  "physics.pressure": (p) => [[n(p.f) * n(p.a), "multiplied", "Pressure is force ÷ area."]],
  "physics.half-life": (p) => [
    [n(p.start) / n(p.halfLives), "divided-by-count", "Each half-life halves the amount, so halve it once per half-life."],
    [n(p.start) / 2, "one-half-life-only", "Apply the halving once for every half-life that has passed."],
  ],

  "chemistry.relative-formula-mass": (p) => [[formulaMassIgnoringCounts(String(p.formula)), "ignored-subscripts", "Multiply each Aᵣ by the number of atoms in the formula."]],
  "chemistry.moles-from-mass": (p, exact) => [
    [1 / exact, "inverted", "n = m ÷ Mᵣ, not Mᵣ ÷ m."],
    [n(p.mass) * (n(p.mass) / exact), "multiplied", "Divide the mass by Mᵣ to get moles."],
  ],
  "chemistry.mass-from-moles": (p, exact) => [[n(p.n) ** 2 / exact, "inverted", "m = n × Mᵣ. You divided by Mᵣ instead of multiplying."]],
  "chemistry.concentration": (p) => [
    [n(p.n) / n(p.volume), "forgot-to-convert-volume", "Convert cm³ to dm³ first (÷ 1000)."],
    [n(p.n) * (n(p.volume) / 1000), "multiplied", "Concentration is n ÷ V."],
  ],
  "chemistry.gas-volume": (p) => [
    [n(p.n) * 22.4, "wrong-molar-volume", "At room temperature and pressure use 24 dm³ mol⁻¹, as given."],
    [n(p.n) / 24, "divided", "Volume = moles × 24, not divided by it."],
  ],
  "chemistry.ph-strong-acid": (p) => [
    [Math.log10(n(p.c)), "lost-the-minus", "pH = −log₁₀[H⁺]. Keep the minus sign."],
    [n(p.c), "gave-concentration", "That is the concentration. pH is −log₁₀ of it."],
  ],
  "chemistry.percentage-yield": (p) => [
    [(n(p.theoretical) / n(p.actual)) * 100, "inverted", "% yield = actual ÷ theoretical × 100."],
    [n(p.actual) / n(p.theoretical), "forgot-times-100", "Multiply by 100 to make it a percentage."],
  ],
  "chemistry.dilution": (p) => [[(n(p.c2) * n(p.v1)) / n(p.c1), "inverted-ratio", "Use c₁V₁ = c₂V₂, so V₂ = c₁V₁ ÷ c₂."]],

  "cs.binary-to-denary": (p) => [[parseInt(String(p.bits).split("").reverse().join(""), 2), "reversed-bits", "The leftmost bit is worth the most (128), not the least."]],
  "cs.hex-to-denary": (p) => [[parseInt(String(p.hex)[0], 16) * 10 + parseInt(String(p.hex)[1], 16), "read-as-decimal", "Each hex digit is worth 16 times the one to its right, not 10."]],
  "cs.image-file-size": (p) => [[n(p.w) * n(p.h) * n(p.depth), "left-in-bits", "That is in bits. Divide by 8 to get bytes."]],
  "cs.sound-file-size": (p) => [[n(p.rate) * n(p.seconds) * n(p.depth), "left-in-bits", "That is in bits. Divide by 8 to get bytes."]],
};

const MAX_MISTAKES = 4;

/** Mistakes for one built question: distinct from the right answer and from each other. */
export function mistakesFor(generatorId: string, params: P, exact: number, tolerance: number): NumericMistake[] {
  const build = MISTAKES[generatorId];
  if (!build) return [];
  const spec = { tolerance };
  const result: NumericMistake[] = [];
  for (const [value, id, hint] of build(params, exact)) {
    if (!Number.isFinite(value)) continue;
    // Too close to the right answer (inside its tolerance or the mistake's own window) to tell apart.
    if (Math.abs(value - exact) <= Math.max(tolerance + Math.abs(exact) * 1e-9, mistakeAllowance(spec, value))) continue;
    // Too close to an earlier mistake: students typing one would be diagnosed as the other.
    if (result.some((existing) => Math.abs(existing.value - value) <= Math.max(mistakeAllowance(spec, value), mistakeAllowance(spec, existing.value)))) continue;
    result.push({ value, id, hint });
    if (result.length === MAX_MISTAKES) break;
  }
  return result;
}
