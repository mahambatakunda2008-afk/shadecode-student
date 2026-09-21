import syllabus from "./cambridge-9709-2026-2027.json";
import { buildSyllabusRows, canonicalRowLine, compareObjectiveKeys, type SyllabusDataset, type SyllabusRow } from "./syllabus-dataset";

/**
 * Cambridge International AS & A Level Mathematics 9709 (syllabus for 2026 and 2027, version 4,
 * December 2025), structured from the official PDF:
 * https://www.cambridgeinternational.org/Images/697427-2026-2027-syllabus.pdf
 */
export type Cambridge9709Row = SyllabusRow;
export const CAMBRIDGE_9709_IDENTITY = syllabus.meta;
export const buildCambridge9709Rows = (): Cambridge9709Row[] => buildSyllabusRows(syllabus as SyllabusDataset);
export { canonicalRowLine, compareObjectiveKeys };
