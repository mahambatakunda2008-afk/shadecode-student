create table if not exists public.platform_channel_link_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  channel text not null check (channel = 'whatsapp'),
  role text not null,
  code_digest text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists platform_channel_link_codes_user_idx
  on public.platform_channel_link_codes (user_id, channel, created_at desc);

create index if not exists platform_channel_link_codes_active_idx
  on public.platform_channel_link_codes (channel, expires_at)
  where used_at is null;

alter table public.platform_channel_link_codes enable row level security;
