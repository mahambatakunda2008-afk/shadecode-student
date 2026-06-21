"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  ChevronRight,
  LogOut,
  MessageSquare,
  Monitor,
  Moon,
  Save,
  Shield,
  Sparkles,
  Sun,
  UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTheme, type ThemeMode } from "@/contexts/ThemeContext";
import { ResetOnboarding } from "@/components/settings/ResetOnboarding";

export default function Settings() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [userId, setUserId] = useState("");
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      setUserId(user.id);
      setEmail(user.email || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      setUsername(profile?.username || "");
      setLoading(false);
    };

    init();
  }, [router, supabase]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const saveUsername = async () => {
    if (!username.trim()) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({ username: username.trim() })
      .eq("id", userId);

    setSaving(false);
    showToast(error ? "Failed to update username" : "Profile saved");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="ssc-page">
        <div className="ssc-skeleton h-8 w-48" />
        <div className="ssc-skeleton h-40 w-full" />
        <div className="ssc-skeleton h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="ssc-page">
      {toast && (
        <div className="fixed left-1/2 top-6 z-[10000] flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] shadow-[var(--shadow-lg)]">
          <Check size={16} className="text-[var(--accent)]" />
          {toast}
        </div>
      )}

      <section className="ssc-page-header">
        <div>
          <p className="ssc-kicker">Control center</p>
          <h1>Settings</h1>
          <p className="ssc-subtitle">
            Tune your account, appearance, onboarding, and feedback preferences.
          </p>
        </div>
        <button onClick={saveUsername} disabled={saving} className="ssc-button">
          <Save size={18} />
          {saving ? "Saving" : "Save profile"}
        </button>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="ssc-card p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-glow)] text-[var(--primary)]">
              <UserRound size={22} />
            </div>
            <div>
              <h2 className="text-xl">Profile</h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                This is how Shadecode identifies your workspace.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <label className="grid gap-2">
              <span className="ssc-label">Username</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your username"
                className="ssc-input"
              />
            </label>

            <label className="grid gap-2">
              <span className="ssc-label">Email</span>
              <input value={email} disabled className="ssc-input" />
            </label>
          </div>
        </div>

        <div className="ssc-card p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Sparkles size={22} />
            </div>
            <div>
              <h2 className="text-xl">Appearance</h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                Theme applies globally across pages, modals, and overlays.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ThemeChoice
              label="Light"
              description="Clean study canvas"
              icon={<Sun size={20} />}
              active={theme === "light"}
              onClick={() => setTheme("light")}
            />
            <ThemeChoice
              label="Dark"
              description="Deep focus mode"
              icon={<Moon size={20} />}
              active={theme === "dark"}
              onClick={() => setTheme("dark")}
            />
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] p-4">
            <Monitor size={18} className="text-[var(--muted-foreground)]" />
            <p className="text-sm text-[var(--muted-foreground)]">
              Current mode:{" "}
              <span className="font-semibold text-[var(--foreground)]">
                {theme === "dark" ? "Dark" : "Light"}
              </span>
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <ActionCard
          icon={<MessageSquare size={21} />}
          title="Send feedback"
          description="Report bugs or suggest improvements."
          onClick={() => router.push("/feedback")}
        />
        <InfoCard
          icon={<Shield size={21} />}
          title="Workspace"
          rows={[
            ["App", "Shadecode Student"],
            ["Version", "1.0.0"],
            ["Studio", "Shadecode"],
          ]}
        />
        <div className="ssc-card p-5">
          <ResetOnboarding />
        </div>
      </section>

      <button onClick={handleSignOut} className="ssc-button ssc-button-danger">
        <LogOut size={18} />
        Sign out
      </button>
    </div>
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
      onClick={onClick}
      className="ssc-card-interactive flex min-h-[112px] flex-col items-start justify-between p-4 text-left"
      style={{
        borderColor: active
          ? "color-mix(in srgb, var(--primary) 54%, var(--card-border))"
          : "var(--card-border)",
      }}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--primary)]">
        {icon}
      </span>
      <span>
        <span className="flex items-center gap-2 font-semibold">
          {label}
          {active && <Check size={15} className="text-[var(--accent)]" />}
        </span>
        <span className="mt-1 block text-xs text-[var(--muted-foreground)]">
          {description}
        </span>
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
    <button
      onClick={onClick}
      className="ssc-card-interactive flex items-center justify-between p-5 text-left"
    >
      <span className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary-glow)] text-[var(--primary)]">
          {icon}
        </span>
        <span>
          <span className="block font-semibold">{title}</span>
          <span className="text-sm text-[var(--muted-foreground)]">
            {description}
          </span>
        </span>
      </span>
      <ArrowRight size={18} className="text-[var(--muted-foreground)]" />
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
    <div className="ssc-card p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--primary)]">
          {icon}
        </span>
        <h2 className="text-lg">{title}</h2>
      </div>
      <div className="grid gap-2">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between rounded-xl bg-[var(--surface-2)] px-3 py-2"
          >
            <span className="text-sm text-[var(--muted-foreground)]">
              {label}
            </span>
            <span className="flex items-center gap-1 text-sm font-semibold">
              {value}
              <ChevronRight size={14} className="text-[var(--muted-foreground)]" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
