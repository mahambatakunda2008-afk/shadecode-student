-- Harden revision queue access and remove unnecessary SECURITY DEFINER exposure.
drop policy if exists "Users can delete from own revision queue" on public.revision_queue;
drop policy if exists "Users can insert into own revision queue" on public.revision_queue;
drop policy if exists "Users can update own revision queue" on public.revision_queue;
drop policy if exists "Users can view own revision queue" on public.revision_queue;

create policy "Authenticated users can delete own revision queue"
on public.revision_queue for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "Authenticated users can insert own revision queue"
on public.revision_queue for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Authenticated users can update own revision queue"
on public.revision_queue for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Authenticated users can view own revision queue"
on public.revision_queue for select to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.upsert_revision_item(
  p_user_id uuid,
  p_topic text,
  p_subject text,
  p_source text default 'exam'
)
returns void
language plpgsql
security invoker
set search_path = public
as $function$
begin
  if auth.uid() is null then
    raise exception 'upsert_revision_item: unauthenticated call';
  end if;

  if auth.uid() <> p_user_id then
    raise exception 'upsert_revision_item: user_id mismatch';
  end if;

  insert into public.revision_queue (
    user_id, topic, subject, priority, source, last_seen, created_at
  )
  values (
    p_user_id, p_topic, p_subject, 1, p_source, now(), now()
  )
  on conflict on constraint revision_queue_user_topic_subject_unique
  do update set
    priority = revision_queue.priority + 1,
    last_seen = now();
end;
$function$;
