"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { setOnboardingComplete } from "@/lib/onboarding";
import { Eye, EyeOff } from "lucide-react";

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

    // Client-side validation
    if (!email.trim()) {
      setError("Email is required");
      setLoading(false);
      return;
    }
    if (!password) {
      setError("Password is required");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Check if user has completed onboarding before redirecting
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("onboarding_completed")
      .eq("user_id", user?.id)
      .maybeSingle();

    const onboardingComplete = profile?.onboarding_completed === true;

    // Redirect to appropriate destination based on onboarding status
    if (onboardingComplete) {
      setOnboardingComplete();
      router.push("/dashboard");
    } else {
      router.push("/onboarding");
    }

    setLoading(false);
  };

  const inputStyle = {
    width: "100%",
    background: "var(--muted)",
    border: "1px solid var(--card-border)",
    borderRadius: "10px",
    padding: "14px 16px",
    color: "#0f172a",
    fontSize: "15px",
    outline: "none",
    caretColor: "var(--primary)",
  };

  return (
    <>
      <style>{`
        input::placeholder {
          color: var(--muted-foreground);
          opacity: 0.7;
        }
      `}</style>
      <div style={{ padding: "60px 24px 24px", display: "flex", flexDirection: "column", gap: "32px" }}>
      <div>
        <p style={{ color: "var(--primary)", fontSize: "13px", fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase" }}>
          Shadecode Student
        </p>
        <h1 style={{ fontSize: "32px", fontWeight: 800, marginTop: "8px" }}>
          Welcome back
        </h1>
        <p style={{ color: "var(--muted-foreground)", marginTop: "8px", fontSize: "15px" }}>
          Continue your study journey.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />
        <div style={{ position: "relative" }}>
          <input
            placeholder="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ ...inputStyle, paddingRight: "48px" }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            style={{
              position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", padding: "4px", cursor: "pointer",
              color: "var(--muted-foreground)", display: "flex", alignItems: "center",
            }}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {error && (
          <p style={{ color: "#ef4444", fontSize: "13px" }}>{error}</p>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            background: "var(--primary)",
            color: "white",
            padding: "16px",
            borderRadius: "12px",
            fontWeight: 700,
            fontSize: "16px",
            border: "none",
            cursor: "pointer",
            marginTop: "8px",
            boxShadow: "0 0 24px var(--primary-glow)",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </div>

      <p style={{ color: "var(--muted-foreground)", textAlign: "center", fontSize: "14px" }}>
        Don&apos;t have an account?{" "}
        <Link href="/auth/signup" style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>
          Get Started
        </Link>
      </p>
    </div>
    </>
  );
}
