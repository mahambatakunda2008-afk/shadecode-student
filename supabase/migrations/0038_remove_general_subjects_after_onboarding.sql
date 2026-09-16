-- Keep the shared subject catalog aligned with onboarding.
-- General may exist only as a pre-onboarding placeholder. Once a learner has
-- selected subjects, it must not leak into Learn or any other module that
-- consumes the shared subjects table.

create or replace function public.enforce_onboarding_subjects()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'subjects' then
    if lower(trim(new.name)) = 'general' then
      if exists (
        select 1
        from public.profiles p
        where p.id = new.user_id
          and (
            p.onboarding_completed = true
            or p.onboarding_complete = true
            or p.subjects is not null
          )
      ) then
        raise exception 'General is not a valid subject for an onboarded learner';
      end if;
    end if;
    return new;
  end if;

  if new.onboarding_completed = true
     or new.onboarding_complete = true
     or new.subjects is not null then
    delete from public.subjects
    where user_id = new.id
      and lower(trim(name)) = 'general';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_onboarding_subjects on public.subjects;
create trigger trg_enforce_onboarding_subjects
before insert or update of name, user_id on public.subjects
for each row execute function public.enforce_onboarding_subjects();

drop trigger if exists trg_cleanup_general_onboarding on public.profiles;
create trigger trg_cleanup_general_onboarding
after insert or update of onboarding_completed, onboarding_complete, subjects on public.profiles
for each row execute function public.enforce_onboarding_subjects();

delete from public.subjects s
using public.profiles p
where p.id = s.user_id
  and lower(trim(s.name)) = 'general'
  and (
    p.onboarding_completed = true
    or p.onboarding_complete = true
    or p.subjects is not null
  );
