-- Migration: Create user_achievements table for the gamification system
-- This stores unlocked achievements per user with metadata.

CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    rarity TEXT NOT NULL DEFAULT 'common',
    xp_reward INTEGER NOT NULL DEFAULT 0,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    seen BOOLEAN NOT NULL DEFAULT false,

    -- Each achievement can only be unlocked once per user
    UNIQUE(user_id, achievement_id)
);

-- Index for fast lookups
CREATE INDEX idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX idx_user_achievements_unlocked_at ON public.user_achievements(unlocked_at DESC);

-- Enable RLS
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS: users can read their own achievements
CREATE POLICY "Users can read own achievements"
    ON public.user_achievements
    FOR SELECT
    USING (auth.uid() = user_id);

-- RLS: users can insert their own achievements
CREATE POLICY "Users can insert own achievements"
    ON public.user_achievements
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS: users can update their own achievements (e.g., mark as seen)
CREATE POLICY "Users can update own achievements"
    ON public.user_achievements
    FOR UPDATE
    USING (auth.uid() = user_id);
