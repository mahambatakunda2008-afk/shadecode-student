"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleSignUp = async () => {
    setLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase.from("profiles").insert({
        id: data.user.id,
        username,
        level: 1,
        xp: 0,
        streak: 0,
      });
      router.push("/dashboard");
    }

    setLoading(false);
  };

  const inputStyle = {
    width: "100%",
    background: "var(--muted)",
    border: "1px solid var(--card-border)",
    borderRadius: "10px",
    padding: "14px 16px",
    color: "var(--foreground)",
    fontSize: "15px",
    outline: "none",
  };

  return (
    <div style={{ padding: "60px 24px 24px", display: "flex", flexDirection: "column", gap: "32px" }}>
      <div>
        <p style={{ color: "var(--primary)", fontSize: "13px", fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase" }}>
          Shadecode Student
        </p>
        <h1 style={{ fontSize: "32px", fontWeight: 800, marginTop: "8px" }}>
          Create account
        </h1>
        <p style={{ color: "var(--muted-foreground)", marginTop: "8px", fontSize: "15px" }}>
          Start your study journey today.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={inputStyle}
        />
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />

        {error && (
          <p style={{ color: "#ef4444", fontSize: "13px" }}>{error}</p>
        )}

        <button
          onClick={handleSignUp}
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
          {loading ? "Creating account..." : "Get Started"}
        </button>
      </div>

      <p style={{ color: "var(--muted-foreground)", textAlign: "center", fontSize: "14px" }}>
        Already have an account?{" "}
        <Link href="/auth/login" style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>
          Sign in
        </Link>
      </p>
    </div>
  );
}