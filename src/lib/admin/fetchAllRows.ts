/**
 * Pages through a PostgREST query. Supabase caps a single response (commonly
 * 1,000 rows), so a plain .limit() silently truncates. We page until the data
 * runs out or `maxRows` is hit, and say so when we had to stop early.
 */
export interface PageResult<T> {
  data: T[] | null;
  error: unknown;
}

export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
  { pageSize = 1000, maxRows = 40_000 }: { pageSize?: number; maxRows?: number } = {},
): Promise<{ rows: T[]; truncated: boolean; failed: boolean }> {
  const rows: T[] = [];
  for (let from = 0; from < maxRows; from += pageSize) {
    const { data, error } = await page(from, from + pageSize - 1);
    if (error) return { rows, truncated: false, failed: true };
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) return { rows, truncated: false, failed: false };
  }
  return { rows, truncated: true, failed: false };
}
