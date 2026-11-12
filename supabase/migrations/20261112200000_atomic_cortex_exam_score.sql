-- Atomically upsert one exam score into Cortex memory.
-- The unique user_id row lock serializes concurrent writers and the
-- submissionIdentity filter makes retries idempotent.
create or replace function public.record_exam_score(
  p_user_id uuid,
  p_score jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_identity text;
  v_scores jsonb;
  v_average numeric;
begin
  if p_user_id is null or p_score is null or jsonb_typeof(p_score) <> 'object' then
    raise exception 'Invalid exam score payload';
  end if;

  v_identity := nullif(p_score->>'submissionIdentity', '');
  if v_identity is null then
    raise exception 'Exam score submissionIdentity is required';
  end if;

  insert into public.cortex_memory (user_id, exam_scores, average_exam_score, updated_at)
  values (p_user_id, jsonb_build_array(p_score), greatest(0, coalesce((p_score->>'percentage')::numeric, (p_score->>'score')::numeric, 0)), now())
  on conflict (user_id) do update
    set exam_scores = (
      select coalesce(jsonb_agg(item), '[]'::jsonb)
      from jsonb_array_elements(
        case when jsonb_typeof(cortex_memory.exam_scores) = 'array'
          then cortex_memory.exam_scores else '[]'::jsonb end
      ) as prior(item)
      where prior.item->>'submissionIdentity' is distinct from v_identity
    ) || jsonb_build_array(p_score),
    average_exam_score = (
      select coalesce(round(avg(
        coalesce((entry->>'percentage')::numeric, (entry->>'score')::numeric, 0)
      )), 0)
      from jsonb_array_elements(
        (
          select coalesce(jsonb_agg(item), '[]'::jsonb)
          from jsonb_array_elements(
            case when jsonb_typeof(cortex_memory.exam_scores) = 'array'
              then cortex_memory.exam_scores else '[]'::jsonb end
          ) as prior(item)
          where prior.item->>'submissionIdentity' is distinct from v_identity
        ) || jsonb_build_array(p_score)
      ) as scores(entry)
    ),
    updated_at = now()
  returning exam_scores into v_scores;

  select coalesce(round(avg(
    coalesce((entry->>'percentage')::numeric, (entry->>'score')::numeric, 0)
  )), 0)
  into v_average
  from jsonb_array_elements(v_scores) as scores(entry);

  return jsonb_build_object('exam_scores', v_scores, 'average_exam_score', v_average);
end;
$$;

revoke all on function public.record_exam_score(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.record_exam_score(uuid, jsonb) to service_role;
