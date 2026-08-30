"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { offlineSync } from "@/lib/offline/sync";
import { getRememberedUserId, rememberActiveUser, clearRememberedUser } from "@/lib/local-first/identity";
import { offlineStorage } from "@/lib/offline/storage";
import type { StudyLevel } from "@/types";

export interface UserProfile { id: string; full_name: string | null; first_name: string | null; email: string | null; avatar_url: string | null; level: number; xp: number; xp_to_next_level: number; streak: number; weekly_xp: number; focus_minutes_today: number; avg_score: number | null; streak_message: string | null; created_at: string; updated_at: string; study_level: StudyLevel | null; subjects: string[] | null; daily_goal_minutes: number | null; study_style: "structured" | "flexible" | null; }
export interface UserContextValue { user: User | null; profile: UserProfile | null; loading: boolean; refreshProfile: () => Promise<void>; }

const PROFILE_CACHE_PREFIX = "shadecode:profile:";
const AUTH_BOOT_TIMEOUT_MS = 2_000;
const PROFILE_FETCH_TIMEOUT_MS = 4_000;
const UserContext = createContext<UserContextValue>({ user: null, profile: null, loading: true, refreshProfile: async () => {} });

function readCachedProfile(userId: string): UserProfile | null { if (typeof window === "undefined") return null; try { const raw = localStorage.getItem(`${PROFILE_CACHE_PREFIX}${userId}`); return raw ? JSON.parse(raw) as UserProfile : null; } catch { return null; } }
function cacheProfile(profile: UserProfile): void { try { localStorage.setItem(`${PROFILE_CACHE_PREFIX}${profile.id}`, JSON.stringify(profile)); } catch {} }
async function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> { let timer: ReturnType<typeof setTimeout> | undefined; try { return await Promise.race([promise, new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error("Timed out")), ms); })]); } finally { if (timer) clearTimeout(timer); } }

export function UserProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), []);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const cached = readCachedProfile(userId); if (cached) setProfile(cached);
    if (!navigator.onLine) return;
    try { const result = await withTimeout(supabase.from("profiles").select(`id, full_name, first_name, email, avatar_url, level, xp, xp_to_next_level, streak, weekly_xp, focus_minutes_today, avg_score, streak_message, created_at, updated_at, study_level, subjects, daily_goal_minutes, study_style`).eq("id", userId).single(), PROFILE_FETCH_TIMEOUT_MS); if (!result.error && result.data) { const next = result.data as UserProfile; cacheProfile(next); setProfile(next); } } catch { /* device state remains authoritative */ }
  }, [supabase]);

  const refreshProfile = useCallback(async () => { if (user) await fetchProfile(user.id); }, [user, fetchProfile]);

  useEffect(() => {
    let mounted = true;
    // DEVICE-FIRST: restore identity/profile cache before touching Supabase.
    const remembered = getRememberedUserId();
    if (remembered) { const cached = readCachedProfile(remembered); if (cached) setProfile(cached); }
    setLoading(false);

    if (!navigator.onLine) return () => { mounted = false; };
    const initAuth = async () => {
      try {
        const { data: { session } } = await withTimeout(supabase.auth.getSession(), AUTH_BOOT_TIMEOUT_MS);
        if (!mounted) return;
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) { rememberActiveUser(currentUser.id); const cached = readCachedProfile(currentUser.id); if (cached) setProfile(cached); void fetchProfile(currentUser.id); }
      } catch { /* local session/profile stays usable */ }
    };
    void initAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_OUT" || !session) { clearRememberedUser(); offlineSync.stopAutoSync(); setUser(null); setProfile(null); return; }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") { rememberActiveUser(session.user.id); setUser(session.user); void fetchProfile(session.user.id); }
    });
    return () => { mounted = false; offlineSync.stopAutoSync(); subscription.unsubscribe(); };
  }, [supabase, fetchProfile]);

  useEffect(() => { if (!user) return; const timer = window.setTimeout(() => { void offlineSync.startAutoSync(); void offlineSync.syncAll(); }, 1500); return () => { window.clearTimeout(timer); offlineSync.stopAutoSync(); }; }, [user]);
  useEffect(() => { if (!user) return; const handleOnline = () => void fetchProfile(user.id); window.addEventListener("online", handleOnline); return () => window.removeEventListener("online", handleOnline); }, [user, fetchProfile]);
  void offlineStorage;
  return <UserContext.Provider value={{ user, profile, loading, refreshProfile }}>{children}</UserContext.Provider>;
}
export function useUser(): UserContextValue { return useContext(UserContext); }
