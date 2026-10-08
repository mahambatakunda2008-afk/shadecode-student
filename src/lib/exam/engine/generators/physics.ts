import { exactInteger, roundSF } from "../numeric";
import type { QuestionGenerator } from "../types";

const G = 9.81; // Cambridge International uses g = 9.81 m s^-2

function sf3(exact: number, unit: string) {
  const { value, tolerance } = roundSF(exact, 3);
  return { rounded: value, numeric: { exact, tolerance, unit } };
}

export const physicsGenerators: QuestionGenerator[] = [
  {
    id: "physics.suvat-v",
    subject: "Physics",
    topic: "Kinematics",
    keywords: ["kinematics", "motion", "suvat", "velocity", "acceleration", "mechanics", "equations"],
    build(rng) {
      const u = rng.int(0, 20), a = rng.int(1, 5), t = rng.int(2, 10);
      const v = u + a * t;
      return {
        question: `A car accelerates uniformly from ${u} m s⁻¹ at ${a} m s⁻² for ${t} s. Calculate its final speed (m s⁻¹).`,
        numeric: { ...exactInteger(v), unit: "m s^-1" },
        working: ["$v = u + at$", `$v = ${u} + ${a}\\times${t} = ${v}$ m s⁻¹`],
        marks: 2,
        params: { u, a, t },
      };
    },
  },
  {
    id: "physics.suvat-s",
    subject: "Physics",
    topic: "Kinematics",
    keywords: ["kinematics", "motion", "suvat", "displacement", "distance", "acceleration", "mechanics"],
    build(rng) {
      const u = rng.int(0, 15), a = rng.int(1, 6), t = rng.int(2, 9);
      const exact = u * t + 0.5 * a * t * t;
      const { rounded, numeric } = sf3(exact, "m");
      return {
        question: `An object has initial speed ${u} m s⁻¹ and constant acceleration ${a} m s⁻². Calculate the distance travelled in ${t} s, to 3 significant figures (m).`,
        numeric,
        working: ["$s = ut + \\frac{1}{2}at^2$", `$s = ${u}\\times${t} + 0.5\\times${a}\\times${t}^2 = ${rounded}$ m`],
        marks: 2,
        params: { u, a, t },
      };
    },
  },
  {
    id: "physics.newton-second",
    subject: "Physics",
    topic: "Dynamics",
    keywords: ["dynamics", "newton", "force", "forces", "acceleration", "mechanics", "friction", "laws"],
    build(rng) {
      const m = rng.int(2, 20), f = rng.int(5, 15), applied = rng.int(f + 5, f + 80);
      const exact = (applied - f) / m;
      const { rounded, numeric } = sf3(exact, "m s^-2");
      return {
        question: `A ${m} kg block is pulled by a ${applied} N force against a constant frictional force of ${f} N. Calculate its acceleration, to 3 significant figures (m s⁻²).`,
        numeric,
        working: ["Resultant force $= F - f$", `$a = \\frac{F_{net}}{m} = \\frac{${applied - f}}{${m}} = ${rounded}$ m s⁻²`],
        marks: 3,
        params: { m, f, applied },
      };
    },
  },
  {
    id: "physics.kinetic-energy",
    subject: "Physics",
    topic: "Work, energy and power",
    keywords: ["energy", "kinetic", "work", "mechanics"],
    build(rng) {
      const m = rng.int(2, 30), v = rng.int(2, 25);
      const { rounded, numeric } = sf3(0.5 * m * v * v, "J");
      return {
        question: `Calculate the kinetic energy of a ${m} kg object moving at ${v} m s⁻¹, to 3 significant figures (J).`,
        numeric,
        working: ["$E_k = \\frac{1}{2}mv^2$", `$= 0.5\\times${m}\\times${v}^2 = ${rounded}$ J`],
        marks: 2,
        params: { m, v },
      };
    },
  },
  {
    id: "physics.gravitational-pe",
    subject: "Physics",
    topic: "Work, energy and power",
    keywords: ["energy", "potential", "gravitational", "height", "work", "mechanics"],
    build(rng) {
      const m = rng.int(2, 60), h = rng.int(2, 40);
      const { rounded, numeric } = sf3(m * G * h, "J");
      return {
        question: `Calculate the gain in gravitational potential energy when a ${m} kg mass is raised ${h} m. Use g = 9.81 m s⁻² and give 3 significant figures (J).`,
        numeric,
        working: ["$\\Delta E_p = mg\\Delta h$", `$= ${m}\\times9.81\\times${h} = ${rounded}$ J`],
        marks: 2,
        params: { m, h },
      };
    },
  },
  {
    id: "physics.power",
    subject: "Physics",
    topic: "Work, energy and power",
    keywords: ["power", "work", "energy", "watt"],
    build(rng) {
      const work = rng.int(2, 90) * 100, t = rng.int(4, 60);
      const { rounded, numeric } = sf3(work / t, "W");
      return {
        question: `A motor does ${work} J of work in ${t} s. Calculate its power output, to 3 significant figures (W).`,
        numeric,
        working: ["$P = \\frac{W}{t}$", `$= \\frac{${work}}{${t}} = ${rounded}$ W`],
        marks: 2,
        params: { work, t },
      };
    },
  },
  {
    id: "physics.momentum-collision",
    subject: "Physics",
    topic: "Momentum",
    keywords: ["momentum", "collision", "collisions", "conservation", "mechanics"],
    build(rng) {
      const m1 = rng.int(1, 8), u1 = rng.int(3, 15), m2 = rng.int(1, 8);
      const { rounded, numeric } = sf3((m1 * u1) / (m1 + m2), "m s^-1");
      return {
        question: `A ${m1} kg trolley moving at ${u1} m s⁻¹ collides with a stationary ${m2} kg trolley and they stick together. Calculate their common speed, to 3 significant figures (m s⁻¹).`,
        numeric,
        working: ["Momentum is conserved: $m_1u_1 = (m_1 + m_2)v$", `$v = \\frac{${m1}\\times${u1}}{${m1 + m2}} = ${rounded}$ m s⁻¹`],
        marks: 3,
        params: { m1, u1, m2 },
      };
    },
  },
  {
    id: "physics.parallel-resistors",
    subject: "Physics",
    topic: "Electric circuits",
    keywords: ["electricity", "circuit", "circuits", "resistance", "resistor", "resistors", "current", "parallel"],
    build(rng) {
      const r1 = rng.int(2, 40), r2 = rng.int(2, 40);
      const { rounded, numeric } = sf3((r1 * r2) / (r1 + r2), "ohm");
      return {
        question: `Two resistors of ${r1} Ω and ${r2} Ω are connected in parallel. Calculate their combined resistance, to 3 significant figures (Ω).`,
        numeric,
        working: ["$\\frac{1}{R} = \\frac{1}{R_1} + \\frac{1}{R_2}$", `$R = ${rounded}$ Ω`],
        marks: 2,
        params: { r1, r2 },
      };
    },
  },
  {
    id: "physics.ohms-law",
    subject: "Physics",
    topic: "Electric circuits",
    keywords: ["electricity", "circuit", "circuits", "ohm", "current", "voltage", "resistance"],
    build(rng) {
      const v = rng.int(3, 24), r = rng.int(2, 60);
      const { rounded, numeric } = sf3(v / r, "A");
      return {
        question: `A potential difference of ${v} V is applied across a ${r} Ω resistor. Calculate the current, to 3 significant figures (A).`,
        numeric,
        working: ["$I = \\frac{V}{R}$", `$= \\frac{${v}}{${r}} = ${rounded}$ A`],
        marks: 2,
        params: { v, r },
      };
    },
  },
  {
    id: "physics.wave-speed",
    subject: "Physics",
    topic: "Waves",
    keywords: ["waves", "wave", "frequency", "wavelength", "speed"],
    build(rng) {
      const f = rng.int(5, 200) * 10, lambda = rng.int(2, 90) / 10;
      const { rounded, numeric } = sf3(f * lambda, "m s^-1");
      return {
        question: `A wave has frequency ${f} Hz and wavelength ${lambda} m. Calculate its speed, to 3 significant figures (m s⁻¹).`,
        numeric,
        working: ["$v = f\\lambda$", `$= ${f}\\times${lambda} = ${rounded}$ m s⁻¹`],
        marks: 2,
        params: { f, lambda },
      };
    },
  },
  {
    id: "physics.pressure",
    subject: "Physics",
    topic: "Pressure and density",
    keywords: ["pressure", "density", "force", "area", "fluids"],
    build(rng) {
      const f = rng.int(5, 60) * 10, a = rng.int(2, 50) / 100;
      const { rounded, numeric } = sf3(f / a, "Pa");
      return {
        question: `A force of ${f} N acts on an area of ${a} m². Calculate the pressure, to 3 significant figures (Pa).`,
        numeric,
        working: ["$p = \\frac{F}{A}$", `$= \\frac{${f}}{${a}} = ${rounded}$ Pa`],
        marks: 2,
        params: { f, a },
      };
    },
  },
  {
    id: "physics.half-life",
    subject: "Physics",
    topic: "Radioactive decay",
    keywords: ["radioactivity", "radioactive", "decay", "half-life", "half", "nuclear"],
    build(rng) {
      const halfLives = rng.int(2, 5), c = rng.int(3, 40);
      const start = c * 2 ** halfLives;
      const t = rng.int(2, 30);
      return {
        question: `A sample contains ${start} undecayed nuclei. The half-life is ${t} s. How many undecayed nuclei remain after ${halfLives * t} s?`,
        numeric: exactInteger(c),
        working: [`${halfLives * t} s is ${halfLives} half-lives`, `$N = ${start}\\times\\left(\\frac{1}{2}\\right)^{${halfLives}} = ${c}$`],
        marks: 2,
        params: { halfLives, c, start, t },
      };
    },
  },
];
