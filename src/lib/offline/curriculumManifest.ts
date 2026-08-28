export type OfflineCurriculumPack = {
  id: string;
  title: string;
  qualification: string;
  subjects: string[];
  version: string;
  bundled: boolean;
};

/** Metadata contract for curriculum packs shipped with an offline release. */
export const OFFLINE_CURRICULUM_PACKS: OfflineCurriculumPack[] = [
  {
    id: "zimsec-secondary-core",
    title: "Zimbabwe Secondary Core",
    qualification: "ZIMSEC",
    subjects: ["Mathematics", "Physics", "Computer Science", "English"],
    version: "0.1.0",
    bundled: false,
  },
];

export function isCurriculumPackAvailable(id: string, availableIds: string[]): boolean {
  return availableIds.includes(id);
}
