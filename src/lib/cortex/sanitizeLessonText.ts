/**
 * PostgreSQL text and jsonb values cannot contain U+0000. Models occasionally
 * emit it inside otherwise valid lesson content, which can make atomic lesson
 * finalization fail after generation has already succeeded.
 *
 * Remove only the forbidden null character and preserve the rest of the text.
 */
export function sanitizeLessonText<T>(value: T): T {
  if (typeof value === "string") {
    return value.replace(/\u0000/g, "") as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLessonText(item)) as T;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([key, item]) => [key.replace(/\u0000/g, ""), sanitizeLessonText(item)],
    );
    return Object.fromEntries(entries) as T;
  }

  return value;
}
