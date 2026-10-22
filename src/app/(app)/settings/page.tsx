"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Heart,
  LogOut,
  MessageSquare,
  Monitor,
  Moon,
  Save,
  Settings as SettingsIcon,
  Shield,
  Sun,
  UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/contexts/ThemeContext";
import { useUser } from "@/contexts/UserContext";
import { ResetOnboarding } from "@/components/settings/ResetOnboarding";
import { ShadeNetSettingsCard } from "@/components/settings/ShadeNetSettingsCard";
import { WhatsAppSettingsCard } from "@/components/settings/WhatsAppSettingsCard";
import { getAcademicExperience, normalizeStudyLevel } from "@/lib/academic/experience";
import { ShadecodeFeatureIcon } from "@/components/brand/ShadecodeFeatureIcon";

export default function Settings() {
  const [username, setUsername] = useState("");
  const [savedUsername, setSavedUsername] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [toast, setToast] = useState("");
  const [userId, setUserId] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const { theme, setTheme } = useTheme();
  const { profile } = useUser();
  const experience = getAcademicExperience(normalizeStudyLevel(profile?.study_level));
  const isFoundation = experience.family === "foundation";
  const isBeyond = experience.family === "beyond-school";
  const usernameChanged = username.trim() !== savedUsername;

  useEffect(() => {
    let cancelled = false;

    async function initialise() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) {
          router.replace("/auth/login");
          return;
        }

        const { data: profileRow, error: profileError } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (cancelled) return;

        const currentUsername = profileRow?.username ?? "";
        setUserId(user.id);
        setEmail(user.email ?? "");
        setUsername(currentUsername);
        setSavedUsername(currentUsername);
      } catch (error) {
        console.error("[Settings] initialisation failed:", error);
        if (!cancelled) {
          setLoadError("Your settings could not be loaded. Check your connection and try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void initialise();
    return () => {
      cancelled = true;
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [router, supabase]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2800);
  }, []);

  const saveUsername = async () => {
    const nextUsername = username.trim();
    if (!nextUsername) {
      setUsernameError("Username cannot be empty.");
      return;
    }
    if (!userId || saving || !usernameChanged) return;

    setSaving(true);
    setUsernameError(null);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ username: nextUsername })
        .eq("id", userId);

      if (error) throw error;
      setUsername(nextUsername);
      setSavedUsername(nextUsername);
      showToast("Profile saved");
    } catch (error) {
      console.error("[Settings] profile update failed:", error);
      setUsernameError("Your username could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setAccountError(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace("/");
    } catch (error) {
      console.error("[Settings] sign out failed:", error);
      setAccountError("You could not be signed out. Check your connection and try again.");
      setSigningOut(false);
    }
  };

  if (loading) {
    return (
      <main className="ssc-page" aria-busy="true" aria-label="Loading settings">
        <div className="ssc-skeleton mb-3 h-8 w-48" />
        <div className="ssc-skeleton mb-4 h-40 w-full rounded-2xl" />
        <div className="ssc-skeleton h-32 w-full rounded-2xl" />
        <p className="mt-4 text-sm text-[var(--muted-foreground)]">Loading your settings…</p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="ssc-page">
        <section className="ssc-card max-w-2xl p-6" role="alert">
          <h1 className="text-xl font-bold">Settings unavailable</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{loadError}</p>
          <button type="button" onClick={() => window.location.reload()} className="ssc-button mt-4">
            Try again
          </button>
        </section>
      </main>
    );
  }

  const pageTitle = isFoundation ? "Your space" : isBeyond ? "Your workspace" : "Your study space";
  const pageSubtitle = isFoundation
    ? "Manage your profile, appearance, and how your learning space behaves."
    : isBeyond
      ? "Manage your profile, appearance, workspace tools, and account preferences."
      : "Manage your profile, appearance, study tools, and account preferences.";
  const profileCopy = isFoundation ? "Your learning space" : isBeyond ? "Your workspace identity" : "Your student profile";

  return (
    <main className="ssc-page" data-experience={experience.family} data-study-level={experience.stage}>
      {toast && (
        <div role="status" aria-live="polite" aria-atomic="true" className="fixed left-1/2 top-6 z-[10000] flex -translate-x-1/2 items-center gap-2 rounded-full border border-[var(--card-border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] shadow-[var(--shadow-lg)]">
          <Check size={16} aria-hidden="true" className="text-[var(--accent)]" />
          {toast}
        </div>
      )}

      <header className="ssc-page-header">
        <div>
          <p className="ssc-kicker">{experience.label}</p>
          <h1>{pageTitle}</h1>
          <p className="ssc-subtitle">{pageSubtitle}</p>
        </div>
       </header>

      {accountError && (
        <p role="alert" className="mb-4 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/5 px-4 py-3 text-sm text-[var(--danger)]">
          {accountError}
        </p>
      )}

      <section aria-label="Profile and appearance" className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="ssc-card min-w-0 p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <ShadecodeFeatureIcon icon={UserRound} size="sm" />
            <div>
              <h2 className="text-xl font-semibold">{profileCopy}</h2>
              <p className="text-sm text-[var(--muted-foreground)]">Your account details and identity.</p>
            </div>
          </div>
          <div className="grid gap-4">
            <label className="grid gap-2">
              <span className="ssc-label">Username</span>
              <input
                autoComplete="username"
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                  setUsernameError(null);
                }}
                placeholder="Choose a username"
                maxLength={40}
                aria-invalid={Boolean(usernameError)}
                aria-describedby={usernameError ? "username-help username-error" : "username-help"}
                className="ssc-input"
              />
              <span id="username-help" className="text-xs text-[var(--muted-foreground)]">This name identifies your learning space.</span>
              {usernameError && <span id="username-error" role="alert" className="text-sm text-[var(--danger)]">{usernameError}</span>}
              <button type="button" onClick={() => void saveUsername()} disabled={saving || !usernameChanged} className="ssc-button mt-1 w-fit">
                <Save size={18} aria-hidden="true" />
                {saving ? "Saving…" : "Save username"}
              </button>
            </label>
            <label className="grid gap-2">
              <span className="ssc-label">Email address</span>
              <input type="email" autoComplete="email" value={email} readOnly aria-describedby="email-help" className="ssc-input cursor-not-allowed opacity-75" />
              <span id="email-help" className="text-xs text-[var(--muted-foreground)]">Your sign-in email is managed by your account.</span>
            </label>
          </div>
        </div>

        <div className="ssc-card min-w-0 p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <ShadecodeFeatureIcon icon={SettingsIcon} size="sm" />
            <div>
              <h2 className="text-xl font-semibold">Appearance</h2>
              <p className="text-sm text-[var(--muted-foreground)]">Choose the workspace theme that feels right.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ThemeChoice label="Light" description="A bright, clear canvas" icon={<Sun size={20} aria-hidden="true" />} active={theme === "light"} onClick={() => setTheme("light")} />
            <ThemeChoice label="Dark" description="A quieter low-light view" icon={<Moon size={20} aria-hidden="true" />} active={theme === "dark"} onClick={() => setTheme("dark")} />
          </div>
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] p-4">
            <Monitor size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--muted-foreground)]" />
            <p className="text-sm text-[var(--muted-foreground)]">
              Current mode: <span className="font-semibold text-[var(--foreground)]">{theme === "dark" ? "Dark" : "Light"}</span>.
              {" "}Your choice applies across this {isBeyond ? "workspace" : isFoundation ? "learning space" : "study space"}.
            </p>
          </div>
        </div>
      </section>

      <section aria-label="Connected tools" className="mt-4 grid gap-4">
        <WhatsAppSettingsCard />
        <ShadeNetSettingsCard />
      </section>

      <section aria-label="More settings" className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <ActionCard icon={<MessageSquare size={22} aria-hidden="true" />} title="Send feedback" description="Report a bug or suggest an improvement." onClick={() => router.push("/feedback")} />
        <ActionCard icon={<Heart size={22} aria-hidden="true" />} title="Support Shadecode" description="Contribute voluntarily to help keep learning accessible." onClick={() => router.push("/support")} />
        <InfoCard
          icon={<Shield size={22} aria-hidden="true" />}
          title={isBeyond ? "Workspace details" : isFoundation ? "Learning space details" : "Study space details"}
          rows={[["Product", "Shadecode Student"], ["Experience", experience.label], ["Studio", "Shadecode"]]}
        />
        <div className="ssc-card p-5"><ResetOnboarding /></div>
      </section>

      <footer className="mt-6 flex flex-col gap-3 border-t border-[var(--card-border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--muted-foreground)]">Your learning data and saved work stay connected to your account.</p>
        <button type="button" onClick={() => void handleSignOut()} disabled={signingOut} className="ssc-button ssc-button-danger self-start">
          <LogOut size={18} aria-hidden="true" />
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </footer>
    </main>
  );
}

function ThemeChoice({
  label,
  description,
  icon,
  active,
  onClick,
}: {
  label: string;
  description: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="ssc-card-interactive flex min-h-[112px] flex-col items-start justify-between gap-4 p-4 text-left"
      style={{ borderColor: active ? "color-mix(in srgb, var(--primary) 54%, var(--card-border))" : "var(--card-border)" }}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--primary)]">{icon}</span>
      <span>
        <span className="flex items-center gap-2 font-semibold">
          {label}
          {active && <Check size={16} aria-hidden="true" className="text-[var(--accent)]" />}
        </span>
        <span className="mt-1 block text-xs text-[var(--muted-foreground)]">{description}</span>
      </span>
    </button>
  );
}

function ActionCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="ssc-card-interactive flex min-h-24 items-center justify-between gap-4 p-5 text-left">
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-glow)] text-[var(--primary)]">{icon}</span>
        <span className="min-w-0">
          <span className="block font-semibold">{title}</span>
          <span className="mt-1 block text-sm leading-5 text-[var(--muted-foreground)]">{description}</span>
        </span>
      </span>
      <ArrowRight size={18} aria-hidden="true" className="shrink-0 text-[var(--muted-foreground)]" />
    </button>
  );
}

function InfoCard({
  icon,
  title,
  rows,
}: {
  icon: React.ReactNode;
  title: string;
  rows: Array<[string, string]>;
}) {
  return (
    <section className="ssc-card p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--primary)]">{icon}</span>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <dl className="grid gap-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--surface-2)] px-3 py-2">
            <dt className="text-sm text-[var(--muted-foreground)]">{label}</dt>
            <dd className="flex items-center gap-1 text-right text-sm font-semibold">{value}<ChevronRight size={14} aria-hidden="true" className="text-[var(--muted-foreground)]" /></dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
