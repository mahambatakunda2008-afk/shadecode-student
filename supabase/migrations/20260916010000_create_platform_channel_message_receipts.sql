create table if not exists public.platform_channel_message_receipts (
  id uuid primary key default gen_random_uuid(),
  channel text not null,
  external_message_id text not null,
  external_user_id text not null,
  status text not null default 'processing',
  response_text text,
  processed_at timestamptz,
  delivered_at timestamptz,
  lease_until timestamptz not null default (now() + interval '2 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_channel_message_receipts_channel_check check (channel in ('whatsapp')),
  constraint platform_channel_message_receipts_status_check check (status in ('processing','ready','delivered')),
  constraint platform_channel_message_receipts_external_message_id_check check (length(btrim(external_message_id)) between 1 and 255),
  constraint platform_channel_message_receipts_one_message unique (channel, external_message_id)
);

create index if not exists platform_channel_message_receipts_status_idx
  on public.platform_channel_message_receipts (channel, status, lease_until);

alter table public.platform_channel_message_receipts enable row level security;
