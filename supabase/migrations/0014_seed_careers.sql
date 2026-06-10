-- Migration: seed careers and skills
-- Idempotent inserts using ON CONFLICT DO NOTHING

-- Careers
INSERT INTO public.careers (slug, title, description, salary_low, salary_high, related)
VALUES
('software-engineer', 'Software Engineer', 'Design, build, and maintain software systems. Work with code, teams, and modern tooling to deliver products.', 40000, 120000, '["Data Scientist","DevOps Engineer"]'::jsonb),
('data-scientist', 'Data Scientist', 'Analyze data to extract insights, build models, and inform decisions. Strong statistics and programming skills required.', 35000, 110000, '["Machine Learning Engineer","Data Analyst"]'::jsonb),
('doctor', 'Doctor', 'Medical professional diagnosing and treating patients. Requires formal medical education and licensing.', 30000, 150000, '["Surgeon","Medical Researcher"]'::jsonb),
('accountant', 'Accountant', 'Manage financial records, reporting, and compliance for individuals and organizations.', 20000, 90000, '["Auditor","Financial Analyst"]'::jsonb),
('lawyer', 'Lawyer', 'Provide legal advice, represent clients, and manage legal documentation across specialties.', 30000, 130000, '["Judge","Legal Researcher"]'::jsonb),
('electrician', 'Electrician', 'Install, maintain and repair electrical systems for homes and businesses.', 15000, 60000, '["Electrical Engineer","Maintenance Technician"]'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- Skills
INSERT INTO public.skills (name, description) VALUES
('Programming', 'Writing code in one or more languages'),
('Algorithms', 'Understanding algorithms and complexity'),
('Data Analysis', 'Cleaning, visualizing, and interpreting data'),
('Statistics', 'Probability and statistical inference'),
('Machine Learning', 'Building predictive models and ML systems'),
('Clinical Knowledge', 'Medical domain knowledge and diagnostics'),
('Accounting Principles', 'Financial accounting and bookkeeping'),
('Legal Research', 'Researching case law and statutes'),
('Electrical Installation', 'Knowledge of wiring, circuits, and safety'),
('Communication', 'Written and verbal communication skills'),
('Problem Solving', 'Structured problem solving and debugging')
ON CONFLICT (name) DO NOTHING;

-- Career -> Skill mappings (importance scale 1-10)
INSERT INTO public.career_skills (career_id, skill_id, importance)
SELECT c.id, s.id, 10 FROM public.careers c JOIN public.skills s ON s.name = 'Programming' WHERE c.slug = 'software-engineer' ON CONFLICT DO NOTHING;
INSERT INTO public.career_skills (career_id, skill_id, importance)
SELECT c.id, s.id, 9 FROM public.careers c JOIN public.skills s ON s.name = 'Algorithms' WHERE c.slug = 'software-engineer' ON CONFLICT DO NOTHING;
INSERT INTO public.career_skills (career_id, skill_id, importance)
SELECT c.id, s.id, 10 FROM public.careers c JOIN public.skills s ON s.name = 'Data Analysis' WHERE c.slug = 'data-scientist' ON CONFLICT DO NOTHING;
INSERT INTO public.career_skills (career_id, skill_id, importance)
SELECT c.id, s.id, 9 FROM public.careers c JOIN public.skills s ON s.name = 'Statistics' WHERE c.slug = 'data-scientist' ON CONFLICT DO NOTHING;
INSERT INTO public.career_skills (career_id, skill_id, importance)
SELECT c.id, s.id, 10 FROM public.careers c JOIN public.skills s ON s.name = 'Clinical Knowledge' WHERE c.slug = 'doctor' ON CONFLICT DO NOTHING;
INSERT INTO public.career_skills (career_id, skill_id, importance)
SELECT c.id, s.id, 10 FROM public.careers c JOIN public.skills s ON s.name = 'Accounting Principles' WHERE c.slug = 'accountant' ON CONFLICT DO NOTHING;
INSERT INTO public.career_skills (career_id, skill_id, importance)
SELECT c.id, s.id, 9 FROM public.careers c JOIN public.skills s ON s.name = 'Legal Research' WHERE c.slug = 'lawyer' ON CONFLICT DO NOTHING;
INSERT INTO public.career_skills (career_id, skill_id, importance)
SELECT c.id, s.id, 10 FROM public.careers c JOIN public.skills s ON s.name = 'Electrical Installation' WHERE c.slug = 'electrician' ON CONFLICT DO NOTHING;

-- Basic recommended courses mapping placeholder (admin can update with real subject IDs)
-- This attempts to associate by subject name if subjects are prepopulated; will be a no-op otherwise.
INSERT INTO public.career_recommended_courses (career_id, subject_id, note)
SELECT c.id, s.id, 'Core course for this career' FROM public.careers c JOIN public.subjects s ON lower(s.name) LIKE '%programming%' WHERE c.slug = 'software-engineer' ON CONFLICT DO NOTHING;

-- End of seed
