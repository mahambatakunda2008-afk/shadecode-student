-- Atomic review and publication actions. Review records and status transitions commit together.
create or replace function public.review_teacher_tutorial(
  p_tutorial_id uuid,
  p_expected_version integer,
  p_verdict text,
  p_note text default null
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_author uuid; v_status text;
begin
  if auth.uid() is null
     or not (has_role(auth.uid(), 'teacher'::text) or has_role(auth.uid(), 'admin'::text)) then
    raise exception 'Reviewer role required';
  end if;
  if p_verdict not in ('verified','changes_requested','rejected') then
    raise exception 'Invalid review verdict';
  end if;
  if p_verdict <> 'verified' and (p_note is null or char_length(trim(p_note)) = 0) then
    raise exception 'A note is required when changes are requested or content is rejected';
  end if;
  if p_note is not null and char_length(p_note) > 2000 then
    raise exception 'Review note is too long';
  end if;

  select author_id, status into v_author, v_status
  from public.teacher_tutorials
  where id = p_tutorial_id and version = p_expected_version
  for update;
  if v_author is null or v_status <> 'in_review' then
    raise exception 'Tutorial version is no longer awaiting review';
  end if;

  insert into public.teacher_tutorial_reviews(tutorial_id, tutorial_version, reviewer_id, verdict, note)
  values (p_tutorial_id, p_expected_version, auth.uid(), p_verdict, nullif(trim(p_note), ''))
  on conflict (tutorial_id, tutorial_version, reviewer_id)
  do update set verdict = excluded.verdict, note = excluded.note, created_at = now();

  update public.teacher_tutorials
  set status = p_verdict
  where id = p_tutorial_id and version = p_expected_version;

  return p_verdict;
end;
$$;

create or replace function public.publish_teacher_tutorial(
  p_tutorial_id uuid,
  p_expected_version integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not has_role(auth.uid(), 'admin'::text) then
    raise exception 'Admin role required';
  end if;

  update public.teacher_tutorials
  set status = 'published', published_by = auth.uid(), published_at = now()
  where id = p_tutorial_id and version = p_expected_version and status = 'verified';

  return found;
end;
$$;

revoke all on function public.review_teacher_tutorial(uuid, integer, text, text) from public, anon;
revoke all on function public.publish_teacher_tutorial(uuid, integer) from public, anon;
grant execute on function public.review_teacher_tutorial(uuid, integer, text, text) to authenticated;
grant execute on function public.publish_teacher_tutorial(uuid, integer) to authenticated;
