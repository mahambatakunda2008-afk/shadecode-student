"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { setOnboardingComplete } from "@/lib/onboarding";
import { Eye, EyeOff } from "lucide-react";
import { trackEvent } from "@/lib/traction/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    if (!email.trim()) { setError("Email is required"); setLoading(false); return; }
    if (!password) { setError("Password is required"); setLoading(false); return; }
    const { error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (loginError) { setError(loginError.message); setLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) void trackEvent("user_logged_in", { authMethod: "password" });
    const { data: profile } = await supabase.from("user_profiles").select("onboarding_completed").eq("user_id", user?.id).maybeSingle();
    if (profile?.onboarding_completed === true) { setOnboardingComplete(); router.push("/dashboard"); }
    else router.push("/onboarding");
    setLoading(false);
  };

  const inputStyle = { width: "100%", background: "var(--muted)", border: "1px solid var(--card-border)", borderRadius: 10, padding: "13px 14px", color: "var(--foreground)", fontSize: 15, outline: "none", caretColor: "var(--primary)" };

  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: "32px 20px" }}>
      <section style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ color: "var(--primary)", fontSize: 12, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase" }}>Shadecode Student</p>
          <h1 style={{ fontSize: "clamp(28px, 6vw, 36px)", lineHeight: 1.1, fontWeight: 800, marginTop: 8 }}>Welcome back</h1>
          <p style={{ color: "var(--muted-foreground)", marginTop: 8, fontSize: 15, lineHeight: 1.5 }}>Pick up where you left off.</p>
        </div>
        <form onSubmit={(event) => { event.preventDefault(); void handleLogin(); }} style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <label htmlFor="login-email" style={{ fontSize: 13, fontWeight: 600 }}>Email</label>
          <input id="login-email" aria-label="Email" placeholder="you@example.com" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 5 }}>
            <label htmlFor="login-password" style={{ fontSize: 13, fontWeight: 600 }}>Password</label>
            <Link href="/auth/forgot-password" style={{ color: "var(--primary)", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>Forgot password?</Link>
          </div>
          <div style={{ position: "relative" }}>
            <input id="login-password" aria-label="Password" placeholder="Your password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ ...inputStyle, paddingRight: 48 }} />
            <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", padding: 6, cursor: "pointer", color: "var(--muted-foreground)" }}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </div>
          {error && <p role="alert" style={{ color: "var(--danger)", fontSize: 13, lineHeight: 1.4 }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ background: "var(--primary)", color: "white", padding: "14px 16px", borderRadius: 11, fontWeight: 700, fontSize: 15, border: "none", cursor: loading ? "wait" : "pointer", marginTop: 7, opacity: loading ? 0.7 : 1 }}>{loading ? "Signing in…" : "Sign in"}</button>
        </form>
        <p style={{ color: "var(--muted-foreground)", textAlign: "center", fontSize: 14, marginTop: 22 }}>New to Shadecode? <Link href="/auth/signup" style={{ color: "var(--primary)", fontWeight: 700, textDecoration: "none" }}>Create an account</Link></p>
      </section>
    </main>
  );
}
