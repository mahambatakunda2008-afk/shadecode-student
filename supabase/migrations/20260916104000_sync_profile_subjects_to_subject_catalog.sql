create or replace function public.sync_profile_subject_catalog()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  subject_code text;
  subject_name text;
begin
  -- The onboarding profile is the canonical source of a learner's selected subjects.
  -- Keep the legacy `subjects` catalog in sync so Learn, tasks, and other modules
  -- that reference subject UUIDs cannot fall back to a generic "General" subject.
  if coalesce(array_length(new.subjects, 1), 0) = 0 then
    return new;
  end if;

  foreach subject_code in array new.subjects loop
    subject_name := case
      when subject_code in ('maths', 'mathematics', 'numeracy', 'early-numeracy') then 'Mathematics'
      when subject_code = 'physics' then 'Physics'
      when subject_code = 'chemistry' then 'Chemistry'
      when subject_code = 'biology' then 'Biology'
      when subject_code in ('english', 'reading', 'language', 'early-literacy') then
        case when new.study_level = 'a-level' then 'English Language'
             when new.study_level = 'university' then 'Communication / English'
             else 'English' end
      when subject_code in ('computer-science', 'computer_science', 'coding') then
        case when new.study_level = 'tvet' then 'Computing / ICT'
             when new.study_level = 'professional' then 'Technology / Computing'
             else 'Computer Science' end
      when subject_code = 'science' then
        case when new.study_level = 'lower-secondary' then 'Integrated Science'
             when new.study_level = 'tvet' then 'Applied Science'
             else 'Science' end
      when subject_code = 'history' then 'History'
      when subject_code = 'geography' then 'Geography'
      when subject_code = 'economics' then 'Economics'
      when subject_code = 'business' then
        case when new.study_level = 'lower-secondary' then 'Business Studies' else 'Business' end
      when subject_code = 'accounting' then
        case when new.study_level = 'professional' then 'Finance / Accounting' else 'Accounting' end
      when subject_code = 'art' then 'Art & Design'
      when subject_code = 'music' then 'Music'
      when subject_code = 'social-studies' then 'Social Studies'
      when subject_code = 'shona' then 'Shona'
      when subject_code = 'ndebele' then 'Ndebele'
      when subject_code = 'discovery' then 'My World & Discovery'
      when subject_code = 'creative' then 'Creative Expression'
      when subject_code = 'movement' then 'Movement & Wellbeing'
      else initcap(replace(subject_code, '_', ' '))
    end;

    if subject_name is not null and btrim(subject_name) <> '' then
      if not exists (
        select 1 from public.subjects s
        where s.user_id = new.id and lower(trim(s.name)) = lower(trim(subject_name))
      ) then
        insert into public.subjects (user_id, name) values (new.id, subject_name);
      end if;
    end if;
  end loop;

  -- General was a legacy bootstrap subject. Once onboarding has real subjects,
  -- it must not remain selectable.
  delete from public.subjects s
  where s.user_id = new.id
    and lower(trim(s.name)) = 'general';

  return new;
end;
$$;

create trigger profiles_sync_subject_catalog
after insert or update of subjects, study_level on public.profiles
for each row
execute function public.sync_profile_subject_catalog();

-- Backfill current onboarded learners immediately.
update public.profiles
set subjects = subjects
where onboarding_completed = true
  and coalesce(array_length(subjects, 1), 0) > 0;
