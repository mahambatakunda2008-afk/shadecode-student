create or replace function public.guard_subject_catalog_name()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  profile_subjects text[];
  onboarding_done boolean;
  has_real_subjects boolean;
begin
  if lower(trim(new.name)) <> 'general' then
    return new;
  end if;

  select p.subjects, coalesce(p.onboarding_completed, false)
    into profile_subjects, onboarding_done
  from public.profiles p
  where p.id = new.user_id;

  has_real_subjects := coalesce(array_length(profile_subjects, 1), 0) > 0;

  if onboarding_done and has_real_subjects then
    raise exception using
      errcode = '23514',
      message = 'General cannot be used as a subject after onboarding subjects are selected';
  end if;

  return new;
end;
$$;

drop trigger if exists subjects_block_legacy_general on public.subjects;
create trigger subjects_block_legacy_general
before insert or update of name on public.subjects
for each row
execute function public.guard_subject_catalog_name();

delete from public.subjects s
using public.profiles p
where s.user_id = p.id
  and lower(trim(s.name)) = 'general'
  and coalesce(p.onboarding_completed, false)
  and coalesce(array_length(p.subjects, 1), 0) > 0;
