"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { offlineSync } from "@/lib/offline/sync";

export interface UserProfile {
  id: string;
  full_name: string | null;
  first_name: string | null;
  email: string | null;
  avatar_url: string | null;
  level: number;
  xp: number;
  xp_to_next_level: number;
  streak: number;
  weekly_xp: number;
  focus_minutes_today: number;
  avg_score: number | null;
  streak_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id, full_name, first_name, email, avatar_url,
          level, xp, xp_to_next_level, streak, weekly_xp,
          focus_minutes_today, avg_score, streak_message,
          created_at, updated_at
        `)
        .eq("id", userId)
        .single();

      if (error) {
        console.error("[UserContext] Failed to fetch profile:", error.message);
        setProfile(null);
        return;
      }

      setProfile(data as UserProfile);
    },
    [supabase]
  );

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    await fetchProfile(user.id);
  }, [user, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      const {
        data: { user: currentUser },
        error,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (error || !currentUser) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setUser(currentUser);
      await fetchProfile(currentUser.id);
      if (mounted) setLoading(false);
    };

    void initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_OUT" || !session) {
        offlineSync.stopAutoSync();
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        setUser(session.user);
        await fetchProfile(session.user.id);
        if (mounted) setLoading(false);
      }
    });

    return () => {
      mounted = false;
      offlineSync.stopAutoSync();
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  useEffect(() => {
    if (!user) return;
    offlineSync.startAutoSync();
    void offlineSync.syncAll();
    return () => offlineSync.stopAutoSync();
  }, [user]);

  return (
    <UserContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextValue {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within a UserProvider");
  return context;
}
