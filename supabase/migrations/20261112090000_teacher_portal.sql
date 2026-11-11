-- Teacher portal: invite-based onboarding.
-- Additive only. Admins create single-use invite links; a signed-in user redeems one to receive the teacher role.
-- Only a SHA-256 hash of each code is stored, so a database read never reveals a usable invite.

create table if not exists public.teacher_invites (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  note text check (note is null or char_length(note) <= 200),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz
);

alter table public.teacher_invites enable row level security;

create policy "admins read teacher invites" on public.teacher_invites
  for select to authenticated
  using (has_role(auth.uid(), 'admin'::text));

create policy "admins create teacher invites" on public.teacher_invites
  for insert to authenticated
  with check (created_by = auth.uid() and has_role(auth.uid(), 'admin'::text));

create policy "admins revoke unused teacher invites" on public.teacher_invites
  for delete to authenticated
  using (used_at is null and has_role(auth.uid(), 'admin'::text));

-- Redemption is atomic: the UPDATE only matches an unused, unexpired invite, so two people can never share one.
create or replace function public.redeem_teacher_invite(invite_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite uuid;
  v_role uuid;
begin
  if auth.uid() is null then
    raise exception 'redeem_teacher_invite: unauthenticated call';
  end if;

  update public.teacher_invites
     set used_by = auth.uid(), used_at = now()
   where code_hash = encode(sha256(convert_to(invite_code, 'utf8')), 'hex')
     and used_at is null
     and expires_at > now()
  returning id into v_invite;

  if v_invite is null then
    return false;
  end if;

  select id into v_role from public.roles where name = 'teacher';
  if v_role is null then
    raise exception 'redeem_teacher_invite: teacher role missing';
  end if;

  insert into public.user_roles (user_id, role_id, assigned_by)
  values (auth.uid(), v_role, (select created_by from public.teacher_invites where id = v_invite))
  on conflict (user_id, role_id) do nothing;

  return true;
end;
$$;

revoke all on function public.redeem_teacher_invite(text) from public, anon;
grant execute on function public.redeem_teacher_invite(text) to authenticated;
