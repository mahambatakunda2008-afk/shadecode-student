-- revision_queue.source only allowed ('exam','cortex','manual'), so every row written by paper
-- learning ('paper_learning') was rejected by the CHECK and silently dropped.
-- Applied to production via MCP on 2026-10-09.
do $$
declare c text;
begin
  select conname into c
  from pg_constraint
  where conrelid = 'public.revision_queue'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%source%';
  if c is not null then
    execute format('alter table public.revision_queue drop constraint %I', c);
  end if;
  alter table public.revision_queue
    add constraint revision_queue_source_check
    check (source in ('exam', 'cortex', 'manual', 'paper_learning', 'syllabus_selfcheck'));
end $$;
