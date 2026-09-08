"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const normalized = email.trim();
    setError("");
    setMessage("");
    if (!normalized) {
      setError("Enter your email address.");
      return;
    }
    setLoading(true);
    const { error: resetError } = await createClient().auth.resetPasswordForEmail(normalized, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (resetError) setError(resetError.message);
    else setMessage("If an account exists for that email, we sent a password reset link. Check your inbox.");
    setLoading(false);
  };

  const inputStyle = {
    width: "100%",
    background: "var(--muted)",
    border: "1px solid var(--card-border)",
    borderRadius: 10,
    padding: "13px 14px",
    color: "var(--foreground)",
    fontSize: 15,
    outline: "none",
    caretColor: "var(--primary)",
  };

  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: "32px 20px" }}>
      <section style={{ width: "100%", maxWidth: 420 }}>
        <p style={{ color: "var(--primary)", fontSize: 12, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase" }}>Shadecode Student</p>
        <h1 style={{ fontSize: "clamp(28px, 6vw, 36px)", lineHeight: 1.1, fontWeight: 800, marginTop: 9 }}>Reset your password</h1>
        <p style={{ color: "var(--muted-foreground)", marginTop: 10, fontSize: 15, lineHeight: 1.5 }}>Enter the email on your account and we&apos;ll send you a secure reset link.</p>

        <form onSubmit={submit} style={{ display: "grid", gap: 11, marginTop: 24 }}>
          <label htmlFor="reset-email" style={{ fontSize: 13, fontWeight: 600 }}>Email</label>
          <input id="reset-email" aria-label="Email" placeholder="you@example.com" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
          {error && <p role="alert" style={{ color: "var(--danger)", fontSize: 13, lineHeight: 1.4 }}>{error}</p>}
          {message && <p role="status" style={{ color: "var(--muted-foreground)", fontSize: 13, lineHeight: 1.4 }}>{message}</p>}
          <button type="submit" disabled={loading} style={{ marginTop: 7, padding: "14px 16px", borderRadius: 11, border: "none", background: "var(--primary)", color: "white", fontWeight: 700, fontSize: 15, cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1 }}>{loading ? "Sending…" : "Send reset link"}</button>
        </form>

        <p style={{ color: "var(--muted-foreground)", textAlign: "center", fontSize: 14, marginTop: 22 }}><Link href="/auth/login" style={{ color: "var(--primary)", fontWeight: 700, textDecoration: "none" }}>Back to sign in</Link></p>
      </section>
    </main>
  );
}
