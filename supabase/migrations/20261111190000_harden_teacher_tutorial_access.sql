-- Tighten reviewer transitions and private media visibility for the tutorial studio.
create or replace function public.guard_teacher_tutorial_transition()
returns trigger language plpgsql security definer set search_path = public as $$
declare expected_verdict text;
begin
  if auth.uid() is null then
    raise exception 'Tutorial changes require an authenticated user';
  end if;

  if auth.uid() = old.author_id then
    if old.status not in ('draft','changes_requested') then
      raise exception 'Only an editable draft can be changed by its author';
    end if;
    if new.status not in ('draft','changes_requested','in_review') then
      raise exception 'Authors may only save drafts or submit them for review';
    end if;
    if new.status = 'in_review' and (
      char_length(trim(new.title)) < 3
      or char_length(trim(new.subject)) = 0
      or jsonb_array_length(new.blocks) = 0
    ) then
      raise exception 'A title, subject and at least one content block are required';
    end if;
  else
    if old.status <> 'in_review'
       or new.status not in ('verified','changes_requested','rejected') then
      raise exception 'Reviewers may only decide on submitted tutorials';
    end if;
    if new.author_id is distinct from old.author_id
       or new.title is distinct from old.title
       or new.subject is distinct from old.subject
       or new.topic is distinct from old.topic
       or new.summary is distinct from old.summary
       or new.blocks is distinct from old.blocks
       or new.version is distinct from old.version then
      raise exception 'Reviewers cannot edit tutorial content';
    end if;

    expected_verdict := new.status;
    if not exists (
      select 1 from public.teacher_tutorial_reviews r
      where r.tutorial_id = old.id
        and r.tutorial_version = old.version
        and r.reviewer_id = auth.uid()
        and r.verdict = expected_verdict
    ) then
      raise exception 'A matching version-bound review must be recorded before changing status';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists teacher_tutorial_transition_guard on public.teacher_tutorials;
create trigger teacher_tutorial_transition_guard
before update on public.teacher_tutorials
for each row execute function public.guard_teacher_tutorial_transition();

drop policy if exists "authors and reviewers read teacher media" on storage.objects;
create policy "authors and reviewers read teacher media" on storage.objects
  for select to authenticated using (
    bucket_id = 'teacher-media'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or has_role(auth.uid(), 'admin'::text)
      or (
        has_role(auth.uid(), 'teacher'::text)
        and exists (
          select 1 from public.teacher_tutorials t
          where t.id::text = (storage.foldername(name))[2]
            and t.status in ('in_review','verified','published')
        )
      )
    )
  );
