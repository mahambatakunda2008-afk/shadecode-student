-- Reconstructed migration for an already-applied production migration.
-- Original migration source was missing from the repository history. This
-- definition was recovered from the live schema on 2026-11-15 and matches the
-- ON CONFLICT target used by insert_canonical_cortex_event().
--
-- Do not remove or broaden this index: it is the database-level idempotency
-- boundary for canonical Cortex event IDs.

create unique index if not exists cortex_events_canonical_event_id_uidx
  on public.cortex_events ((data->>'eventId'))
  where (data ? 'eventId');
