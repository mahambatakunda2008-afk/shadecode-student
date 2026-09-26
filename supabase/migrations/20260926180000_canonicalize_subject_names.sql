-- Canonicalize learner subject identities and prevent case-only duplicates.
-- Existing duplicate rows are merged into the earliest canonical row.

begin;

update public.learn_lessons
set subject_id = canonical.id
from public.subjects duplicate
join public.subjects canonical
  on canonical.user_id = duplicate.user_id
 and lower(trim(canonical.name)) = lower(trim(duplicate.name))
 and canonical.created_at < duplicate.created_at
where public.learn_lessons.subject_id = duplicate.id;

update public.tasks
set subject_id = canonical.id
from public.subjects duplicate
join public.subjects canonical
  on canonical.user_id = duplicate.user_id
 and lower(trim(canonical.name)) = lower(trim(duplicate.name))
 and canonical.created_at < duplicate.created_at
where public.tasks.subject_id = duplicate.id;

delete from public.subjects duplicate
using public.subjects canonical
where duplicate.id <> canonical.id
  and duplicate.user_id = canonical.user_id
  and lower(trim(duplicate.name)) = lower(trim(canonical.name))
  and canonical.created_at < duplicate.created_at;

create unique index if not exists subjects_user_canonical_name_uidx
  on public.subjects (user_id, lower(trim(name)));

commit;