export type CurriculumLocalization = {
  countryCode: string;
  examBoard?: string; // e.g., ZIMSEC, GCSE, AP
  recommendedBoosts?: string[]; // subject interests to boost for learning path initialization
  terminology?: Record<string, string>; // optional local term mapping
};

// Map by ISO country code (uppercase)
export const CURRICULUM_MAP: Record<string, CurriculumLocalization> = {
  ZW: {
    countryCode: 'ZW',
    examBoard: 'ZIMSEC',
    recommendedBoosts: ['mathematics', 'english'],
    terminology: { secondary: 'Ordinary Level / Advanced Level' },
  },
  GB: {
    countryCode: 'GB',
    examBoard: 'GCSE/A-Level',
    recommendedBoosts: ['mathematics', 'english'],
    terminology: { secondary: 'GCSE / A-Level' },
  },
  US: {
    countryCode: 'US',
    examBoard: 'K-12 / AP',
    recommendedBoosts: ['mathematics', 'english', 'science'],
    terminology: { secondary: 'K-12', university: 'Undergraduate' },
  },
  IN: {
    countryCode: 'IN',
    examBoard: 'CBSE/State',
    recommendedBoosts: ['mathematics', 'science'],
  },
  INTL: {
    countryCode: 'INTL',
    examBoard: 'International',
    recommendedBoosts: [],
  },
};

export function lookupLocalization(countryCode?: string) {
  if (!countryCode) return CURRICULUM_MAP.INTL;
  const key = countryCode.toUpperCase();
  return CURRICULUM_MAP[key] ?? CURRICULUM_MAP.INTL;
}
