"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { trackEvent } from "@/lib/traction/client";
import { BrandLockup } from "@/components/brand/BrandLockup";
import { friendlyAuthError } from "@/lib/auth/friendlyAuthError";

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
    if (loading) return;
    setError("");
    if (!name.trim()) { setError("Your name is required"); return; }
    if (!email.trim()) { setError("Email is required"); return; }
    if (!password) { setError("Password is required"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }

    setLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: name.trim(), username: name.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (signUpError) {
        setError(friendlyAuthError(signUpError.message));
        return;
      }

      if (!data.user) {
        setError("We couldn't create your account. Please try again.");
        return;
      }

      void trackEvent("user_signed_up", { authMethod: "password" });

      try {
        const referral = sessionStorage.getItem("shadecode_referral");
        if (referral) {
          void trackEvent("referral_signup_completed", { referral: referral.slice(0, 80) });
          sessionStorage.removeItem("shadecode_referral");
        }
      } catch {
        // Referral attribution is optional and must never block signup.
      }

      document.cookie = "onboarding_started=1; path=/; max-age=3600; samesite=lax";
      router.push(data.session ? "/onboarding" : `/auth/verify?email=${encodeURIComponent(email.trim())}`);
    } catch {
      setError("We couldn't reach the sign-up service. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
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
    <main className="ssc-auth-shell">
      <section className="ssc-auth-panel">
        <div className="ssc-auth-heading">
          <div className="ssc-auth-brand"><BrandLockup /></div>
          <h1 style={{ fontSize: "clamp(28px, 6vw, 36px)", lineHeight: 1.1, fontWeight: 800, marginTop: 8 }}>Create your account</h1>
          <p style={{ color: "var(--muted-foreground)", marginTop: 8, fontSize: 15, lineHeight: 1.5 }}>We&apos;ll use this to build your learning experience.</p>
        </div>

        <form onSubmit={(event) => { event.preventDefault(); void handleSignUp(); }} aria-busy={loading} style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <label htmlFor="signup-name" style={{ fontSize: 13, fontWeight: 600 }}>Your name</label>
          <input id="signup-name" name="name" aria-invalid={Boolean(error && !name.trim())} aria-describedby={error && !name.trim() ? "signup-error" : undefined} placeholder="What should we call you?" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          <label htmlFor="signup-email" style={{ fontSize: 13, fontWeight: 600, marginTop: 5 }}>Email</label>
          <input id="signup-email" name="email" aria-invalid={Boolean(error && !email.trim())} aria-describedby={error && !email.trim() ? "signup-error" : undefined} placeholder="you@example.com" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
          <label htmlFor="signup-password" style={{ fontSize: 13, fontWeight: 600, marginTop: 5 }}>Password</label>
          <div style={{ position: "relative" }}>
            <input id="signup-password" name="password" aria-label="Password" aria-invalid={Boolean(error && !password)} aria-describedby={error && !password ? "signup-error" : undefined} placeholder="Create a password" type={showPassword ? "text" : "password"} autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} style={{ ...inputStyle, paddingRight: 48 }} />
            <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", minWidth: 40, minHeight: 40, display: "grid", placeItems: "center", padding: 6, cursor: "pointer", color: "var(--muted-foreground)" }}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </div>
          <label htmlFor="signup-confirm-password" style={{ fontSize: 13, fontWeight: 600, marginTop: 5 }}>Confirm password</label>
          <div style={{ position: "relative" }}>
            <input id="signup-confirm-password" name="confirmPassword" aria-label="Confirm password" aria-invalid={Boolean(error && (error === "Passwords do not match" || !confirmPassword))} aria-describedby={error && (error === "Passwords do not match" || !confirmPassword) ? "signup-error" : undefined} placeholder="Enter it again" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={{ ...inputStyle, paddingRight: 48 }} />
            <button type="button" onClick={() => setShowConfirmPassword((v) => !v)} aria-label={showConfirmPassword ? "Hide password" : "Show password"} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", minWidth: 40, minHeight: 40, display: "grid", placeItems: "center", padding: 6, cursor: "pointer", color: "var(--muted-foreground)" }}>{showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </div>
          {error && <p id="signup-error" role="alert" aria-live="assertive" style={{ color: "var(--danger)", fontSize: 13, lineHeight: 1.4, overflowWrap: "anywhere" }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ background: "var(--primary)", color: "white", padding: "14px 16px", borderRadius: 11, fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer", marginTop: 7, opacity: loading ? 0.7 : 1 }}>{loading ? "Creating account…" : "Create account"}</button>
        </form>

        <p style={{ color: "var(--muted-foreground)", textAlign: "center", fontSize: 14, marginTop: 22 }}>Already have an account? <Link href="/auth/login" style={{ color: "var(--primary)", fontWeight: 700, textDecoration: "none" }}>Sign in</Link></p>
      </section>
    </main>
  );
}
