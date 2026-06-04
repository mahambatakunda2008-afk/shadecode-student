"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function Settings() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [userId, setUserId] = useState("");

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
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
    if (!error) showToast("Username updated ✓");
    else showToast("Failed to update username");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const cardStyle = {
    background: "var(--card)",
    border: "1px solid var(--card-border)",
    borderRadius: "12px",
    padding: "16px",
  };

  const inputStyle = {
    width: "100%",
    background: "var(--muted)",
    border: "1px solid var(--card-border)",
    borderRadius: "8px",
    padding: "10px 14px",
    color: "var(--foreground)",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box" as const,
  };

  const primaryBtn = {
    background: "var(--primary)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "10px 16px",
    fontWeight: 700,
    fontSize: "14px",
    cursor: "pointer",
    boxShadow: "0 0 12px var(--primary-glow)",
  };

  if (loading) return (
    <div style={{ padding: "32px 24px", textAlign: "center", color: "var(--muted-foreground)" }}>
      Loading...
    </div>
  );

  return (
    <div style={{ padding: "32px 24px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>

      {toast && (
        <div style={{
          position: "fixed", top: "24px", left: "50%", transform: "translateX(-50%)",
          background: "var(--primary)", color: "white", padding: "10px 20px",
          borderRadius: "99px", fontWeight: 700, fontSize: "14px", zIndex: 100,
          boxShadow: "0 0 20px var(--primary-glow)",
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 style={{ fontSize: "28px", fontWeight: 800 }}>Settings</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: "14px", marginTop: "4px" }}>
          Manage your account
        </p>
      </div>

      {/* Profile */}
      <div style={cardStyle}>
        <p style={{ fontWeight: 700, marginBottom: "12px" }}>Profile</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div>
            <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "4px" }}>Username</p>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your username"
              style={inputStyle}
            />
          </div>
          <div>
            <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "4px" }}>Email</p>
            <input
              value={email}
              disabled
              style={{ ...inputStyle, opacity: 0.5, cursor: "not-allowed" }}
            />
          </div>
          <button onClick={saveUsername} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* About */}
      <div style={cardStyle}>
        <p style={{ fontWeight: 700, marginBottom: "12px" }}>About</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[
            { label: "App", value: "Shadecode Student" },
            { label: "Version", value: "1.0.0" },
            { label: "Built by", value: "Takunda Mahamba" },
            { label: "Studio", value: "Shadecode" },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--card-border)" }}>
              <p style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>{label}</p>
              <p style={{ fontSize: "14px", fontWeight: 500 }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Feedback link */}
      <div
        onClick={() => router.push("/feedback")}
        style={{
          ...cardStyle,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "20px" }}>💬</span>
          <div>
            <p style={{ fontWeight: 600, fontSize: "14px" }}>Send Feedback</p>
            <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "2px" }}>Report bugs or suggest features</p>
          </div>
        </div>
        <span style={{ color: "var(--muted-foreground)" }}>→</span>
      </div>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        style={{
          background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: "12px",
          padding: "14px",
          color: "#ef4444",
          fontWeight: 700,
          fontSize: "14px",
          cursor: "pointer",
          width: "100%",
        }}
      >
        Sign Out
      </button>
    </div>
  );
}
