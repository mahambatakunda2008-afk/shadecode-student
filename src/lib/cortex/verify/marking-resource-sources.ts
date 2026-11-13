/**
 * Curated discovery entry points for assessment and learning resources.
 * These are navigation leads, not proof that individual files are authentic,
 * reusable, complete or aligned to a syllabus.
 */
export interface MarkingResourceDiscoverySource {
  id: string;
  name: string;
  provider: string;
  url: string;
  channel: "official_board" | "authenticated_teacher_portal" | "open_resource_catalogue" | "community";
  access: "public" | "authenticated";
  defaultReuse: "unknown";
  automatedFetch: false;
  importMode: "link_only" | "teacher_authorized_import" | "per_item_license_review" | "user_contributed_review";
  trustNote: string;
}

export const MARKING_RESOURCE_DISCOVERY_SOURCES: MarkingResourceDiscoverySource[] = [
  {
    id: "cambridge-public-subject-materials",
    name: "Cambridge International subject and syllabus materials",
    provider: "Cambridge International Education",
    url: "https://www.cambridgeinternational.org/programmes-and-qualifications/",
    channel: "official_board",
    access: "public",
    defaultReuse: "unknown",
    automatedFetch: false,
    importMode: "link_only",
    trustNote: "Official discovery source. Check exact syllabus, exam year, resource type and copyright conditions before use.",
  },
  {
    id: "cambridge-school-support-hub",
    name: "Cambridge School Support Hub",
    provider: "Cambridge International Education",
    url: "https://www.cambridgeinternational.org/support/",
    channel: "authenticated_teacher_portal",
    access: "authenticated",
    defaultReuse: "unknown",
    automatedFetch: false,
    importMode: "teacher_authorized_import",
    trustNote: "Teacher/registered-school portal. No automated login, scraping, credential sharing or redistribution by default.",
  },
  {
    id: "zimsec-syllabus-catalogue",
    name: "ZIMSEC syllabus catalogue",
    provider: "Zimbabwe School Examinations Council",
    url: "https://www5.zimsec.co.zw/syllabi/",
    channel: "official_board",
    access: "public",
    defaultReuse: "unknown",
    automatedFetch: false,
    importMode: "link_only",
    trustNote: "Official catalogue discovery. Resolve the exact subject document and effective version; a listing is not a verified syllabus.",
  },
  {
    id: "openstax",
    name: "OpenStax",
    provider: "OpenStax, Rice University",
    url: "https://openstax.org/subjects",
    channel: "open_resource_catalogue",
    access: "public",
    defaultReuse: "unknown",
    automatedFetch: false,
    importMode: "per_item_license_review",
    trustNote: "Potential open textbook source. Verify the licence and attribution for each exact title and edition before copying or adapting.",
  },
  {
    id: "oer-commons",
    name: "OER Commons",
    provider: "Institute for the Study of Knowledge Management in Education",
    url: "https://www.oercommons.org/",
    channel: "open_resource_catalogue",
    access: "public",
    defaultReuse: "unknown",
    automatedFetch: false,
    importMode: "per_item_license_review",
    trustNote: "Aggregated open-resource catalogue. Verify each item's author, source, licence, quality and syllabus fit individually.",
  },
  {
    id: "zimfundi",
    name: "Zimfundi",
    provider: "Zimfundi",
    url: "https://zimfundi.co.zw/",
    channel: "community",
    access: "public",
    defaultReuse: "unknown",
    automatedFetch: false,
    importMode: "user_contributed_review",
    trustNote: "Zimbabwe-focused third-party learning resource lead. Not an awarding-body authority; independently verify every resource and its rights.",
  },
];

export function getMarkingResourceDiscoverySource(id: string) {
  return MARKING_RESOURCE_DISCOVERY_SOURCES.find(source => source.id === id) ?? null;
}
