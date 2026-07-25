-- 0029_create_question_indexing.sql
--
-- Breaks a past paper into individually addressable questions. Designed
-- now, populated gradually — a paper works fine with zero indexed
-- questions (nothing here is required for /exam-hub/papers to function),
-- but every downstream feature that wants per-question granularity
-- (search by topic, weak-topic tracking, per-question bookmarking, future
-- AI hints) has a real table to build against instead of a redesign later.
--
-- Population path (not built in this migration, left for whoever writes
-- the indexing tool next): manual tagging via an admin UI, or a
-- vision/OCR pass over the PDF. Either way, this is metadata only — no
-- PDF content is duplicated or stored here, just a page/question pointer
-- into the existing past_papers file.

CREATE TABLE IF NOT EXISTS public.exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID NOT NULL REFERENCES public.past_papers(id) ON DELETE CASCADE,
  question_number TEXT NOT NULL, -- e.g. "1", "2a", "2(b)(i)" — exam numbering isn't purely numeric
  page_number INT,
  topic_id TEXT, -- matches CurriculumTopic.id from src/lib/curriculum/*.ts, same pattern as user_saved_questions.topic_id (no FK — curriculum lives in TS constants, not a DB table)
  subtopic TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  marks INT,
  question_text TEXT, -- optional, enables full-text search once populated
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (paper_id, question_number)
);

CREATE INDEX IF NOT EXISTS idx_exam_questions_paper_id ON public.exam_questions(paper_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_topic_id ON public.exam_questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_difficulty ON public.exam_questions(difficulty);

-- Full-text search over question_text, once populated. Uses a generated
-- tsvector column so search stays fast without recomputing on every query.
ALTER TABLE public.exam_questions ADD COLUMN IF NOT EXISTS question_text_search tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(question_text, ''))) STORED;
CREATE INDEX IF NOT EXISTS idx_exam_questions_text_search ON public.exam_questions USING GIN (question_text_search);

-- Per-user attempt tracking at question granularity — foundation for real
-- weak-topic detection (currently approximated at whole-paper level via
-- user_past_paper_state.score, which is a much blunter signal).
CREATE TABLE IF NOT EXISTS public.user_question_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.exam_questions(id) ON DELETE CASCADE,
  correct BOOLEAN,
  score NUMERIC,
  time_spent_seconds INT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, question_id, attempted_at)
);

CREATE INDEX IF NOT EXISTS idx_user_question_attempts_user_id ON public.user_question_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_question_attempts_question_id ON public.user_question_attempts(question_id);

ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_question_attempts ENABLE ROW LEVEL SECURITY;

-- Questions are catalog data — readable by any authenticated student,
-- same posture as syllabi/past_papers.
CREATE POLICY "exam_questions readable by authenticated" ON public.exam_questions
  FOR SELECT USING (auth.role() = 'authenticated');

-- Writes restricted to admins, mirroring 0026's pattern for past_papers.
CREATE POLICY "exam_questions admin write" ON public.exam_questions
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "exam_questions admin update" ON public.exam_questions
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "exam_questions admin delete" ON public.exam_questions
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "own question attempts" ON public.user_question_attempts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
