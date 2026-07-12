-- Create increment_xp RPC function
-- This function increments user XP and recalculates level automatically

CREATE OR REPLACE FUNCTION public.increment_xp(user_id UUID, amount INTEGER)
RETURNS TABLE(xp INTEGER, level INTEGER, streak INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_xp INTEGER;
  current_level INTEGER;
  current_streak INTEGER;
  new_xp INTEGER;
  new_level INTEGER;
BEGIN
  -- Get current user stats
  SELECT xp, level, streak INTO current_xp, current_level, current_streak
  FROM public.profiles
  WHERE id = user_id;
  
  -- Handle case where profile doesn't exist
  IF current_xp IS NULL THEN
    current_xp := 0;
    current_level := 1;
    current_streak := 0;
  END IF;
  
  -- Calculate new XP (ensure it doesn't go negative)
  new_xp := GREATEST(0, current_xp + amount);
  
  -- Calculate new level (level = floor(xp / 100) + 1)
  new_level := FLOOR(new_xp / 100) + 1;
  
  -- Update profile
  UPDATE public.profiles
  SET 
    xp = new_xp,
    level = new_level,
    updated_at = NOW()
  WHERE id = user_id;
  
  -- Return updated values
  RETURN QUERY
  SELECT new_xp, new_level, COALESCE(current_streak, 0);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_xp(UUID, INTEGER) TO authenticated;
