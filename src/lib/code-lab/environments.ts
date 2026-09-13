/**
 * Backward-compatible exports for the old Code Lab module path.
 *
 * The student-facing computing environment is now Comp Lab. Existing imports
 * can migrate incrementally without breaking the workspace during the rename.
 */
export {
  COMP_LAB_ENVIRONMENTS,
  getCompLabEnvironment,
  findCompLabEnvironmentForPath,
  isExecutableCompLabLanguage,
} from "@/lib/comp-lab/environments";

export type {
  CompLabProjectType as CodeLabProjectType,
  CompLabLanguage as CodeLabLanguage,
  CompLabCapabilityStatus as CodeLabCapabilityStatus,
  CompLabEnvironment as CodeLabEnvironment,
} from "@/lib/comp-lab/environments";

export { COMP_LAB_ENVIRONMENTS as CODE_LAB_ENVIRONMENTS } from "@/lib/comp-lab/environments";
export { getCompLabEnvironment as getCodeLabEnvironment } from "@/lib/comp-lab/environments";
export { findCompLabEnvironmentForPath as findCodeLabEnvironmentForPath } from "@/lib/comp-lab/environments";
export { isExecutableCompLabLanguage as isExecutableCodeLabLanguage } from "@/lib/comp-lab/environments";
