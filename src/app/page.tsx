import Link from "next/link";

export default function Home() {
  const features = [
    { icon: "📅", title: "Smart Timetable", desc: "Auto-generated study schedule built around your subjects" },
    { icon: "✅", title: "Task Tracker", desc: "Subject-based tasks with XP rewards and level progression" },
    { icon: "🔥", title: "Streak System", desc: "Stay consistent and build daily study habits" },
    { icon: "🧠", title: "Cortex", desc: "AI that observes your study behavior and reflects patterns back to you" },
    { icon: "📐", title: "Math Checker", desc: "Upload your working — Cortex reads and analyses every step" },
    { icon: "📖", title: "AI Learn", desc: "Topic explanations and practice questions powered by Gemini" },
    { icon: "⚡", title: "Daily Challenges", desc: "A new challenge every day to keep you sharp" },
    { icon: "🏆", title: "Leaderboard", desc: "See how you rank against other students by XP" },
    { icon: "🎯", title: "Exam Countdown", desc: "Track upcoming exams and stay ahead of deadlines" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      padding: "60px 24px 100px",
      display: "flex",
      flexDirection: "column",
      gap: "32px",
    }}>

      {/* Header */}
      <div>
        <p style={{ color: "var(--primary)", fontSize: "13px", fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase" }}>
          Shadecode
        </p>
        <h1 style={{ fontSize: "36px", fontWeight: 800, lineHeight: 1.1, marginTop: "8px" }}>
          Study smarter.<br />
          <span style={{ color: "var(--primary)" }}>Live sharper.</span>
        </h1>
        <p style={{ color: "var(--muted-foreground)", marginTop: "12px", fontSize: "15px", lineHeight: 1.6 }}>
          The intelligent study system that observes how you learn, tracks your progress, and grows with you.
        </p>
      </div>

      {/* Quick Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <Link href="/auth/signup" style={{
          background: "var(--primary)",
          color: "white",
          padding: "16px",
          borderRadius: "12px",
          textDecoration: "none",
          fontWeight: 700,
          fontSize: "16px",
          textAlign: "center",
          boxShadow: "0 0 24px var(--primary-glow)",
        }}>
          Get Started — It's Free
        </Link>
        <Link href="/auth/login" style={{
          background: "var(--card)",
          color: "var(--foreground)",
          padding: "16px",
          borderRadius: "12px",
          textDecoration: "none",
          fontWeight: 600,
          fontSize: "16px",
          textAlign: "center",
          border: "1px solid var(--card-border)",
        }}>
          Sign In
        </Link>
      </div>

      {/* Cortex highlight */}
      <div style={{
        background: "rgba(99,102,241,0.08)",
        border: "1px solid rgba(99,102,241,0.25)",
        borderRadius: "14px",
        padding: "20px",
      }}>
        <p style={{ fontSize: "11px", color: "var(--primary)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>
          Powered by Cortex
        </p>
        <p style={{ fontWeight: 700, fontSize: "16px", marginBottom: "6px" }}>
          AI that watches how you study
        </p>
        <p style={{ color: "var(--muted-foreground)", fontSize: "13px", lineHeight: 1.6 }}>
          Cortex doesn't tell you what to do — it tells you what your studying behavior already says about you.
        </p>
      </div>

      {/* Features */}
      <div>
        <p style={{ fontSize: "12px", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: "12px" }}>
          Everything included
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {features.map((feature) => (
            <div key={feature.title} style={{
              background: "var(--card)",
              border: "1px solid var(--card-border)",
              borderRadius: "12px",
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}>
              <span style={{ fontSize: "22px", flexShrink: 0 }}>{feature.icon}</span>
              <div>
                <p style={{ fontWeight: 600, fontSize: "14px" }}>{feature.title}</p>
                <p style={{ color: "var(--muted-foreground)", fontSize: "12px", marginTop: "2px", lineHeight: 1.5 }}>{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer CTA */}
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "var(--muted-foreground)", fontSize: "13px", marginBottom: "12px" }}>
          Built for students. Powered by AI.
        </p>
        <Link href="/auth/signup" style={{
          background: "var(--primary)",
          color: "white",
          padding: "14px 32px",
          borderRadius: "12px",
          textDecoration: "none",
          fontWeight: 700,
          fontSize: "15px",
          boxShadow: "0 0 20px var(--primary-glow)",
          display: "inline-block",
        }}>
          Start for Free →
        </Link>
      </div>

    </div>
  );
}
