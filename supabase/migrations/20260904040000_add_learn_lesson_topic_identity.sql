-- Give Learn lessons a durable topic identity so lesson, quiz, and Cortex evidence
-- can refer to the concept instead of treating a lesson UUID as a fake topic.
alter table public.learn_lessons
  add column if not exists topic text;

create index if not exists learn_lessons_user_topic_idx
  on public.learn_lessons (user_id, topic)
  where topic is not null;
