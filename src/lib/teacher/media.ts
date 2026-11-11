/** Public URL prefix of the teacher-media bucket. Images in tutorials must start with this. */
export function teacherMediaPrefix(): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/teacher-media/`;
}

export const MEDIA_MAX_BYTES = 3 * 1024 * 1024;
export const MEDIA_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
