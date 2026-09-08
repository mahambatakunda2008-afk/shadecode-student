"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { trackEvent } from "@/lib/traction/client";

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleSignUp = async () => {
    setLoading(true);
    setError("");
    if (!name.trim()) { setError("Your name is required"); setLoading(false); return; }
    if (!email.trim()) { setError("Email is required"); setLoading(false); return; }
    if (!password) { setError("Password is required"); setLoading(false); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); setLoading(false); return; }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: name.trim() } },
    });
    if (signUpError) { setError(signUpError.message); setLoading(false); return; }

    if (data.user) {
      void trackEvent("user_signed_up", { authMethod: "password" });
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        username: name.trim(),
        level: 1,
        xp: 0,
        streak: 0,
      }, { onConflict: "id" });
      if (profileError) { setError(profileError.message); setLoading(false); return; }

      try {
        const referral = sessionStorage.getItem("shadecode_referral");
        if (referral) {
          void trackEvent("referral_signup_completed", { referral: referral.slice(0, 80) });
          sessionStorage.removeItem("shadecode_referral");
        }
      } catch {
        // Referral attribution is optional and must never block signup.
      }

      document.cookie = "onboarding_started=1; path=/; max-age=3600";
      router.push(data.session ? "/onboarding" : `/auth/verify?email=${encodeURIComponent(email.trim())}`);
    }
    setLoading(false);
  };

  const inputStyle = {
    width: "100%",
    background: "var(--muted)",
    border: "1px solid var(--card-border)",
    borderRadius: "10px",
    padding: "13px 14px",
    color: "var(--foreground)",
    fontSize: "15px",
    outline: "none",
    caretColor: "var(--primary)",
  };

  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: "32px 20px" }}>
      <section style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ color: "var(--primary)", fontSize: 12, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase" }}>Shadecode Student</p>
          <h1 style={{ fontSize: "clamp(28px, 6vw, 36px)", lineHeight: 1.1, fontWeight: 800, marginTop: 8 }}>Create your account</h1>
          <p style={{ color: "var(--muted-foreground)", marginTop: 8, fontSize: 15, lineHeight: 1.5 }}>We&apos;ll use this to build your learning experience.</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Your name</label>
          <input aria-label="Your name" placeholder="What should we call you?" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          <label style={{ fontSize: 13, fontWeight: 600, marginTop: 5 }}>Email</label>
          <input aria-label="Email" placeholder="you@example.com" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
          <label style={{ fontSize: 13, fontWeight: 600, marginTop: 5 }}>Password</label>
          <div style={{ position: "relative" }}>
            <input aria-label="Password" placeholder="Create a password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ ...inputStyle, paddingRight: 48 }} />
            <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", padding: 6, cursor: "pointer", color: "var(--muted-foreground)" }}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </div>
          <label style={{ fontSize: 13, fontWeight: 600, marginTop: 5 }}>Confirm password</label>
          <div style={{ position: "relative" }}>
            <input aria-label="Confirm password" placeholder="Enter it again" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={{ ...inputStyle, paddingRight: 48 }} />
            <button type="button" onClick={() => setShowConfirmPassword((v) => !v)} aria-label={showConfirmPassword ? "Hide password" : "Show password"} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", padding: 6, cursor: "pointer", color: "var(--muted-foreground)" }}>{showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </div>
          {error && <p role="alert" style={{ color: "#ef4444", fontSize: 13, lineHeight: 1.4 }}>{error}</p>}
          <button type="button" onClick={handleSignUp} disabled={loading} style={{ background: "var(--primary)", color: "white", padding: "14px 16px", borderRadius: 11, fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer", marginTop: 7, opacity: loading ? 0.7 : 1 }}>{loading ? "Creating account…" : "Create account"}</button>
        </div>

        <p style={{ color: "var(--muted-foreground)", textAlign: "center", fontSize: 14, marginTop: 22 }}>Already have an account? <Link href="/auth/login" style={{ color: "var(--primary)", fontWeight: 700, textDecoration: "none" }}>Sign in</Link></p>
      </section>
    </main>
  );
}
