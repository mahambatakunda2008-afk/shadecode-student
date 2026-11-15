-- Approval-gated, student-specific guardian links.
-- Invitation redemption creates a pending relationship only. An institution
-- administrator must verify the guardian and approve before cross-user access.
-- Tokens are single-use, expiring, hash-only, and bound to auth.uid() at redemption.

create table if not exists public.platform_guardian_invites (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.platform_institutions(id) on delete cascade,
  student_user_id uuid not null references auth.users(id) on delete cascade,
  relationship_type text not null check (relationship_type in ('parent','guardian')),
  code_hash text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  redeemed_by uuid references auth.users(id) on delete set null,
  redeemed_at timestamptz,
  revoked_at timestamptz,
  constraint platform_guardian_invites_expiry_check check (expires_at > created_at),
  constraint platform_guardian_invites_not_self_check check (created_by <> student_user_id)
);

create index if not exists platform_guardian_invites_student_idx
  on public.platform_guardian_invites(institution_id,student_user_id,created_at desc);

alter table public.platform_guardian_invites enable row level security;
revoke all on public.platform_guardian_invites from public, anon, authenticated;

alter table public.platform_membership_audit
  drop constraint if exists platform_membership_audit_entity_type_check;
alter table public.platform_membership_audit
  add constraint platform_membership_audit_entity_type_check
  check (entity_type in ('institution','group','institution_member','group_member','invite','relationship'));

create or replace function public.create_platform_guardian_invite(
  p_institution_id uuid,
  p_student_user_id uuid,
  p_relationship_type text,
  p_code_hash text,
  p_expires_at timestamptz default (now() + interval '14 days')
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_invite_id uuid;
begin
  if v_actor is null or not exists (
    select 1 from public.platform_institution_members
    where institution_id=p_institution_id and user_id=v_actor
      and status='active' and membership_role='administrator'
  ) then
    raise exception 'active institution administrator required' using errcode='42501';
  end if;
  if p_student_user_id is null or p_student_user_id=v_actor or not exists (
    select 1 from public.platform_institution_members
    where institution_id=p_institution_id and user_id=p_student_user_id
      and status='active' and membership_role='student'
  ) then
    raise exception 'target must be an active student in this institution' using errcode='42501';
  end if;
  if p_relationship_type not in ('parent','guardian') then
    raise exception 'relationship must be parent or guardian' using errcode='22023';
  end if;
  if p_code_hash is null or p_code_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invite digest must be a SHA-256 hex digest' using errcode='22023';
  end if;
  if p_expires_at <= now() or p_expires_at > now()+interval '30 days' then
    raise exception 'invite expiry must be within the next 30 days' using errcode='22023';
  end if;

  insert into public.platform_guardian_invites(
    institution_id,student_user_id,relationship_type,code_hash,expires_at,created_by
  ) values (
    p_institution_id,p_student_user_id,p_relationship_type,p_code_hash,p_expires_at,v_actor
  ) returning id into v_invite_id;

  insert into public.platform_membership_audit(
    institution_id,actor_user_id,target_user_id,action,entity_type,entity_id,metadata
  ) values (
    p_institution_id,v_actor,p_student_user_id,'guardian_invite.created','invite',v_invite_id,
    jsonb_build_object('relationship_type',p_relationship_type)
  );
  return v_invite_id;
end;
$$;

create or replace function public.redeem_platform_guardian_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_invite public.platform_guardian_invites%rowtype;
  v_relationship_id uuid;
  v_member_role text;
  v_member_status text;
begin
  if v_actor is null then
    raise exception 'sign in before redeeming a guardian invite' using errcode='42501';
  end if;
  if p_code is null or length(p_code) not between 20 and 128 then
    raise exception 'invalid or expired guardian invite' using errcode='22023';
  end if;

  select * into v_invite
  from public.platform_guardian_invites
  where code_hash=encode(sha256(convert_to(p_code,'utf8')),'hex')
    and redeemed_at is null and revoked_at is null and expires_at>now();
  if v_invite.id is null then
    raise exception 'invalid, expired, revoked or already redeemed guardian invite' using errcode='22023';
  end if;
  if v_actor=v_invite.student_user_id then
    raise exception 'a student cannot redeem their own guardian invitation' using errcode='42501';
  end if;

  perform 1 from public.platform_institutions where id=v_invite.institution_id for update;
  if not found or not exists (
    select 1 from public.platform_institution_members
    where institution_id=v_invite.institution_id and user_id=v_invite.student_user_id
      and status='active' and membership_role='student'
  ) then
    raise exception 'student is no longer active in this institution' using errcode='42501';
  end if;

  update public.platform_guardian_invites
    set redeemed_by=v_actor,redeemed_at=now()
  where id=v_invite.id and redeemed_at is null and revoked_at is null and expires_at>now()
  returning * into v_invite;
  if v_invite.id is null then
    raise exception 'invalid, expired, revoked or already redeemed guardian invite' using errcode='22023';
  end if;

  select membership_role,status into v_member_role,v_member_status
  from public.platform_institution_members
  where institution_id=v_invite.institution_id and user_id=v_actor
  for update;

  if v_member_status in ('suspended','revoked') then
    raise exception 'institution membership is suspended or revoked' using errcode='42501';
  end if;
  if v_member_role is not null and v_member_role<>v_invite.relationship_type then
    raise exception 'this account already has a different institution role' using errcode='23505';
  end if;

  if v_member_role is null then
    insert into public.platform_institution_members(
      institution_id,user_id,membership_role,status
    ) values (
      v_invite.institution_id,v_actor,v_invite.relationship_type,'pending'
    );
  end if;

  if exists (
    select 1 from public.platform_user_relationships
    where subject_user_id=v_invite.student_user_id and related_user_id=v_actor
      and relationship_type=v_invite.relationship_type and status='active'
  ) then
    raise exception 'this guardian relationship is already active' using errcode='23505';
  end if;

  insert into public.platform_user_relationships(
    subject_user_id,related_user_id,relationship_type,status,created_by,approved_by,metadata
  ) values (
    v_invite.student_user_id,v_actor,v_invite.relationship_type,'pending',v_actor,null,
    jsonb_build_object('institution_id',v_invite.institution_id,'invite_id',v_invite.id)
  )
  on conflict (subject_user_id,related_user_id,relationship_type) do update
    set status='pending',created_by=excluded.created_by,approved_by=null,
        metadata=excluded.metadata,updated_at=now()
  returning id into v_relationship_id;

  insert into public.platform_membership_audit(
    institution_id,actor_user_id,target_user_id,action,entity_type,entity_id,metadata
  ) values (
    v_invite.institution_id,v_actor,v_invite.student_user_id,'guardian_link.redeemed',
    'relationship',v_relationship_id,jsonb_build_object('invite_id',v_invite.id)
  );
  return v_relationship_id;
end;
$$;

create or replace function public.list_platform_pending_guardian_links(p_institution_id uuid)
returns table (
  relationship_id uuid,
  student_user_id uuid,
  student_display_name text,
  guardian_user_id uuid,
  guardian_display_name text,
  relationship_type text,
  requested_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null or not exists (
    select 1 from public.platform_institution_members
    where institution_id=p_institution_id and user_id=v_actor
      and status='active' and membership_role='administrator'
  ) then
    raise exception 'active institution administrator required' using errcode='42501';
  end if;

  return query
    select r.id,r.subject_user_id,
      coalesce(nullif(btrim(sp.display_name),''),nullif(btrim(sp.username),''),'Student')::text,
      r.related_user_id,
      coalesce(nullif(btrim(gp.display_name),''),nullif(btrim(gp.username),''),'Guardian')::text,
      r.relationship_type,r.created_at
    from public.platform_user_relationships r
    left join public.profiles sp on sp.id=r.subject_user_id
    left join public.profiles gp on gp.id=r.related_user_id
    where r.relationship_type in ('parent','guardian')
      and r.status='pending'
      and nullif(r.metadata->>'institution_id','')::uuid=p_institution_id
    order by r.created_at,r.id;
end;
$;

create or replace function public.list_my_platform_guardian_links()
returns table (
  relationship_id uuid,
  institution_id uuid,
  student_user_id uuid,
  student_display_name text,
  relationship_type text,
  relationship_status text,
  requested_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'sign in to view guardian links' using errcode='42501';
  end if;

  return query
    select r.id,nullif(r.metadata->>'institution_id','')::uuid,r.subject_user_id,
      coalesce(nullif(btrim(p.display_name),''),nullif(btrim(p.username),''),'Student')::text,
      r.relationship_type,r.status,r.created_at
    from public.platform_user_relationships r
    left join public.profiles p on p.id=r.subject_user_id
    where r.related_user_id=v_actor and r.relationship_type in ('parent','guardian')
    order by r.created_at desc,r.id;
end;
$;

create or replace function public.review_platform_guardian_link(
  p_relationship_id uuid,
  p_approve boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_link public.platform_user_relationships%rowtype;
  v_institution_id uuid;
  v_role text;
  v_status text;
begin
  if v_actor is null then
    raise exception 'active institution administrator required' using errcode='42501';
  end if;

  select r.* into v_link
  from public.platform_user_relationships r
  where r.id=p_relationship_id and r.relationship_type in ('parent','guardian')
  for update;
  if v_link.id is null then
    raise exception 'pending guardian relationship not found' using errcode='P0002';
  end if;

  v_institution_id := nullif(v_link.metadata->>'institution_id','')::uuid;
  perform 1 from public.platform_institutions where id=v_institution_id for update;
  if v_institution_id is null or not exists (
    select 1 from public.platform_institution_members
    where institution_id=v_institution_id and user_id=v_actor
      and status='active' and membership_role='administrator'
  ) then
    raise exception 'active administrator of the student institution required' using errcode='42501';
  end if;
  if v_link.status<>'pending' then
    raise exception 'only pending guardian links can be reviewed' using errcode='22023';
  end if;
  if not exists (
    select 1 from public.platform_institution_members
    where institution_id=v_institution_id and user_id=v_link.subject_user_id
      and status='active' and membership_role='student'
  ) then
    raise exception 'student is no longer active in this institution' using errcode='42501';
  end if;

  select membership_role,status into v_role,v_status
  from public.platform_institution_members
  where institution_id=v_institution_id and user_id=v_link.related_user_id
  for update;
  if v_role is null or v_role<>v_link.relationship_type or v_status not in ('pending','active') then
    raise exception 'guardian institution membership is not eligible for approval' using errcode='42501';
  end if;

  if p_approve then
    update public.platform_user_relationships
      set status='active',approved_by=v_actor,updated_at=now()
    where id=p_relationship_id;
    update public.platform_institution_members
      set status='active',updated_at=now()
    where institution_id=v_institution_id and user_id=v_link.related_user_id
      and status='pending';
  else
    update public.platform_user_relationships
      set status='revoked',approved_by=v_actor,updated_at=now()
    where id=p_relationship_id;
    if v_status='pending' and not exists (
      select 1 from public.platform_user_relationships r
      where r.related_user_id=v_link.related_user_id
        and r.relationship_type in ('parent','guardian')
        and r.status in ('pending','active')
        and r.id<>p_relationship_id
        and nullif(r.metadata->>'institution_id','')::uuid=v_institution_id
    ) then
      update public.platform_institution_members
        set status='revoked',updated_at=now()
      where institution_id=v_institution_id and user_id=v_link.related_user_id
        and status='pending';
    end if;
  end if;

  insert into public.platform_membership_audit(
    institution_id,actor_user_id,target_user_id,action,entity_type,entity_id
  ) values (
    v_institution_id,v_actor,v_link.related_user_id,
    case when p_approve then 'guardian_link.approved' else 'guardian_link.rejected' end,
    'relationship',p_relationship_id
  );
end;
$$;

create or replace function public.revoke_platform_guardian_link(p_relationship_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_link public.platform_user_relationships%rowtype;
  v_institution_id uuid;
  v_authorized boolean;
begin
  if v_actor is null then
    raise exception 'sign in before revoking a guardian link' using errcode='42501';
  end if;
  select r.* into v_link
  from public.platform_user_relationships r
  where r.id=p_relationship_id and r.relationship_type in ('parent','guardian')
  for update;
  if v_link.id is null then
    raise exception 'guardian relationship not found' using errcode='P0002';
  end if;
  v_institution_id := nullif(v_link.metadata->>'institution_id','')::uuid;

  select (v_actor=v_link.related_user_id) or exists (
    select 1 from public.platform_institution_members
    where institution_id=v_institution_id and user_id=v_actor
      and status='active' and membership_role='administrator'
  ) into v_authorized;
  if not coalesce(v_authorized,false) then
    raise exception 'only the linked guardian or an institution administrator can revoke this link' using errcode='42501';
  end if;
  if v_link.status='revoked' then
    return;
  end if;

  update public.platform_user_relationships
    set status='revoked',updated_at=now()
  where id=p_relationship_id;

  insert into public.platform_membership_audit(
    institution_id,actor_user_id,target_user_id,action,entity_type,entity_id
  ) values (
    v_institution_id,v_actor,v_link.related_user_id,'guardian_link.revoked',
    'relationship',p_relationship_id
  );
end;
$$;

revoke all on function public.create_platform_guardian_invite(uuid,uuid,text,text,timestamptz) from public,anon;
revoke all on function public.redeem_platform_guardian_invite(text) from public,anon;
revoke all on function public.list_platform_pending_guardian_links(uuid) from public,anon;\nrevoke all on function public.list_my_platform_guardian_links() from public,anon;\nrevoke all on function public.review_platform_guardian_link(uuid,boolean) from public,anon;
revoke all on function public.revoke_platform_guardian_link(uuid) from public,anon;

grant execute on function public.create_platform_guardian_invite(uuid,uuid,text,text,timestamptz) to authenticated;
grant execute on function public.redeem_platform_guardian_invite(text) to authenticated;
grant execute on function public.list_platform_pending_guardian_links(uuid) to authenticated;\ngrant execute on function public.list_my_platform_guardian_links() to authenticated;\ngrant execute on function public.review_platform_guardian_link(uuid,boolean) to authenticated;
grant execute on function public.revoke_platform_guardian_link(uuid) to authenticated;
