/**
 * Central qualification mapping used by the ingestion script as a fallback
 * when the database does not provide an authoritative mapping.
 *
 * Exported shape:
 * export const QUALIFICATION_MAPPING: Record<string, Record<string, string>>
 *
 * Outer key: syllabus id (string)
 * Inner key: paper number as string, or "null" for entries without paper number
 * Value: qualification level string (e.g., "AS Level", "A Level").
 *
 * NOTE: This file is intentionally a small, single source of truth. Do not
 * duplicate mappings elsewhere. Prefer adding mappings to the database table
 * `qualification_mappings` when possible. If that table isn't available, edit
 * this file to add authoritative mappings before running the importer.
 */

export const QUALIFICATION_MAPPING: Record<string, Record<string, string>> = {
  // Example mappings (uncomment and edit to enable):
  // "9709": {
  //   // Paper 1 = AS Level, Paper 2 = AS Level, Paper 5 = A Level, Paper 6 = A Level
  //   "1": "AS Level",
  //   "2": "AS Level",
  //   "5": "A Level",
  //   "6": "A Level",
  //   // Grade thresholds / inserts (no paper number):
  //   "null": "A Level"
  // },
  // "9702": {
  //   "1": "AS Level",
  //   "2": "AS Level",
  //   "5": "A Level",
  //   "6": "A Level",
  // }
};
