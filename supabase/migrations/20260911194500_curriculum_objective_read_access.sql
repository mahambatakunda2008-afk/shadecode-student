-- Allow signed-in learners to read non-archived curriculum versions and objectives.
-- Code Lab and other learner-facing curriculum features use these records as the source of truth.
-- Verification state remains visible to the application; archived records stay hidden.

ALTER TABLE public.curriculum_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_objectives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_can_read_curriculum_versions" ON public.curriculum_versions;
CREATE POLICY "authenticated_can_read_curriculum_versions"
ON public.curriculum_versions
FOR SELECT
TO authenticated
USING (status <> 'archived');

DROP POLICY IF EXISTS "authenticated_can_read_curriculum_objectives" ON public.curriculum_objectives;
CREATE POLICY "authenticated_can_read_curriculum_objectives"
ON public.curriculum_objectives
FOR SELECT
TO authenticated
USING (status <> 'archived');
