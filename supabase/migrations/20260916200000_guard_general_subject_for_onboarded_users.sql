create or replace function public.guard_general_subject_for_onboarded_user()
returns trigger
language plpgsql
as $$
declare
  profile_subjects text[];
  has_real_subjects boolean;
begin
  if lower(trim(coalesce(new.name, ''))) <> 'general' then
    return new;
  end if;

  select p.subjects
    into profile_subjects
  from public.profiles p
  where p.id = new.user_id;

  has_real_subjects := coalesce(array_length(profile_subjects, 1), 0) > 0;

  if has_real_subjects then
    raise exception 'General is not a valid subject for an onboarded learner. Use the learner profile subjects instead.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_general_subject_for_onboarded_user on public.subjects;

create trigger trg_guard_general_subject_for_onboarded_user
before insert or update of user_id, name on public.subjects
for each row
execute function public.guard_general_subject_for_onboarded_user();

-- Defensive cleanup: an onboarded learner must never retain a General catalog row.
delete from public.subjects s
using public.profiles p
where p.id = s.user_id
  and lower(trim(s.name)) = 'general'
  and coalesce(array_length(p.subjects, 1), 0) > 0;
