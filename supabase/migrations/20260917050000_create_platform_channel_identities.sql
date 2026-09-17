create table if not exists public.platform_channel_identities (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('whatsapp')),
  external_user_id text not null check (length(btrim(external_user_id)) between 1 and 255),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  status text not null default 'active' check (status in ('active','blocked','unlinked')),
  linked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel, external_user_id)
);
create index if not exists platform_channel_identities_user_idx on public.platform_channel_identities (user_id, channel);
alter table public.platform_channel_identities enable row level security;
