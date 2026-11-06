import { describe, expect, it } from "vitest";
import { ALL_GENERATORS, formatAnswer } from "./index";
import { markNumeric } from "./numeric";
import { createRng } from "./rng";
import { AR, formulaMass } from "./generators/chemistry";

const SEEDS = Array.from({ length: 250 }, (_, i) => i * 2654435 + 17);
const near = (a: number, b: number, relative = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(Math.abs(b) * relative + 1e-9);
const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));

type P = Record<string, number | string>;
const n = (value: number | string) => Number(value);

/** Independent re-derivations: written differently from the generators so a shared mistake is unlikely. */
const INDEPENDENT: Record<string, (p: P, exact: number) => void> = {
  "maths.quadratic-roots": (p, exact) => {
    expect(exact).toBe(n(p.high));
    expect(n(p.high) ** 2 + n(p.b) * n(p.high) + n(p.c)).toBe(0);
    expect(n(p.low) ** 2 + n(p.b) * n(p.low) + n(p.c)).toBe(0);
    expect(n(p.high)).toBeGreaterThan(n(p.low));
  },
  "maths.discriminant": (p, exact) => expect(exact).toBe(n(p.b) ** 2 - 4 * n(p.a) * n(p.c)),
  "maths.differentiate-at-point": (p, exact) => {
    const f = (x: number) => n(p.a) * x ** 3 + n(p.b) * x ** 2 + n(p.c) * x + n(p.d);
    const h = 1e-4;
    expect(Math.abs((f(n(p.k) + h) - f(n(p.k) - h)) / (2 * h) - exact)).toBeLessThan(1e-3);
  },
  "maths.definite-integral": (p, exact) => {
    const g = (x: number) => 3 * n(p.a) * x * x + 2 * n(p.b) * x + n(p.c);
    const k = n(p.k), steps = 2000;
    let sum = g(0) + g(k);
    for (let i = 1; i < steps; i++) sum += g((i * k) / steps) * (i % 2 ? 4 : 2);
    expect(Math.abs((sum * k) / (3 * steps) - exact)).toBeLessThan(1e-6);
  },
  "maths.arithmetic-sum": (p, exact) => {
    let sum = 0;
    for (let i = 0; i < n(p.n); i++) sum += n(p.a) + i * n(p.d);
    expect(exact).toBe(sum);
  },
  "maths.geometric-infinity": (p, exact) => {
    let sum = 0, term = n(p.a);
    for (let i = 0; i < 400; i++) { sum += term; term *= n(p.p) / n(p.q); }
    near(sum, exact, 1e-9);
  },
  "maths.simultaneous": (p, exact) => {
    expect(n(p.a1) * n(p.x) + n(p.b1) * n(p.y)).toBe(n(p.c1));
    expect(n(p.a2) * n(p.x) + n(p.b2) * n(p.y)).toBe(n(p.c2));
    expect(n(p.a1) * n(p.b2) - n(p.a2) * n(p.b1)).not.toBe(0);
    expect(exact).toBe(n(p.x));
  },
  "maths.logarithm": (p, exact) => near(Math.log(n(p.base) ** n(p.n)) / Math.log(n(p.base)), exact, 1e-9),
  "maths.right-triangle-side": (p, exact) => {
    expect(exact).toBeGreaterThan(0);
    expect(exact).toBeLessThan(n(p.h));
    near(Math.hypot(exact, n(p.h) * Math.cos((n(p.theta) * Math.PI) / 180)), n(p.h), 1e-9);
  },
  "maths.median": (p, exact) => {
    const values = String(p.data).split(",").map(Number).sort((a, b) => a - b);
    expect(values[3]).toBe(exact);
  },
  "maths.independent-probability": (p, exact) => near(1 / (n(p.a) * n(p.b)), exact),
  "maths.mean": (p, exact) => {
    const data = String(p.data).split(",").map(Number);
    near(data.reduce((s, v) => s + v, 0) / data.length, exact);
  },
  "maths.binomial-coefficient": (p, exact) => expect(exact).toBe(factorial(n(p.n)) / (factorial(n(p.r)) * factorial(n(p.n) - n(p.r)))),
  "maths.gradient": (p, exact) => expect((n(p.y1) + n(p.m) * n(p.dx) - n(p.y1)) / ((n(p.x1) + n(p.dx)) - n(p.x1))).toBe(exact),
  "physics.suvat-v": (p, exact) => expect(exact).toBe(n(p.u) + n(p.a) * n(p.t)),
  "physics.suvat-s": (p, exact) => near(((n(p.u) + (n(p.u) + n(p.a) * n(p.t))) / 2) * n(p.t), exact),
  "physics.newton-second": (p, exact) => near(exact * n(p.m) + n(p.f), n(p.applied)),
  "physics.kinetic-energy": (p, exact) => near((n(p.m) * n(p.v) * n(p.v)) / 2, exact),
  "physics.gravitational-pe": (p, exact) => near(n(p.m) * n(p.h) * 9.81, exact),
  "physics.power": (p, exact) => near(exact * n(p.t), n(p.work)),
  "physics.momentum-collision": (p, exact) => near((n(p.m1) + n(p.m2)) * exact, n(p.m1) * n(p.u1)),
  "physics.parallel-resistors": (p, exact) => near(1 / exact, 1 / n(p.r1) + 1 / n(p.r2)),
  "physics.ohms-law": (p, exact) => near(exact * n(p.r), n(p.v)),
  "physics.wave-speed": (p, exact) => near(exact / n(p.f), n(p.lambda), 1e-9),
  "physics.pressure": (p, exact) => near(exact * n(p.a), n(p.f)),
  "physics.half-life": (p, exact) => {
    expect(exact * 2 ** n(p.halfLives)).toBe(n(p.start));
    expect(Number.isInteger(exact)).toBe(true);
  },
  "chemistry.relative-formula-mass": (p, exact) => near(exact, formulaMass(String(p.formula))),
  "chemistry.moles-from-mass": (p, exact) => near(exact * formulaMass(String(p.formula)), n(p.mass)),
  "chemistry.mass-from-moles": (p, exact) => near(exact / n(p.n), formulaMass(String(p.formula))),
  "chemistry.concentration": (p, exact) => near(exact * (n(p.volume) / 1000), n(p.n)),
  "chemistry.gas-volume": (p, exact) => near(exact / 24, n(p.n)),
  "chemistry.ph-strong-acid": (p, exact) => near(10 ** -exact, n(p.c), 1e-9),
  "chemistry.percentage-yield": (p, exact) => {
    near((exact / 100) * n(p.theoretical), n(p.actual));
    expect(exact).toBeLessThan(100);
  },
  "chemistry.dilution": (p, exact) => near(0 + exact * n(p.c2), n(p.c1) * n(p.v1)),
  "cs.binary-to-denary": (p, exact) => expect(exact).toBe(parseInt(String(p.bits), 2)),
  "cs.hex-to-denary": (p, exact) => expect(exact).toBe(parseInt(String(p.hex), 16)),
  "cs.image-file-size": (p, exact) => expect(exact * 8).toBe(n(p.w) * n(p.h) * n(p.depth)),
  "cs.sound-file-size": (p, exact) => expect(exact * 8).toBe(n(p.rate) * n(p.seconds) * n(p.depth)),
  // Form 1-4 Mathematics
  "maths.jr.percentage-of": (p, exact) => near((n(p.amount) / 100) * n(p.pct), exact),
  "maths.jr.percentage-change": (p, exact) => near((Math.abs(n(p.newValue) - n(p.oldValue)) / n(p.oldValue)) * 100, exact, 1e-9),
  "maths.jr.simple-interest": (p, exact) => near((n(p.principal) * n(p.rate) * n(p.years)) / 100, exact),
  "maths.jr.ratio-share": (p, exact) => {
    const parts = n(p.a) + n(p.b);
    expect(n(p.total) % parts).toBe(0);
    expect(n(p.a)).not.toBe(n(p.b));
    near((n(p.total) / parts) * Math.max(n(p.a), n(p.b)), exact);
  },
  "maths.jr.direct-proportion": (p, exact) => near((n(p.unitCents) * n(p.n2)) / 100, exact),
  "maths.jr.linear-equation": (p, exact) => {
    expect(n(p.a) * exact + n(p.b)).toBe(n(p.c) * exact + n(p.d));
    expect(n(p.a)).toBeGreaterThan(n(p.c));
  },
  "maths.jr.substitution": (p, exact) => expect(n(p.a) * n(p.x) ** 2 + n(p.b) * n(p.y)).toBe(exact),
  "maths.jr.indices": (p, exact) =>
    p.kind === "indices"
      ? near((n(p.base) ** n(p.p) * n(p.base) ** n(p.q)) / n(p.base) ** n(p.r), exact)
      : near(Number(`${n(p.mantissaTenths) / 10}e${n(p.exponent)}`), exact),
  "maths.jr.pythagoras": (p, exact) => {
    expect(n(p.a) ** 2 + n(p.b) ** 2).toBe(n(p.c) ** 2);
    expect(exact).toBe(n(p.findHypotenuse) === 1 ? n(p.c) : n(p.b));
  },
  "maths.jr.area-perimeter": (p, exact) => {
    const a = n(p.a), b = n(p.b);
    if (p.kind === "rectangle") expect(exact).toBe(a * b);
    else if (p.kind === "triangle") near(0.5 * a * b, exact);
    else if (p.kind === "circle-area") near((22 / 7) * a * a, exact);
    else near(2 * (22 / 7) * a, exact);
  },
  "maths.jr.angles": (p, exact) => {
    if (p.kind === "sum") expect(exact).toBe((n(p.a) - 2) * 180);
    else if (p.kind === "regular") {
      expect(360 % n(p.a)).toBe(0);
      expect(exact).toBe(180 - 360 / n(p.a));
    } else expect(exact).toBe(180 - n(p.a) - n(p.b));
    expect(exact).toBeGreaterThan(0);
  },
  "maths.jr.speed-distance-time": (p, exact) => {
    expect(Number.isInteger(n(p.distance))).toBe(true);
    near(n(p.speed) * n(p.time), n(p.distance));
    near(p.kind === "speed" ? n(p.distance) / n(p.time) : p.kind === "time" ? n(p.distance) / n(p.speed) : n(p.speed) * n(p.time), exact);
  },
  "maths.jr.hcf-lcm": (p, exact) => {
    const a = n(p.a), b = n(p.b);
    let g = 1;
    for (let d = Math.min(a, b); d >= 1; d--) if (a % d === 0 && b % d === 0) { g = d; break; }
    expect(exact).toBe(n(p.askHcf) === 1 ? g : (a * b) / g);
  },
  "maths.jr.probability": (p, exact) => {
    expect(n(p.blue)).toBeGreaterThan(0);
    expect(n(p.green)).toBeGreaterThan(0);
    expect(Math.abs(n(p.red) / (n(p.red) + n(p.blue) + n(p.green)) - exact)).toBeLessThan(0.0006);
  },
  "maths.jr.nth-term": (p, exact) => {
    let term = n(p.first);
    for (let i = 1; i < n(p.n); i++) term += n(p.diff);
    expect(term).toBe(exact);
  },
  "maths.jr.fractions": (p, exact) => {
    if (p.kind === "of") expect((n(p.a) / n(p.q)) * n(p.p)).toBe(exact);
    else expect(Math.abs(n(p.p) / n(p.q) + n(p.r) / n(p.s) - exact)).toBeLessThan(0.0006);
  },
  "maths.jr.volume": (p, exact) => (p.kind === "cuboid" ? expect(n(p.a) * n(p.b) * n(p.c)).toBe(exact) : near((22 / 7) * n(p.a) ** 2 * n(p.b), exact)),
  "maths.jr.median-range": (p, exact) => {
    const data = String(p.data).split(",").map(Number).sort((x, y) => x - y);
    expect(new Set(data).size).toBe(data.length);
    if (n(p.askMedian) === 1) expect(data[Math.floor(data.length / 2)]).toBe(exact);
    else expect(data[data.length - 1] - data[0]).toBe(exact);
  },
};

describe("generator catalogue", () => {
  it("has a unique id and an independent check for every generator", () => {
    const ids = ALL_GENERATORS.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(INDEPENDENT[id], `missing independent check for ${id}`).toBeTypeOf("function");
    expect(ALL_GENERATORS.length).toBeGreaterThanOrEqual(35);
  });

  for (const generator of ALL_GENERATORS) {
    describe(generator.id, () => {
      it("builds valid, deterministic, independently-correct questions across many seeds", () => {
        for (const seed of SEEDS) {
          const item = generator.build(createRng(seed));
          expect(item.question.trim().length).toBeGreaterThan(10);
          expect(Number.isFinite(item.numeric.exact)).toBe(true);
          expect(item.numeric.tolerance).toBeGreaterThan(0);
          expect(item.working.length).toBeGreaterThan(0);
          expect(item.marks).toBeGreaterThanOrEqual(1);
          expect(item.question).not.toMatch(/NaN|undefined|Infinity/);
          expect(generator.build(createRng(seed))).toEqual(item);
          INDEPENDENT[generator.id](item.params as P, item.numeric.exact);
        }
      });

      it("accepts its own displayed answer and rejects a clearly wrong one", () => {
        for (const seed of SEEDS.slice(0, 80)) {
          const item = generator.build(createRng(seed));
          const shown = formatAnswer(item.numeric);
          expect(markNumeric(shown, item.numeric).correct, `${generator.id} rejected its own answer "${shown}"`).toBe(true);
          const wrong = item.numeric.exact + Math.max(10 * item.numeric.tolerance, Math.abs(item.numeric.exact) * 0.2, 5);
          expect(markNumeric(String(wrong), item.numeric).correct).toBe(false);
        }
      });
    });
  }
});

describe("formulaMass", () => {
  it("matches hand-calculated relative formula masses", () => {
    expect(formulaMass("H2O")).toBeCloseTo(18.0, 5);
    expect(formulaMass("CaCO3")).toBeCloseTo(100.1, 5);
    expect(formulaMass("Mg(OH)2")).toBeCloseTo(58.3, 5);
    expect(formulaMass("Al2O3")).toBeCloseTo(102.0, 5);
    expect(formulaMass("CuSO4")).toBeCloseTo(159.6, 5);
    expect(formulaMass("H2SO4")).toBeCloseTo(98.1, 5);
    expect(Object.keys(AR)).toContain("Mg");
  });
});
