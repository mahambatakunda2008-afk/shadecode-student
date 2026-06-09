-- Add RLS policies for user_profiles and lesson_prerequisites

-- Ensure user_profiles RLS
ALTER TABLE IF EXISTS public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own profile" ON public.user_profiles;
CREATE POLICY "Users can manage own profile" ON public.user_profiles
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Ensure lesson_prerequisites RLS
ALTER TABLE IF EXISTS public.lesson_prerequisites ENABLE ROW LEVEL SECURITY;

-- SELECT: allow if the lesson belongs to the user
DROP POLICY IF EXISTS "Users can select own lesson_prereqs" ON public.lesson_prerequisites;
CREATE POLICY "Users can select own lesson_prereqs" ON public.lesson_prerequisites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.learn_lessons ll
      WHERE ll.id = lesson_prerequisites.lesson_id AND ll.user_id = auth.uid()
    )
  );

-- INSERT: allow only when both lesson_id and prerequisite_lesson_id belong to the user
DROP POLICY IF EXISTS "Users can insert own lesson_prereqs" ON public.lesson_prerequisites;
CREATE POLICY "Users can insert own lesson_prereqs" ON public.lesson_prerequisites
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.learn_lessons ll WHERE ll.id = lesson_prerequisites.lesson_id AND ll.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.learn_lessons rl WHERE rl.id = lesson_prerequisites.prerequisite_lesson_id AND rl.user_id = auth.uid())
  );

-- UPDATE: allow when the target row's lesson belongs to user and new values also belong to user
DROP POLICY IF EXISTS "Users can update own lesson_prereqs" ON public.lesson_prerequisites;
CREATE POLICY "Users can update own lesson_prereqs" ON public.lesson_prerequisites
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.learn_lessons ll WHERE ll.id = lesson_prerequisites.lesson_id AND ll.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.learn_lessons ll WHERE ll.id = new.lesson_id AND ll.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.learn_lessons rl WHERE rl.id = new.prerequisite_lesson_id AND rl.user_id = auth.uid())
  );

-- DELETE: allow when the lesson belongs to the user
DROP POLICY IF EXISTS "Users can delete own lesson_prereqs" ON public.lesson_prerequisites;
CREATE POLICY "Users can delete own lesson_prereqs" ON public.lesson_prerequisites
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.learn_lessons ll WHERE ll.id = lesson_prerequisites.lesson_id AND ll.user_id = auth.uid())
  );

-- Note: Ensure auth.uid() is supported in your Supabase/Postgres configuration.
