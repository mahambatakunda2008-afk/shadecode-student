-- Structured assessment authoring validation and tenant authorization.
-- Runs after the assignment lifecycle test and assessment studio migration in disposable PostgreSQL.
begin;

insert into auth.users(id) values
 ('21000000-0000-4000-8000-000000000001'),
 ('21000000-0000-4000-8000-000000000002'),
 ('21000000-0000-4000-8000-000000000003')
on conflict do nothing;
insert into public.platform_institutions(id,name,institution_type,country_code)
values ('31000000-0000-4000-8000-000000000001','Assessment Fixture School','school','ZW')
on conflict do nothing;
insert into public.platform_groups(id,institution_id,name,group_type)
values ('41000000-0000-4000-8000-000000000001','31000000-0000-4000-8000-000000000001','Form 6A','class')
on conflict do nothing;
insert into public.platform_institution_members(institution_id,user_id,membership_role,status)
values
 ('31000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000001','teacher','active')
on conflict do nothing;
insert into public.platform_group_members(group_id,user_id,membership_role,status)
values
 ('41000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000001','teacher','active'),
 ('41000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000002','student','active')
on conflict do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub','21000000-0000-4000-8000-000000000001',true);

do $assessment$
declare
  v_id uuid;
  v_questions jsonb := '[
    {"prompt":"Differentiate x^2.","type":"written","marks":4},
    {"prompt":"Choose the gradient of y=3x.","type":"multiple_choice","marks":1,"options":["2","3","4"],"correctOption":"3"}
  ]'::jsonb;
begin
  v_id := public.create_platform_assessment(
    '41000000-0000-4000-8000-000000000001',
    'Differentiation checkpoint','Mathematics','Show all working.',now()+interval '1 day',5,true,
    'quiz',v_questions,'[{"criterion":"Correct differentiation method"},{"criterion":"Accurate final answer"}]'::jsonb
  );
  if not exists (
    select 1 from public.platform_assignments
    where id=v_id and assessment_type='quiz' and max_score=5
      and jsonb_array_length(questions)=2
  ) then
    raise exception 'structured assessment was not persisted correctly';
  end if;
  if exists (
    select 1 from public.platform_assignments
    where id=v_id and questions @> '[{"correctOption":"3"}]'::jsonb
  ) then
    raise exception 'learner-visible question payload contains a correct answer';
  end if;
  if not exists (
    select 1 from public.platform_assignment_answer_keys
    where assignment_id=v_id and jsonb_array_length(correct_answers)=1 and jsonb_array_length(mark_scheme)=2
  ) then
    raise exception 'teacher-only answer key or marking criteria were not persisted';
  end if;

  begin
    perform public.create_platform_assessment(
      '41000000-0000-4000-8000-000000000001',
      'Bad total test','Mathematics','',null,99,false,'test',v_questions,'[]'::jsonb
    );
    raise exception 'assessment accepted question marks that do not add up';
  exception when sqlstate '22023' then null;
  end;

  begin
    perform public.create_platform_assessment(
      '41000000-0000-4000-8000-000000000001',
      'Bad MCQ test','Mathematics','',null,5,false,'test',
      '[{"prompt":"Pick one","type":"multiple_choice","marks":5,"options":["A","B"],"correctOption":"C"}]'::jsonb,
      '[]'::jsonb
    );
    raise exception 'assessment accepted a correct option outside the option list';
  exception when sqlstate '22023' then null;
  end;
end
$assessment$;

select set_config('request.jwt.claim.sub','21000000-0000-4000-8000-000000000002',true);
do $learner_key_privacy$
begin
  if (select count(*) from public.platform_assignment_answer_keys) <> 0 then
    raise exception 'student can read teacher-only assessment answer keys';
  end if;
end
$learner_key_privacy$;

select set_config('request.jwt.claim.sub','21000000-0000-4000-8000-000000000003',true);
do $unauthorized$
begin
  begin
    perform public.create_platform_assessment(
      '41000000-0000-4000-8000-000000000001',
      'Unauthorized assessment','Mathematics','',null,1,false,'test',
      '[{"prompt":"Question","type":"written","marks":1}]'::jsonb,'[]'::jsonb
    );
    raise exception 'unassigned account created an assessment';
  exception when insufficient_privilege then null;
  end;
end
$unauthorized$;

rollback;
