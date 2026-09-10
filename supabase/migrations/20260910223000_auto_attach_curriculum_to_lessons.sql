create or replace function public.attach_verified_curriculum_to_lesson()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  subject_name text;
  identity jsonb;
  version_id uuid;
  objective_keys text[];
begin
  if new.curriculum_version_id is not null then
    return new;
  end if;

  select s.name
    into subject_name
  from public.subjects s
  where s.id = new.subject_id
    and s.user_id = new.user_id
  limit 1;

  if subject_name is null then
    return new;
  end if;

  select value
    into identity
  from public.profiles p,
       jsonb_array_elements(coalesce(p.curriculum_subjects, '[]'::jsonb)) as value
  where p.id = new.user_id
    and lower(coalesce(value->>'subjectName', '')) = lower(subject_name)
  limit 1;

  if identity is null then
    select value
      into identity
    from public.profiles p,
         jsonb_array_elements(coalesce(p.curriculum_subjects, '[]'::jsonb)) as value
    where p.id = new.user_id
      and lower(coalesce(value->>'subjectId', '')) = lower(regexp_replace(subject_name, '[^a-zA-Z0-9]+', '-', 'g'))
    limit 1;
  end if;

  if identity is null then
    return new;
  end if;

  select cv.id
    into version_id
  from public.curriculum_versions cv
  where cv.board_id = identity->>'boardId'
    and cv.qualification_id = identity->>'qualificationId'
    and cv.syllabus_id = identity->>'syllabusId'
    and cv.syllabus_version = identity->>'syllabusVersion'
    and cv.subject_id = identity->>'subjectId'
    and cv.status = 'verified'
  order by cv.effective_from desc nulls last
  limit 1;

  if version_id is null then
    return new;
  end if;

  select coalesce(array_agg(co.objective_key order by co.objective_key), '{}'::text[])
    into objective_keys
  from public.curriculum_objectives co
  where co.curriculum_version_id = version_id
    and co.status = 'verified';

  new.curriculum_version_id := version_id;
  new.curriculum_objective_keys := objective_keys;
  new.curriculum_coverage := jsonb_build_object(
    'status', 'unstarted',
    'verifiedObjectiveCount', coalesce(array_length(objective_keys, 1), 0),
    'coveredObjectiveKeys', '[]'::jsonb,
    'masteredObjectiveKeys', '[]'::jsonb
  );

  return new;
end;
$$;

revoke all on function public.attach_verified_curriculum_to_lesson() from public;

drop trigger if exists trg_attach_verified_curriculum_to_lesson on public.learn_lessons;
create trigger trg_attach_verified_curriculum_to_lesson
before insert on public.learn_lessons
for each row
execute function public.attach_verified_curriculum_to_lesson();
