-- Student-to-educator request creation, participant messaging and isolation.
-- Disposable PostgreSQL only; requires the platform and independent educator migrations.
begin;
insert into auth.users(id) values
 ('51000000-0000-4000-8000-000000000001'),
 ('51000000-0000-4000-8000-000000000002'),
 ('51000000-0000-4000-8000-000000000003')
on conflict do nothing;

alter table public.platform_educator_profiles disable trigger platform_educator_profile_guard;
insert into public.platform_educator_profiles(user_id,display_name,educator_type,bio,subjects,levels,status)
values ('51000000-0000-4000-8000-000000000002','Test Tutor','independent_tutor','Fixture educator',array['Mathematics','Physics'],array['AS Level','A Level'],'approved')
on conflict (user_id) do update set status='approved',subjects=excluded.subjects,levels=excluded.levels;
alter table public.platform_educator_profiles enable trigger platform_educator_profile_guard;

grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','51000000-0000-4000-8000-000000000001',true);

do $student$
declare v_id uuid;
begin
  v_id := public.create_educator_help_request(
    '51000000-0000-4000-8000-000000000002','Mathematics','AS Level','Differentiation',
    'I need help understanding the chain rule and when to use it.'
  );
  perform set_config('test.educator_request_id',v_id::text,true);
  if (select count(*) from public.platform_educator_help_requests where id=v_id)<>1 then
    raise exception 'student cannot read their own help request';
  end if;
  if (select count(*) from public.platform_educator_help_messages where request_id=v_id)<>1 then
    raise exception 'initial request message was not created';
  end if;
  begin
    perform public.set_educator_help_request_status(v_id,'accepted');
    raise exception 'student accepted their own request';
  exception when sqlstate '22023' then null;
  end;
end
$student$;

select set_config('request.jwt.claim.sub','51000000-0000-4000-8000-000000000002',true);
do $educator$
declare v_id uuid;
begin
  v_id:=current_setting('test.educator_request_id')::uuid;
  if (select count(*) from public.platform_educator_help_requests where id=v_id)<>1 then
    raise exception 'educator cannot read incoming request';
  end if;
  perform public.reply_to_educator_help_request(v_id,'I can help. Let us start by identifying the inner function.');
  if not public.set_educator_help_request_status(v_id,'accepted') then
    raise exception 'educator could not accept request';
  end if;
  if (select count(*) from public.platform_educator_help_messages where request_id=v_id)<>2 then
    raise exception 'educator reply was not persisted';
  end if;
end
$educator$;

select set_config('request.jwt.claim.sub','51000000-0000-4000-8000-000000000003',true);
do $outsider$
declare v_id uuid;
begin
  v_id:=current_setting('test.educator_request_id')::uuid;
  if (select count(*) from public.platform_educator_help_requests where id=v_id)<>0 then
    raise exception 'unrelated learner can read another learner request';
  end if;
  if (select count(*) from public.platform_educator_help_messages where request_id=v_id)<>0 then
    raise exception 'unrelated learner can read private conversation messages';
  end if;
  begin
    perform public.reply_to_educator_help_request(v_id,'Intrusive message');
    raise exception 'unrelated learner replied to private conversation';
  exception when insufficient_privilege then null;
  end;
end
$outsider$;
rollback;
