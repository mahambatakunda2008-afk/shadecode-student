-- Published learning coverage: version summary and topic-level gaps.
-- Read-only. Run in Supabase SQL editor. Does not publish or mutate content.

-- 1) Curriculum-version coverage.
select
  cv.id as curriculum_version_id,
  cv.board_id,
  cv.qualification_id,
  cv.syllabus_id,
  cv.syllabus_version,
  cv.subject_id,
  cv.status as curriculum_status,
  (select count(*) from public.curriculum_objectives co
   where co.curriculum_version_id = cv.id) as objective_rows,
  (select count(*) from public.curriculum_knowledge ck
   where ck.curriculum_version_id = cv.id) as knowledge_rows,
  (select count(*) from public.published_learning_assets pla
   where pla.curriculum_version_id = cv.id
     and pla.review_status = 'approved'
     and pla.published_at is not null) as published_assets,
  (select count(*) from public.published_learning_assets pla
   where pla.curriculum_version_id = cv.id
     and pla.review_status in ('draft', 'in_review')) as assets_awaiting_review
from public.curriculum_versions cv
order by cv.board_id, cv.subject_id, cv.syllabus_id, cv.syllabus_version;

-- 2) Topic-level gaps. curriculum_knowledge rows with kind='topic' are the
-- canonical topic inventory. Match exact topic_key and curriculum version.
select
  cv.board_id,
  cv.qualification_id,
  cv.syllabus_id,
  cv.syllabus_version,
  cv.subject_id,
  cv.status as curriculum_status,
  ck.topic_key,
  ck.title as topic_title,
  cardinality(coalesce(ck.objective_keys, array[]::text[])) as linked_objective_count,
  count(pla.id) filter (
    where pla.review_status = 'approved'
      and pla.published_at is not null
  ) as published_assets,
  count(pla.id) filter (
    where pla.review_status in ('draft', 'in_review')
  ) as work_in_progress_assets,
  case
    when cv.status <> 'verified' then 'curriculum_not_verified'
    when count(pla.id) filter (
      where pla.review_status = 'approved'
        and pla.published_at is not null
    ) = 0 then 'missing_published_asset'
    else 'has_published_asset'
  end as coverage_state
from public.curriculum_versions cv
join public.curriculum_knowledge ck
  on ck.curriculum_version_id = cv.id
 and ck.kind = 'topic'
left join public.published_learning_assets pla
  on pla.curriculum_version_id = cv.id
 and pla.topic_key = ck.topic_key
group by
  cv.board_id, cv.qualification_id, cv.syllabus_id, cv.syllabus_version,
  cv.subject_id, cv.status, ck.topic_key, ck.title, ck.objective_keys
order by
  case when cv.status = 'verified' then 0 else 1 end,
  cv.board_id, cv.subject_id, cv.syllabus_id, ck.topic_key;
