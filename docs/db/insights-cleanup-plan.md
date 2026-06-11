# Insights schema consolidation — cleanup plan & migration set

**Status: PREPARE ONLY. Nothing in this PR has been applied to any database.**
Goal: make `public.cortex_insights` the single canonical insights table, preserve
all historical data, and minimize production risk.

---

## Current state (evidence)

Production (`shadecodestudent`, host `zczdtffwzkctkxwmvalb`) has **two** insight
tables, confirmed via the REST API:

| Table | Columns (confirmed) | Used by app code? |
|---|---|---|
| `public.cortex_insights` | `id, user_id, insight, created_at` | **Yes** (all readers/writers) |
| `public.insights` | `id, user_id, title, content, generated_at, metadata, is_read` | **No** (orphaned) |

A repo-wide search for `from('insights')` / `.from("insights")` returns **zero**
hits — no application code reads or writes the legacy table anymore (everything
goes through `cortex_insights`).

### Conflicting schema definitions in the repo (5 legacy + 1 canonical)

The repo carries the same table name defined many incompatible ways across three
migration directories. Only the `0000` shape was ever applied to production.

| File | Table | Shape | Applied to prod? |
|---|---|---|---|
| `supabase/migrations/0000_create_insights_table.sql` | `insights` | title, content, generated_at, metadata, is_read | **Yes** |
| `supabase/migrations/YYYYMMDDHHMMSS_create_insights_table.sql` | `insights` | insight_text, subject_id, pattern_type, metadata | No |
| `supabase/migrations/create_insights_table.sql` | `insights` | content, subject_id, task_id | No |
| `src/lib/supabase/migrations/0001_create_insights_table.sql` | `insights` | type, content (jsonb), subject_id, created_at | No |
| `database/migrations/00_initial_insights_schema.sql` | `insights` | insight_text, created_at (**file has invalid SQL**) | No |
| `supabase/migrations/0016_create_cortex_insights_table.sql` | `cortex_insights` | insight, created_at | canonical |

---

## A. Data audit

Script: [`A_audit_insights.sql`](./A_audit_insights.sql) (read-only). Run with a
service-role connection (RLS otherwise hides rows). It reports:

- `cortex_insights_rows` — total canonical rows
- `legacy_insights_rows` — total legacy rows
- `rows_to_backfill` — legacy rows the backfill would actually insert (impact)
- `legacy_rows_orphan_user` — legacy rows whose `user_id` is not in `auth.users` (skipped, FK)
- `legacy_rows_blank_text` — legacy rows with empty content+title (get a placeholder)
- `cortex_duplicate_groups` / `legacy_duplicate_groups` — possible duplicates
- detail listings of duplicate groups in each table

### Live results

> _To be filled in by running `A_audit_insights.sql` with the service-role key._
>
> | metric | value |
> |---|---|
> | cortex_insights_rows | _pending_ |
> | legacy_insights_rows | _pending_ |
> | rows_to_backfill | _pending_ |
> | legacy_rows_orphan_user | _pending_ |
> | legacy_rows_blank_text | _pending_ |
> | cortex_duplicate_groups | _pending_ |
> | legacy_duplicate_groups | _pending_ |

**Migration impact estimate:** the backfill touches at most `rows_to_backfill`
rows, all `INSERT`s into `cortex_insights` (no updates, no deletes, no locks on
hot paths). The legacy table is snapshotted once; no application code reads
either table during the operation except the canonical one (unchanged contract).

---

## B. Backfill migration

File: [`supabase/migrations/0017_backfill_legacy_insights.sql`](../../supabase/migrations/0017_backfill_legacy_insights.sql)

**Field mapping** (legacy `0000` shape → canonical):

| canonical column | source |
|---|---|
| `id` | `insights.id` (preserved → conflict-free re-runs) |
| `user_id` | `insights.user_id` (skipped if not in `auth.users`) |
| `insight` | `COALESCE(NULLIF(btrim(content),''), NULLIF(btrim(title),''), '(legacy insight)')` |
| `created_at` | `COALESCE(insights.generated_at, NOW())` |

`metadata` / `is_read` have no canonical home and are intentionally dropped
(they are preserved verbatim in the `insights_archive` snapshot if ever needed).

**Safety properties**

- **Additive only** — never mutates or deletes legacy data.
- **Idempotent** — dedupes on preserved `id` (`ON CONFLICT (id) DO NOTHING`) *and*
  on a `(user_id, insight, created_at)` content match, so it is safe even if an
  earlier out-of-band copy used freshly-generated ids.
- **Self-skipping** — no-ops cleanly when `public.insights` does not exist (fresh
  databases / after the legacy create-files are removed).
- **Rollback-ready** — creates the one-time snapshot `public.insights_archive`
  before writing anything.

---

## C. Verification

File: [`C_verify_insights_migration.sql`](./C_verify_insights_migration.sql)
(read-only). Run after the backfill. Checks (all must be `PASS`):

1. `archive_matches_legacy` — snapshot row count == legacy row count.
2. `legacy_rows_missing_from_canonical` — every migratable legacy row is present
   in `cortex_insights` (by id or content+time). Must be `0` → **no data loss**.
3. `canonical_no_blank_insight` — no NULL/blank `insight` values.
4. `canonical_count_floor` — canonical count ≥ distinct migratable legacy rows.

A final gate query returns `overall = 'PASS - safe to drop legacy insights'` or
`'FAIL - DO NOT drop legacy insights'`.

---

## D. Cleanup (drop + remove obsolete files)

### D.1  Drop the legacy table — **manual, after verification**

File: [`D_drop_legacy_insights.sql`](./D_drop_legacy_insights.sql).
Deliberately **not** in `supabase/migrations/` so `supabase db push` never
auto-drops it. It self-guards: it refuses to drop unless the snapshot exists and
zero migratable rows are missing from `cortex_insights`. The snapshot
`insights_archive` is retained as the rollback source.

### D.2  Code references

None to change — no application code references the legacy `insights` table
(verified). The app already uses `cortex_insights` exclusively.

### D.3  Obsolete migration files removed in this PR

These define conflicting `insights` schemas and are not part of any coherent,
applied migration chain (duplicate filenames across three directories; one
contains invalid SQL). Removed:

- `supabase/migrations/0000_create_insights_table.sql`
- `supabase/migrations/YYYYMMDDHHMMSS_create_insights_table.sql`
- `supabase/migrations/create_insights_table.sql`
- `src/lib/supabase/migrations/0001_create_insights_table.sql`
- `database/migrations/00_initial_insights_schema.sql`

> **Migration-history caveat:** if you adopt strict Supabase CLI migration
> tracking later, removing an already-applied file (`0000`) can trigger a history
> mismatch warning. This project does not currently use strict tracking (hence
> the duplicate/broken files), so removal is safe. After D.1 the table is gone
> and these create-files are obsolete regardless.

---

## E. Rollback

File: [`E_rollback.sql`](./E_rollback.sql). Three scenarios:

- **E.1 (preferred)** — run backfill + verification inside one transaction; if any
  check fails, `ROLLBACK`. Zero residue, original state restored exactly.
- **E.2** — backfill committed but table not dropped: delete the rows the backfill
  inserted (identified by preserved id + archived content).
- **E.3** — table already dropped: recreate `public.insights` from
  `public.insights_archive` with the original `0000` constraints + RLS policies.

---

## Recommended run order (production)

```sql
-- 0. Audit (read-only)
\i docs/db/A_audit_insights.sql

-- 1. Backfill + verify atomically
BEGIN;
  \i supabase/migrations/0017_backfill_legacy_insights.sql
  \i docs/db/C_verify_insights_migration.sql        -- confirm overall = PASS
COMMIT;                                              -- or ROLLBACK on FAIL

-- 2. (after sign-off / retention window) drop legacy table
\i docs/db/D_drop_legacy_insights.sql               -- self-guarded

-- 3. (much later, optional) remove the snapshot
-- DROP TABLE IF EXISTS public.insights_archive;
```

Net effect: one canonical insights table (`cortex_insights`), all history
preserved, every destructive step gated by verification and reversible from the
snapshot.
