-- Preserve immutable-by-content-hash curriculum document snapshots.
-- The current curriculum_documents row remains the latest URL-level projection for compatibility.
create table if not exists public.curriculum_document_snapshots (
  id uuid primary key default gen_random_uuid(),
  source_id text not null references public.curriculum_sources(id) on delete cascade,
  url text not null,
  title text,
  content_hash text not null,
  content_characters integer not null default 0 check (content_characters >= 0),
  extracted_text text,
  extracted_text_hash text,
  retrieved_at timestamptz not null default now(),
  document_status text not null default 'draft' check (document_status in ('discovered', 'draft', 'verified', 'archived')),
  extraction_status text not null default 'not_extracted' check (extraction_status in ('not_extracted', 'extracted', 'partial', 'verified', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, url, content_hash)
);

create index if not exists curriculum_document_snapshots_source_url_idx
  on public.curriculum_document_snapshots (source_id, url, retrieved_at desc);
create index if not exists curriculum_document_snapshots_hash_idx
  on public.curriculum_document_snapshots (content_hash);

alter table public.curriculum_document_snapshots enable row level security;
grant all on table public.curriculum_document_snapshots to service_role;

comment on table public.curriculum_document_snapshots is
  'Versioned curriculum source evidence keyed by source, URL and original-byte SHA-256. Historical hashes remain queryable when the current URL projection changes.';
comment on column public.curriculum_document_snapshots.content_hash is
  'SHA-256 fingerprint of the original retrieved source bytes; not a claim that extracted content is correct.';
comment on column public.curriculum_document_snapshots.extracted_text_hash is
  'SHA-256 fingerprint of extracted text, kept separate from the original source-byte hash.';
