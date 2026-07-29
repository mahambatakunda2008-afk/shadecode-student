-- 0033_create_exam_boards_geo_mapping.sql
--
-- Which exam boards a student sees should depend on where they are, not
-- show every board to everyone. CAIE is global (used across many
-- countries) so it's always shown. National boards like ZIMSEC only make
-- sense for students in that country.
--
-- Extensible on purpose: adding a new local board later (e.g. a Kenyan or
-- Nigerian board) is just an INSERT here, not a code change -- same
-- metadata-driven pattern as syllabi/past_papers.
--
-- Already applied directly to production; this file exists so
-- supabase/migrations/ stays the source of truth.

CREATE TABLE IF NOT EXISTS public.exam_boards (
  id text PRIMARY KEY,          -- matches syllabi.board values, e.g. 'CAIE', 'ZIMSEC'
  name text NOT NULL,
  is_global boolean NOT NULL DEFAULT false,  -- CAIE-style: available regardless of country
  countries text[] NOT NULL DEFAULT '{}',    -- ISO 3166-1 alpha-2 codes, e.g. ['ZW']. Ignored if is_global.
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.exam_boards (id, name, is_global, countries) VALUES
  ('CAIE', 'Cambridge Assessment International Education', true, '{}'),
  ('ZIMSEC', 'Zimbabwe School Examinations Council', false, ARRAY['ZW'])
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.exam_boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exam_boards readable by authenticated" ON public.exam_boards
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "exam_boards admin write" ON public.exam_boards
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "exam_boards admin update" ON public.exam_boards
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "exam_boards admin delete" ON public.exam_boards
  FOR DELETE USING (has_role(auth.uid(), 'admin'));
