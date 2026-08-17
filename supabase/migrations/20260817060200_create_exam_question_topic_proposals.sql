create table if not exists public.exam_question_topic_proposals (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.exam_questions(id) on delete cascade,
  proposed_topic_id text not null,
  confidence numeric(5,4) check (confidence >= 0 and confidence <= 1),
  evidence text not null,
  source text not null,
  model text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewer_id uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists exam_question_topic_proposals_status_idx on public.exam_question_topic_proposals(status, created_at desc);
create index if not exists exam_question_topic_proposals_question_idx on public.exam_question_topic_proposals(question_id);

alter table public.exam_question_topic_proposals enable row level security;

drop policy if exists "question topic proposals admin read" on public.exam_question_topic_proposals;
drop policy if exists "question topic proposals admin write" on public.exam_question_topic_proposals;

create policy "question topic proposals admin read"
on public.exam_question_topic_proposals for select to authenticated
using (has_role(auth.uid(), 'admin'::text));

create policy "question topic proposals admin write"
on public.exam_question_topic_proposals for all to authenticated
using (has_role(auth.uid(), 'admin'::text))
with check (has_role(auth.uid(), 'admin'::text));
