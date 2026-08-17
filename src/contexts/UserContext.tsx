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

const PROFILE_CACHE_PREFIX = "shadecode:profile:";
const PROFILE_FETCH_TIMEOUT_MS = 4_000;

const UserContext = createContext<UserContextValue>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

function readCachedProfile(userId: string): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${PROFILE_CACHE_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) as UserProfile : null;
  } catch {
    return null;
  }
}

function cacheProfile(profile: UserProfile): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${PROFILE_CACHE_PREFIX}${profile.id}`, JSON.stringify(profile));
  } catch {
    // Local storage can be unavailable or full. The network remains authoritative.
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Profile request timed out")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

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
      const cached = readCachedProfile(userId);
      if (cached) setProfile(cached);

      if (typeof navigator !== "undefined" && !navigator.onLine) return;

      try {
        const result = await withTimeout(
          supabase
            .from("profiles")
            .select(`
              id, full_name, first_name, email, avatar_url,
              level, xp, xp_to_next_level, streak, weekly_xp,
              focus_minutes_today, avg_score, streak_message,
              created_at, updated_at
            `)
            .eq("id", userId)
            .single(),
          PROFILE_FETCH_TIMEOUT_MS
        );

        if (result.error || !result.data) {
          console.error("[UserContext] Failed to fetch profile:", result.error?.message);
          return;
        }

        const nextProfile = result.data as UserProfile;
        cacheProfile(nextProfile);
        setProfile(nextProfile);
      } catch (error) {
        console.warn("[UserContext] Using cached profile:", error);
      }
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
      // getSession reads the Supabase session from local storage and does not
      // require a network round trip just to decide whether the app can render.
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        const cached = readCachedProfile(currentUser.id);
        if (cached) setProfile(cached);
        // Do not make navigation wait for profile hydration.
        setLoading(false);
        void fetchProfile(currentUser.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    };

    void initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
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
        setLoading(false);
        void fetchProfile(session.user.id);
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

  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    const handleOnline = () => void fetchProfile(user.id);
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [user, fetchProfile]);

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
