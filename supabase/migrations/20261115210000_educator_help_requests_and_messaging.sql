-- A safe, in-product help-request and conversation loop between learners and approved educators.
create table if not exists public.platform_educator_help_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  educator_id uuid not null references auth.users(id) on delete cascade,
  subject text not null check (char_length(trim(subject)) between 2 and 120),
  level text not null default '' check (char_length(level) <= 100),
  topic text not null default '' check (char_length(topic) <= 180),
  status text not null default 'pending' check (status in ('pending','accepted','declined','completed','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint educator_help_request_not_self check (student_id <> educator_id)
);
create index if not exists educator_help_requests_student_idx
  on public.platform_educator_help_requests(student_id, updated_at desc);
create index if not exists educator_help_requests_educator_idx
  on public.platform_educator_help_requests(educator_id, updated_at desc);

create table if not exists public.platform_educator_help_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.platform_educator_help_requests(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists educator_help_messages_request_idx
  on public.platform_educator_help_messages(request_id, created_at asc);

alter table public.platform_educator_help_requests enable row level security;
alter table public.platform_educator_help_messages enable row level security;

drop policy if exists "participants read educator help requests" on public.platform_educator_help_requests;
create policy "participants read educator help requests" on public.platform_educator_help_requests
  for select to authenticated using (auth.uid() in (student_id, educator_id));

drop policy if exists "participants read educator help messages" on public.platform_educator_help_messages;
create policy "participants read educator help messages" on public.platform_educator_help_messages
  for select to authenticated using (
    exists (
      select 1 from public.platform_educator_help_requests r
      where r.id = request_id and auth.uid() in (r.student_id, r.educator_id)
    )
  );

revoke all on public.platform_educator_help_requests from anon, authenticated;
revoke all on public.platform_educator_help_messages from anon, authenticated;
grant select on public.platform_educator_help_requests to authenticated;
grant select on public.platform_educator_help_messages to authenticated;

create or replace function public.create_educator_help_request(
  p_educator_id uuid,
  p_subject text,
  p_level text,
  p_topic text,
  p_message text
) returns uuid
language plpgsql security definer set search_path = public, auth as $$
declare
  v_student uuid := auth.uid();
  v_request_id uuid;
  v_profile public.platform_educator_profiles%rowtype;
  v_subject text := left(trim(coalesce(p_subject,'')),120);
  v_level text := left(trim(coalesce(p_level,'')),100);
  v_topic text := left(trim(coalesce(p_topic,'')),180);
  v_message text := left(trim(coalesce(p_message,'')),4000);
begin
  if v_student is null then raise exception 'Sign in to contact an educator' using errcode='42501'; end if;
  if p_educator_id is null or p_educator_id = v_student then
    raise exception 'Choose a different educator' using errcode='22023';
  end if;
  if char_length(v_subject) < 2 or char_length(trim(v_message)) < 10 then
    raise exception 'Add a subject and a message of at least 10 characters' using errcode='22023';
  end if;
  select * into v_profile from public.platform_educator_profiles
    where user_id=p_educator_id and status='approved';
  if not found then raise exception 'This educator is not currently available' using errcode='22023'; end if;
  if not exists (select 1 from unnest(v_profile.subjects) s where lower(s)=lower(v_subject)) then
    raise exception 'This educator does not list that subject' using errcode='22023';
  end if;
  if v_level <> '' and cardinality(v_profile.levels)>0
     and not exists (select 1 from unnest(v_profile.levels) l where lower(l)=lower(v_level)) then
    raise exception 'This educator does not list that level' using errcode='22023';
  end if;

  insert into public.platform_educator_help_requests(student_id,educator_id,subject,level,topic)
    values(v_student,p_educator_id,v_subject,v_level,v_topic) returning id into v_request_id;
  insert into public.platform_educator_help_messages(request_id,sender_id,body)
    values(v_request_id,v_student,v_message);
  return v_request_id;
end;
$$;

create or replace function public.reply_to_educator_help_request(
  p_request_id uuid,
  p_message text
) returns uuid
language plpgsql security definer set search_path = public, auth as $$
declare
  v_user uuid := auth.uid();
  v_request public.platform_educator_help_requests%rowtype;
  v_message text := left(trim(coalesce(p_message,'')),4000);
  v_id uuid;
begin
  if v_user is null then raise exception 'Sign in to reply' using errcode='42501'; end if;
  if char_length(v_message)<1 then raise exception 'Message cannot be empty' using errcode='22023'; end if;
  select * into v_request from public.platform_educator_help_requests
    where id=p_request_id for update;
  if not found or v_user not in (v_request.student_id,v_request.educator_id) then
    raise exception 'Request not found' using errcode='42501';
  end if;
  if v_request.status in ('declined','completed','closed') then
    raise exception 'This conversation is closed' using errcode='55000';
  end if;
  if v_user=v_request.educator_id and not public.is_approved_independent_educator(v_user)
     and not exists (
       select 1 from public.platform_institution_members im
       where im.user_id=v_user and im.status='active'
         and im.membership_role in ('teacher','tutor','administrator','staff')
     ) and not public.has_role(v_user,'teacher'::text) and not public.has_role(v_user,'admin'::text) then
    raise exception 'Educator access is no longer active' using errcode='42501';
  end if;
  insert into public.platform_educator_help_messages(request_id,sender_id,body)
    values(p_request_id,v_user,v_message) returning id into v_id;
  update public.platform_educator_help_requests set updated_at=now() where id=p_request_id;
  return v_id;
end;
$$;

create or replace function public.set_educator_help_request_status(
  p_request_id uuid,
  p_status text
) returns boolean
language plpgsql security definer set search_path = public, auth as $$
declare
  v_user uuid := auth.uid();
  v_request public.platform_educator_help_requests%rowtype;
begin
  if v_user is null then raise exception 'Sign in first' using errcode='42501'; end if;
  select * into v_request from public.platform_educator_help_requests
    where id=p_request_id for update;
  if not found then return false; end if;

  if v_user=v_request.educator_id then
    if p_status not in ('accepted','declined','completed') then
      raise exception 'Invalid educator decision' using errcode='22023';
    end if;
    if p_status in ('accepted','declined') and v_request.status<>'pending' then
      raise exception 'This request has already been answered' using errcode='55000';
    end if;
    if p_status='completed' and v_request.status<>'accepted' then
      raise exception 'Only accepted requests can be completed' using errcode='55000';
    end if;
    if not public.is_approved_independent_educator(v_user)
       and not exists (
         select 1 from public.platform_institution_members im
         where im.user_id=v_user and im.status='active'
           and im.membership_role in ('teacher','tutor','administrator','staff')
       ) and not public.has_role(v_user,'teacher'::text) and not public.has_role(v_user,'admin'::text) then
      raise exception 'Educator access is no longer active' using errcode='42501';
    end if;
  elsif v_user=v_request.student_id then
    if p_status<>'closed' or v_request.status in ('declined','completed','closed') then
      raise exception 'Students may only close an active request' using errcode='22023';
    end if;
  else
    raise exception 'Request not found' using errcode='42501';
  end if;

  update public.platform_educator_help_requests set status=p_status,updated_at=now()
    where id=p_request_id;
  return true;
end;
$$;

revoke all on function public.create_educator_help_request(uuid,text,text,text,text) from public, anon;
revoke all on function public.reply_to_educator_help_request(uuid,text) from public, anon;
revoke all on function public.set_educator_help_request_status(uuid,text) from public, anon;
grant execute on function public.create_educator_help_request(uuid,text,text,text,text) to authenticated;
grant execute on function public.reply_to_educator_help_request(uuid,text) to authenticated;
grant execute on function public.set_educator_help_request_status(uuid,text) to authenticated;
