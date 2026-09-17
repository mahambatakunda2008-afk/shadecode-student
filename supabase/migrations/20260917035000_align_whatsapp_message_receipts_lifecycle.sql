alter table public.platform_channel_message_receipts
  add column if not exists lease_until timestamptz,
  add column if not exists processed_at timestamptz;

update public.platform_channel_message_receipts
set lease_until = coalesce(lease_until, now() + interval '2 minutes')
where lease_until is null;

alter table public.platform_channel_message_receipts
  alter column lease_until set default (now() + interval '2 minutes'),
  alter column lease_until set not null;

alter table public.platform_channel_message_receipts
  drop constraint if exists platform_channel_message_receipts_status_check;

alter table public.platform_channel_message_receipts
  add constraint platform_channel_message_receipts_status_check
  check (status in ('processing','completed','failed'));

alter table public.platform_channel_message_receipts
  drop constraint if exists platform_channel_message_receipts_delivery_check;

alter table public.platform_channel_message_receipts
  add constraint platform_channel_message_receipts_delivery_check
  check (delivery_status is null or delivery_status in ('pending','delivered','failed'));

create index if not exists platform_channel_message_receipts_processing_lease_idx
  on public.platform_channel_message_receipts (channel, lease_until)
  where status = 'processing';
