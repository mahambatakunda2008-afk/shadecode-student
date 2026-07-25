-- 0030_create_community_uploads.sql
--
-- Lets students contribute papers, mark schemes, examiner reports, or
-- missing variants. Everything lands in moderation; nothing becomes
-- public until an admin approves it. On approval, the contribution is
-- promoted into the real past_papers table (reusing the exact same
-- storage bucket + upsert path the admin upload form already uses) and
-- the contributor is awarded XP via the existing increment_xp RPC.
--
-- Legal posture: identical to the admin uploading a paper themselves --
-- the contributor is asserting they have the right to share the file
-- they're uploading. This is not a discovery/scraping system.

CREATE TABLE IF NOT EXISTS public.community_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  upload_type TEXT NOT NULL CHECK (upload_type IN ('paper', 'mark_scheme', 'examiner_report', 'variant')),
  syllabus_id TEXT NOT NULL REFERENCES public.syllabi(id) ON DELETE CASCADE,
  level TEXT NOT NULL,
  session TEXT NOT NULL,
  year INT NOT NULL,
  paper_number INT NOT NULL,
  variant INT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('qp', 'ms', 'in', 'gt')),
  file_path TEXT NOT NULL,
  file_size_bytes INT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  moderator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  moderator_notes TEXT,
  xp_awarded BOOLEAN NOT NULL DEFAULT false,
  resulting_paper_id UUID REFERENCES public.past_papers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_community_uploads_contributor ON public.community_uploads(contributor_id);
CREATE INDEX IF NOT EXISTS idx_community_uploads_status ON public.community_uploads(status);
CREATE INDEX IF NOT EXISTS idx_community_uploads_created_at ON public.community_uploads(created_at DESC);

INSERT INTO storage.buckets (id, name, public)
VALUES ('community-uploads-pending', 'community-uploads-pending', false)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.community_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own community uploads readable" ON public.community_uploads
  FOR SELECT USING (auth.uid() = contributor_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "contributors can submit" ON public.community_uploads
  FOR INSERT WITH CHECK (auth.uid() = contributor_id AND status = 'pending');
CREATE POLICY "admin can moderate" ON public.community_uploads
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "authenticated can upload to pending bucket" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'community-uploads-pending' AND auth.role() = 'authenticated');
CREATE POLICY "own uploads readable in pending bucket" ON storage.objects
  FOR SELECT USING (bucket_id = 'community-uploads-pending' AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(), 'admin')));
