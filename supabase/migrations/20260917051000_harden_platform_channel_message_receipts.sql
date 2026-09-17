create table if not exists public.platform_channel_message_receipts (
  id uuid primary key default gen_random_uuid(),
  channel text not null,
  external_message_id text not null,
  external_user_id text not null,
  phone_number_id text not null default 'legacy',
  user_id uuid,
  status text not null default 'processing',
  response_text text,
  delivery_status text default 'pending',
  processing_started_at timestamptz not null default now(),
  lease_until timestamptz not null default (now() + interval '2 minutes'),
  processed_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel, external_message_id)
);

alter table public.platform_channel_message_receipts add column if not exists phone_number_id text;
alter table public.platform_channel_message_receipts add column if not exists user_id uuid;
alter table public.platform_channel_message_receipts add column if not exists delivery_status text;
alter table public.platform_channel_message_receipts add column if not exists processing_started_at timestamptz;
alter table public.platform_channel_message_receipts add column if not exists lease_until timestamptz;
alter table public.platform_channel_message_receipts add column if not exists processed_at timestamptz;
alter table public.platform_channel_message_receipts add column if not exists delivered_at timestamptz;
alter table public.platform_channel_message_receipts alter column phone_number_id set default 'legacy';
update public.platform_channel_message_receipts set phone_number_id = 'legacy' where phone_number_id is null;
update public.platform_channel_message_receipts set processing_started_at = coalesce(processing_started_at, created_at, now()) where processing_started_at is null;
update public.platform_channel_message_receipts set lease_until = coalesce(lease_until, now() + interval '2 minutes') where lease_until is null;
update public.platform_channel_message_receipts set delivery_status = coalesce(delivery_status, case when status = 'delivered' then 'delivered' else 'pending' end) where delivery_status is null;
alter table public.platform_channel_message_receipts alter column phone_number_id set not null;
alter table public.platform_channel_message_receipts alter column processing_started_at set default now();
alter table public.platform_channel_message_receipts alter column processing_started_at set not null;
alter table public.platform_channel_message_receipts alter column lease_until set default (now() + interval '2 minutes');
alter table public.platform_channel_message_receipts alter column lease_until set not null;

alter table public.platform_channel_message_receipts drop constraint if exists platform_channel_message_receipts_status_check;
alter table public.platform_channel_message_receipts add constraint platform_channel_message_receipts_status_check check (status in ('processing','completed','failed'));
alter table public.platform_channel_message_receipts drop constraint if exists platform_channel_message_receipts_delivery_check;
alter table public.platform_channel_message_receipts add constraint platform_channel_message_receipts_delivery_check check (delivery_status is null or delivery_status in ('pending','delivered','failed'));
alter table public.platform_channel_message_receipts drop constraint if exists platform_channel_message_receipts_channel_check;
alter table public.platform_channel_message_receipts add constraint platform_channel_message_receipts_channel_check check (channel in ('whatsapp'));

create index if not exists platform_channel_message_receipts_processing_lease_idx on public.platform_channel_message_receipts (channel, lease_until) where status = 'processing';
create index if not exists platform_channel_message_receipts_user_idx on public.platform_channel_message_receipts (user_id, created_at desc);
alter table public.platform_channel_message_receipts enable row level security;
