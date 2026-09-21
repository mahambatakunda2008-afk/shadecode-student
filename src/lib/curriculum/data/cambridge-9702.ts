import syllabus from "./cambridge-9702-2025-2027.json";
import { buildSyllabusRows, type SyllabusDataset } from "./syllabus-dataset";

/**
 * Cambridge International AS & A Level Physics 9702 (syllabus for 2025, 2026 and 2027, version 1,
 * September 2022), structured from the official PDF:
 * https://www.cambridgeinternational.org/Images/664565-2025-2027-syllabus.pdf
 *
 * Topics 1-11 are AS Level content; topics 12-25 are A Level only. The practical assessment
 * (Papers 3 and 5, syllabus section 5) is not represented as objectives.
 */
export const CAMBRIDGE_9702_IDENTITY = syllabus.meta;
export const buildCambridge9702Rows = () => buildSyllabusRows(syllabus as SyllabusDataset);
