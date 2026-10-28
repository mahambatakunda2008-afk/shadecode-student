-- Serialize subject-list mutations so concurrent requests cannot overwrite one another.
-- This function only mutates the authenticated learner's profile selection. The existing
-- profile trigger remains responsible for synchronizing the subject catalogue.
create or replace function public.mutate_my_profile_subjects(
  p_action text,
  p_subject text
)
returns text[]
language plpgsql
security invoker
set search_path = public
as $$
declare
  learner_id uuid := auth.uid();
  selected_subjects text[];
  next_subjects text[];
  cleaned_subject text := btrim(regexp_replace(coalesce(p_subject, ''), '\\s+', ' ', 'g'));
begin
  if learner_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_action not in ('add', 'remove') then
    raise exception 'Unsupported subject mutation';
  end if;

  if cleaned_subject = '' or char_length(cleaned_subject) > 80 then
    raise exception 'Invalid subject name';
  end if;

  -- The row lock serializes concurrent add/remove operations for this learner.
  select coalesce(subjects, array[]::text[])
    into selected_subjects
    from public.profiles
   where id = learner_id
   for update;

  if not found then
    raise exception 'Learner profile not found';
  end if;

  if p_action = 'add' then
    if not exists (
      select 1
        from unnest(selected_subjects) as existing(name)
       where lower(btrim(existing.name)) = lower(cleaned_subject)
    ) then
      next_subjects := array_append(selected_subjects, cleaned_subject);
    else
      next_subjects := selected_subjects;
    end if;
  else
    select coalesce(array_agg(existing.name order by existing.ordinality), array[]::text[])
      into next_subjects
      from unnest(selected_subjects) with ordinality as existing(name, ordinality)
     where lower(btrim(existing.name)) <> lower(cleaned_subject);
  end if;

  update public.profiles
     set subjects = next_subjects
   where id = learner_id;

  return next_subjects;
end;
$$;

revoke all on function public.mutate_my_profile_subjects(text, text) from public;
grant execute on function public.mutate_my_profile_subjects(text, text) to authenticated;
