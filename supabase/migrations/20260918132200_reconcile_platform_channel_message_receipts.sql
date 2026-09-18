create table if not exists public.platform_channel_message_receipts (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel = 'whatsapp'),
  external_message_id text not null,
  external_user_id text not null,
  phone_number_id text not null,
  user_id uuid,
  status text not null default 'processing' check (status in ('processing','completed','failed')),
  response_text text,
  delivery_status text check (delivery_status is null or delivery_status in ('pending','delivered','failed')),
  processing_started_at timestamptz not null default now(),
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  lease_until timestamptz not null default (now() + interval '2 minutes'),
  processed_at timestamptz
);

create unique index if not exists platform_channel_message_receipts_one_message
  on public.platform_channel_message_receipts(channel, external_message_id);
create index if not exists platform_channel_message_receipts_processing_idx
  on public.platform_channel_message_receipts(channel, processing_started_at)
  where status = 'processing';
create index if not exists platform_channel_message_receipts_processing_lease_idx
  on public.platform_channel_message_receipts(channel, lease_until)
  where status = 'processing';
create index if not exists platform_channel_message_receipts_user_idx
  on public.platform_channel_message_receipts(user_id, created_at desc);

alter table public.platform_channel_message_receipts enable row level security;
