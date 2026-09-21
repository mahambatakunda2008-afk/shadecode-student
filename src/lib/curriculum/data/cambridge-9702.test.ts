import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildCambridge9702Rows, CAMBRIDGE_9702_IDENTITY } from "./cambridge-9702";
import { canonicalRowLine } from "./syllabus-dataset";

// Independent transcription of the official "Content overview" (syllabus p. 10) and, for each numbered
// subsection in "3 Subject content" (pp. 16-39), the number of "Candidates should be able to" outcomes.
const OFFICIAL: Array<[string, string, Array<[string, string, number]>]> = [
  ["1", "Physical quantities and units", [["1.1", "Physical quantities", 2], ["1.2", "SI units", 4], ["1.3", "Errors and uncertainties", 3], ["1.4", "Scalars and vectors", 3]]],
  ["2", "Kinematics", [["2.1", "Equations of motion", 9]]],
  ["3", "Dynamics", [["3.1", "Momentum and Newton's laws of motion", 6], ["3.2", "Non-uniform motion", 3], ["3.3", "Linear momentum and its conservation", 4]]],
  ["4", "Forces, density and pressure", [["4.1", "Turning effects of forces", 4], ["4.2", "Equilibrium of forces", 3], ["4.3", "Density and pressure", 6]]],
  ["5", "Work, energy and power", [["5.1", "Energy conservation", 7], ["5.2", "Gravitational potential energy and kinetic energy", 4]]],
  ["6", "Deformation of solids", [["6.1", "Stress and strain", 6], ["6.2", "Elastic and plastic behaviour", 4]]],
  ["7", "Waves", [["7.1", "Progressive waves", 7], ["7.2", "Transverse and longitudinal waves", 2], ["7.3", "Doppler effect for sound waves", 2], ["7.4", "Electromagnetic spectrum", 3], ["7.5", "Polarisation", 2]]],
  ["8", "Superposition", [["8.1", "Stationary waves", 4], ["8.2", "Diffraction", 2], ["8.3", "Interference", 4], ["8.4", "The diffraction grating", 2]]],
  ["9", "Electricity", [["9.1", "Electric current", 4], ["9.2", "Potential difference and power", 3], ["9.3", "Resistance and resistivity", 8]]],
  ["10", "D.C. circuits", [["10.1", "Practical circuits", 5], ["10.2", "Kirchhoff's laws", 7], ["10.3", "Potential dividers", 4]]],
  ["11", "Particle physics", [["11.1", "Atoms, nuclei and radiation", 12], ["11.2", "Fundamental particles", 6]]],
  ["12", "Motion in a circle", [["12.1", "Kinematics of uniform circular motion", 3], ["12.2", "Centripetal acceleration", 4]]],
  ["13", "Gravitational fields", [["13.1", "Gravitational field", 2], ["13.2", "Gravitational force between point masses", 4], ["13.3", "Gravitational field of a point mass", 3], ["13.4", "Gravitational potential", 3]]],
  ["14", "Temperature", [["14.1", "Thermal equilibrium", 2], ["14.2", "Temperature scales", 4], ["14.3", "Specific heat capacity and specific latent heat", 2]]],
  ["15", "Ideal gases", [["15.1", "The mole", 2], ["15.2", "Equation of state", 3], ["15.3", "Kinetic theory of gases", 4]]],
  ["16", "Thermodynamics", [["16.1", "Internal energy", 2], ["16.2", "The first law of thermodynamics", 2]]],
  ["17", "Oscillations", [["17.1", "Simple harmonic oscillations", 5], ["17.2", "Energy in simple harmonic motion", 2], ["17.3", "Damped and forced oscillations, resonance", 3]]],
  ["18", "Electric fields", [["18.1", "Electric fields and field lines", 3], ["18.2", "Uniform electric fields", 2], ["18.3", "Electric force between point charges", 2], ["18.4", "Electric field of a point charge", 1], ["18.5", "Electric potential", 4]]],
  ["19", "Capacitance", [["19.1", "Capacitors and capacitance", 4], ["19.2", "Energy stored in a capacitor", 2], ["19.3", "Discharging a capacitor", 3]]],
  ["20", "Magnetic fields", [["20.1", "Concept of a magnetic field", 2], ["20.2", "Force on a current-carrying conductor", 3], ["20.3", "Force on a moving charge", 6], ["20.4", "Magnetic fields due to currents", 3], ["20.5", "Electromagnetic induction", 5]]],
  ["21", "Alternating currents", [["21.1", "Characteristics of alternating currents", 4], ["21.2", "Rectification and smoothing", 4]]],
  ["22", "Quantum physics", [["22.1", "Energy and momentum of a photon", 5], ["22.2", "Photoelectric effect", 5], ["22.3", "Wave-particle duality", 4], ["22.4", "Energy levels in atoms and line spectra", 3]]],
  ["23", "Nuclear physics", [["23.1", "Mass defect and nuclear binding energy", 7], ["23.2", "Radioactive decay", 6]]],
  ["24", "Medical physics", [["24.1", "Production and use of ultrasound", 6], ["24.2", "Production and use of X-rays", 4], ["24.3", "PET scanning", 6]]],
  ["25", "Astronomy and cosmology", [["25.1", "Standard candles", 4], ["25.2", "Stellar radii", 3], ["25.3", "Hubble's law and the Big Bang theory", 4]]],
];

// md5 of the canonical rows, identical to the checksum verified against the production database.
const EXPECTED_ROWS_MD5 = "9fe5528df59f72e795dcbd6fb7fe2ff8";

describe("Cambridge 9702 (2025-2027) curriculum data", () => {
  const rows = buildCambridge9702Rows();

  it("carries the canonical identity the resolver matches on", () => {
    expect(CAMBRIDGE_9702_IDENTITY).toMatchObject({
      boardId: "cambridge",
      qualificationId: "cambridge-as-a-level",
      syllabusId: "cambridge-9702",
      syllabusVersion: "2025-2027",
      subjectId: "physics",
      sourceUrl: "https://www.cambridgeinternational.org/Images/664565-2025-2027-syllabus.pdf",
    });
    expect(CAMBRIDGE_9702_IDENTITY.effectiveFrom < CAMBRIDGE_9702_IDENTITY.effectiveTo).toBe(true);
  });

  it("has the official 25 topics, 76 subsections and 300 outcomes (325 rows)", () => {
    expect(rows.filter((r) => r.parent_key === null)).toHaveLength(25);
    expect(new Set(rows.filter((r) => r.topic).map((r) => r.topic)).size).toBe(76);
    expect(rows.filter((r) => r.parent_key !== null)).toHaveLength(300);
    expect(rows).toHaveLength(325);
  });

  it("matches the official topic names, subsection titles, order and outcome counts", () => {
    for (const [sectionKey, sectionTitle, subsections] of OFFICIAL) {
      expect(rows.find((r) => r.objective_key === sectionKey)?.title, sectionKey).toBe(sectionTitle);
      for (const [subKey, subTitle, count] of subsections) {
        const outcomes = rows.filter((r) => r.topic === subKey);
        expect(outcomes, `${subKey} ${subTitle}`).toHaveLength(count);
        expect(new Set(outcomes.map((r) => r.title))).toEqual(new Set([subTitle]));
        expect(outcomes.every((r) => r.parent_key === sectionKey)).toBe(true);
      }
    }
  });

  it("uses the official outcome numbering (e.g. the syllabus's own citations 3.3.3, 7.5.2, 15.3.4, 25.3.1)", () => {
    // The syllabus's change notes (p. 67) cite these outcomes by number; ours must land on the same topics.
    const byKey = (key: string) => rows.find((r) => r.objective_key === key)?.description ?? "";
    expect(byKey("3.3.3")).toMatch(/elastic collision/i);
    expect(byKey("7.5.2")).toMatch(/Malus/);
    expect(byKey("15.3.4")).toMatch(/kinetic energy/i);
    expect(byKey("25.3.1")).toMatch(/emission and absorption spectra/i);
  });

  it("keeps keys unique and sequential within each subsection", () => {
    const keys = rows.map((r) => r.objective_key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const topic of new Set(rows.filter((r) => r.topic).map((r) => r.topic as string))) {
      const numbers = rows.filter((r) => r.topic === topic).map((r) => Number(r.objective_key.split(".")[2]));
      expect(numbers).toEqual(numbers.map((_, i) => i + 1));
    }
  });

  it("marks topics 1-11 as AS Level and 12-25 as A Level only", () => {
    for (let n = 1; n <= 25; n++) {
      expect(rows.find((r) => r.objective_key === String(n))?.education_level, `topic ${n}`).toBe(n <= 11 ? "as_level" : "a_level");
    }
  });

  it("has clean statements with no stray whitespace or control characters", () => {
    for (const row of rows) {
      expect(row.description.trim(), row.objective_key).toBe(row.description);
      expect(row.description).not.toMatch(/[\u0000-\u001f]/);
      expect(row.description.endsWith("."), row.objective_key).toBe(true);
      // Some outcomes are legitimately terse (e.g. "Use Δp = ρgΔh."); this only rejects empty or truncated text.
      expect(row.description.length, row.objective_key).toBeGreaterThan(10);
    }
  });

  it("matches the checksum recorded in the production database", () => {
    const md5 = createHash("md5").update(rows.map(canonicalRowLine).join("\n"), "utf8").digest("hex");
    expect(md5).toBe(EXPECTED_ROWS_MD5);
  });
});
