-- Approval, isolation, expiry, single-use and revocation tests for guardian links.
-- Runs after the platform baseline and institution lifecycle migrations on disposable PostgreSQL.
begin;

create table if not exists public.profiles (
  id uuid primary key,
  username text,
  display_name text
);
create table if not exists public.test_platform_admins(user_id uuid primary key);
create or replace function public.has_role(user_id uuid, role_name text)
returns boolean language sql stable security definer
set search_path=public,pg_temp
as $$ select role_name='admin' and exists(select 1 from public.test_platform_admins a where a.user_id=$1) $$;

insert into auth.users(id) values
 ('20000000-0000-4000-8000-000000000001'),
 ('20000000-0000-4000-8000-000000000002'),
 ('20000000-0000-4000-8000-000000000003'),
 ('20000000-0000-4000-8000-000000000004'),
 ('20000000-0000-4000-8000-000000000005')
on conflict do nothing;
insert into public.test_platform_admins(user_id)
values ('20000000-0000-4000-8000-000000000001') on conflict do nothing;

grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);

do $$
declare
  v_institution uuid;
  v_other_institution uuid;
  v_student_group uuid;
  v_student_code text := 'guardian-student-enrolment-code-2026';
  v_guardian_code text := 'guardian-family-link-code-2026';
  v_second_guardian_code text := 'guardian-family-link-code-2026b';
  v_expired_code text := 'guardian-family-link-expired-2026';
  v_student_invite uuid;
  v_link_invite uuid;
  v_link_id uuid;
  v_other_link uuid;
  v_status text;
  v_role text;
  v_count integer;
begin
  v_institution := public.create_platform_institution('Guardian Fixture School','school','ZW');
  v_student_group := public.create_platform_group(v_institution,'Form 5A','class',null);
  v_other_institution := public.create_platform_institution('Other Fixture School','school','ZW');

  -- Enrol the student using the normal institution-scoped invitation.
  perform public.create_platform_institution_invite(
    v_institution,encode(sha256(convert_to(v_student_code,'utf8')),'hex'),'student',v_student_group,now()+interval '7 days'
  );
  perform set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000003',true);
  perform public.redeem_platform_institution_invite(v_student_code);

  -- Only the student's institution administrator can create a student-specific link.
  perform set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
  v_link_invite := public.create_platform_guardian_invite(
    v_institution,'20000000-0000-4000-8000-000000000003','guardian',
    encode(sha256(convert_to(v_guardian_code,'utf8')),'hex'),now()+interval '7 days'
  );
  begin
    perform public.create_platform_guardian_invite(
      v_other_institution,'20000000-0000-4000-8000-000000000003','guardian',
      encode(sha256(convert_to('wrong-tenant-guardian-code-2026','utf8')),'hex'),now()+interval '7 days'
    );
    raise exception 'administrator created guardian link for a student outside that institution';
  exception when sqlstate '42501' then null;
  end;

  -- Redemption by the authenticated guardian creates pending membership and link only.
  perform set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000004',true);
  v_link_id := public.redeem_platform_guardian_invite(v_guardian_code);
  select status into v_status from public.platform_user_relationships where id=v_link_id;
  if v_status <> 'pending' then raise exception 'guardian link became active before administrator approval'; end if;
  select status,membership_role into v_status,v_role
    from public.platform_institution_members
    where institution_id=v_institution and user_id=auth.uid();
  if v_status <> 'pending' or v_role <> 'guardian' then
    raise exception 'guardian institution membership must remain pending before approval';
  end if;

  -- Pending guardian cannot approve their own link.
  begin
    perform public.review_platform_guardian_link(v_link_id,true);
    raise exception 'guardian approved their own relationship';
  exception when sqlstate '42501' then null;
  end;

  -- A student cannot redeem an invitation intended to link a guardian.
  perform set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000003',true);
  begin
    perform public.redeem_platform_guardian_invite(v_guardian_code);
    raise exception 'student redeemed their own guardian invite';
  exception when sqlstate '42501' then null;
  end;

  -- One-use protection.
  perform set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000004',true);
  begin
    perform public.redeem_platform_guardian_invite(v_guardian_code);
    raise exception 'guardian invite was redeemed twice';
  exception when sqlstate '22023' then null;
  end;

  -- Only an administrator in the same institution can approve.
  perform set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000005',true);
  begin
    perform public.review_platform_guardian_link(v_link_id,true);
    raise exception 'unaffiliated user approved guardian link';
  exception when sqlstate '42501' then null;
  end;

  -- Institution administrator approves after external identity verification.
  perform set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
  perform public.review_platform_guardian_link(v_link_id,true);
  if not exists(select 1 from public.platform_user_relationships where id=v_link_id and status='active' and approved_by=auth.uid()) then
    raise exception 'administrator approval did not activate the relationship';
  end if;
  if not exists(select 1 from public.platform_institution_members where institution_id=v_institution and user_id='20000000-0000-4000-8000-000000000004' and status='active' and membership_role='guardian') then
    raise exception 'approved guardian membership did not become active';
  end if;

  -- Guardian can revoke only their own link; an unrelated user cannot.
  perform set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000005',true);
  begin
    perform public.revoke_platform_guardian_link(v_link_id);
    raise exception 'unrelated user revoked guardian link';
  exception when sqlstate '42501' then null;
  end;
  perform set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000004',true);
  perform public.revoke_platform_guardian_link(v_link_id);
  if not exists(select 1 from public.platform_user_relationships where id=v_link_id and status='revoked') then
    raise exception 'guardian revocation did not remove relationship access';
  end if;

  -- Expired invitation cannot be redeemed.
  perform set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
  v_link_invite := public.create_platform_guardian_invite(
    v_institution,'20000000-0000-4000-8000-000000000003','parent',
    encode(sha256(convert_to(v_expired_code,'utf8')),'hex'),now()+interval '1 hour'
  );
  update public.platform_guardian_invites set expires_at=now()-interval '1 minute' where id=v_link_invite;
  perform set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000005',true);
  begin
    perform public.redeem_platform_guardian_invite(v_expired_code);
    raise exception 'expired guardian invitation was redeemed';
  exception when sqlstate '22023' then null;
  end;

  -- Guardian role cannot be used to elevate an existing teacher account.
  perform set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
  perform public.create_platform_institution_invite(
    v_institution,encode(sha256(convert_to('guardian-teacher-enrolment-code-2026','utf8')),'hex'),'teacher',null,now()+interval '7 days'
  );
  perform set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000005',true);
  perform public.redeem_platform_institution_invite('guardian-teacher-enrolment-code-2026');
  perform set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
  v_other_link := public.create_platform_guardian_invite(
    v_institution,'20000000-0000-4000-8000-000000000003','guardian',
    encode(sha256(convert_to(v_second_guardian_code,'utf8')),'hex'),now()+interval '7 days'
  );
  perform set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000005',true);
  begin
    perform public.redeem_platform_guardian_invite(v_second_guardian_code);
    raise exception 'teacher account escalated itself to guardian';
  exception when sqlstate '23505' then null;
  end;

  select count(*) into v_count from public.platform_membership_audit
    where institution_id=v_institution and entity_type='relationship';
  if v_count < 3 then raise exception 'guardian lifecycle audit trail is incomplete'; end if;
end $$;

rollback;
