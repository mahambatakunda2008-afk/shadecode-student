create or replace function public.reconcile_cortex_generation_job(
  p_job_id uuid,
  p_user_id uuid
)
returns table(reconciled boolean, action text, completed_units integer, total_units integer, block_count integer)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_job public.cortex_generation_jobs%rowtype;
  v_lesson public.learn_lessons%rowtype;
  v_has_lesson boolean := false;
  v_source jsonb; v_blocks jsonb; v_title text; v_subject_name text; v_subject_id uuid;
  v_topic text; v_description text; v_difficulty text; v_progress integer;
  v_changed boolean := false; v_action text := 'noop';
begin
  if current_user <> 'service_role' then raise exception 'reconcile_cortex_generation_job: service role required'; end if;
  select * into v_job from public.cortex_generation_jobs where id=p_job_id and user_id=p_user_id for update;
  if not found then return query select false,'missing_job',0,0,0; return; end if;
  if v_job.kind <> 'lesson' then return query select false,'unsupported_kind',greatest(0,v_job.completed_units),greatest(0,v_job.total_units),0; return; end if;
  if v_job.status='complete' and jsonb_typeof(v_job.result->'blocks')='array' then v_source:=coalesce(v_job.result,'{}'::jsonb);
  elsif jsonb_typeof(v_job.partial->'blocks')='array' then v_source:=coalesce(v_job.partial,'{}'::jsonb);
  else return query select false,'no_checkpoint_payload',greatest(0,v_job.completed_units),greatest(0,v_job.total_units),0; return; end if;
  v_blocks:=coalesce(v_source->'blocks','[]'::jsonb);
  if jsonb_array_length(v_blocks)=0 then return query select false,'empty_checkpoint',greatest(0,v_job.completed_units),greatest(0,v_job.total_units),0; return; end if;
  v_title:=left(coalesce(nullif(v_source->>'title',''),'Cortex lesson'),255);
  v_topic:=left(coalesce(nullif(v_source->>'topic',''),nullif(v_job.request->>'topic',''),nullif(v_job.request->>'prompt',''),'Generated lesson'),500);
  v_description:=left(coalesce(nullif(v_source->>'description',''),'Generation checkpoint restored from Cortex.'),1500);
  v_difficulty:=coalesce(nullif(v_source->>'difficulty',''),nullif(v_job.request->>'difficulty',''),'medium');
  v_progress:=greatest(0,least(100,coalesce(v_job.progress,case when v_job.status='complete' then 100 else 0 end)));
  select * into v_lesson from public.learn_lessons where id=p_job_id and user_id=p_user_id for update;
  v_has_lesson:=found;
  if v_has_lesson then v_subject_id:=v_lesson.subject_id;
  else
    v_subject_name:=coalesce(nullif(v_source->>'subject',''),nullif(v_job.request->>'subject',''));
    if v_subject_name is null then return query select false,'missing_subject_context',greatest(0,v_job.completed_units),greatest(0,v_job.total_units),jsonb_array_length(v_blocks); return; end if;
    select s.id into v_subject_id from public.subjects s where s.user_id=p_user_id and lower(trim(s.name))=lower(trim(v_subject_name)) order by s.id limit 1;
    if v_subject_id is null then return query select false,'missing_subject',greatest(0,v_job.completed_units),greatest(0,v_job.total_units),jsonb_array_length(v_blocks); return; end if;
  end if;
  if v_has_lesson and jsonb_array_length(coalesce(v_lesson.blocks,'[]'::jsonb)) > jsonb_array_length(v_blocks) then
    -- Never destroy a lesson that is ahead of the durable checkpoint. That
    -- state needs explicit investigation rather than silent regression.
    return query select false,'lesson_ahead_of_checkpoint',greatest(0,v_job.completed_units),greatest(0,v_job.total_units),jsonb_array_length(v_lesson.blocks);
    return;
  end if;

  if v_has_lesson then
    v_changed:=v_lesson.subject_id is distinct from v_subject_id or v_lesson.topic is distinct from v_topic or v_lesson.title is distinct from v_title
      or v_lesson.description is distinct from v_description or v_lesson.difficulty is distinct from v_difficulty or v_lesson.progress is distinct from v_progress or v_lesson.blocks is distinct from v_blocks;
  else v_changed:=true; end if;
  if v_changed then
    insert into public.learn_lessons(id,user_id,subject_id,topic,title,description,difficulty,progress,blocks,updated_at)
    values(p_job_id,p_user_id,v_subject_id,v_topic,v_title,v_description,v_difficulty,v_progress,v_blocks,now())
    on conflict(id) do update set user_id=excluded.user_id,subject_id=excluded.subject_id,topic=excluded.topic,title=excluded.title,description=excluded.description,difficulty=excluded.difficulty,progress=excluded.progress,blocks=excluded.blocks,updated_at=excluded.updated_at;
    v_action:=case when v_has_lesson then 'repaired_lesson' else 'created_lesson' end;
  else v_action:='already_consistent'; end if;
  return query select true,v_action,greatest(0,v_job.completed_units),greatest(0,v_job.total_units),jsonb_array_length(v_blocks);
end;
$$;
revoke execute on function public.reconcile_cortex_generation_job(uuid,uuid) from public,anon,authenticated,postgres;
grant execute on function public.reconcile_cortex_generation_job(uuid,uuid) to service_role;