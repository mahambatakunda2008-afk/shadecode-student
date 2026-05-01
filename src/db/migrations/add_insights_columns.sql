ALTER TABLE public.insights
ADD COLUMN id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN insight_text text NOT NULL,
ADD COLUMN pattern_type text,
ADD COLUMN created_at timestamp with time zone DEFAULT now();
