-- Reconstructed migration for an already-applied production migration.
-- Original migration source was missing from the repository history. This
-- definition was recovered from the live schema on 2026-11-15.
--
-- The durable event table originally declared id UUID PRIMARY KEY without a
-- default. Canonical event ingress omits id and relies on database generation.

alter table public.cortex_events
  alter column id set default gen_random_uuid();
