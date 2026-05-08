import Link from "next/link";

export default function Home() {
  return (
    <div style={{
      minHeight: "100vh",
      padding: "0 0 100px",
      display: "flex",
      flexDirection: "column",
    }}>

      {/* Hero */}
      <div style={{
        padding: "60px 24px 48px",
        background: "linear-gradient(180deg, rgba(99,102,241,0.08) 0%, transparent 100%)",
        borderBottom: "1px solid var(--card-border)",
      }}>
        <p style={{ color: "var(--primary)", fontSize: "12px", fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", marginBottom: "16px" }}>
          Shadecode Student
        </p>
        <h1 style={{ fontSize: "38px", fontWeight: 800, lineHeight: 1.1, marginBottom: "16px" }}>
          Imagine an app that<br />
          <span style={{ color: "var(--primary)" }}>learns how you study.</span>
        </h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: "15px", lineHeight: 1.7, marginBottom: "32px", maxWidth: "360px" }}>
          Most apps track what you do. Shadecode Student understands <em>how</em> you do it — and reflects your patterns back to you through Cortex, your personal AI observer.
        </p>
        <Link href="/auth/signup" style={{
          display: "block",
          background: "var(--primary)",
          color: "white",
          padding: "16px",
          borderRadius: "12px",
          textDecoration: "none",
          fontWeight: 800,
          fontSize: "16px",
          textAlign: "center",
          boxShadow: "0 0 32px var(--primary-glow)",
        }}>
          Get Started — It's Free
        </Link>
        <p style={{ textAlign: "center", color: "var(--muted-foreground)", fontSize: "12px", marginTop: "10px" }}>
          No credit card. No downloads. Works on any device.
        </p>
      </div>

      {/* Hero features — 3 highlighted */}
      <div style={{ padding: "32px 24px 0" }}>
        <p style={{ fontSize: "11px", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: "14px" }}>
          What makes it different
        </p>

        {/* Cortex — hero feature */}
        <div style={{
          background: "rgba(99,102,241,0.08)",
          border: "1px solid rgba(99,102,241,0.25)",
          borderRadius: "16px",
          padding: "20px",
          marginBottom: "10px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <span style={{ fontSize: "24px" }}>🧠</span>
            <div>
              <p style={{ fontWeight: 800, fontSize: "16px" }}>Cortex AI</p>
              <p style={{ fontSize: "11px", color: "var(--primary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Core intelligence</p>
            </div>
          </div>
          <p style={{ color: "var(--muted-foreground)", fontSize: "13px", lineHeight: 1.6 }}>
            Cortex silently observes your study behavior — tasks completed, subjects engaged, streaks maintained — and reflects neutral patterns back to you. Not advice. Not motivation. Just truth.
          </p>
          <div style={{
            marginTop: "12px",
            background: "rgba(99,102,241,0.1)",
            borderRadius: "8px",
            padding: "10px 12px",
            fontSize: "12px",
            color: "var(--muted-foreground)",
            fontStyle: "italic",
            borderLeft: "2px solid rgba(99,102,241,0.4)",
          }}>
            "Task completion rate stands at 73% across 4 subjects. Mathematics engagement concentrated in evening sessions."
          </div>
        </div>

        {/* Math Checker — hero feature */}
        <div style={{
          background: "rgba(34,197,94,0.06)",
          border: "1px solid rgba(34,197,94,0.2)",
          borderRadius: "16px",
          padding: "20px",
          marginBottom: "10px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <span style={{ fontSize: "24px" }}>📐</span>
            <div>
              <p style={{ fontWeight: 800, fontSize: "16px" }}>Math Checker</p>
              <p style={{ fontSize: "11px", color: "#22c55e", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Unique to Shadecode</p>
            </div>
          </div>
          <p style={{ color: "var(--muted-foreground)", fontSize: "13px", lineHeight: 1.6 }}>
            Take a photo of your handwritten working. Cortex reads every step — not just the final answer — and tells you exactly where your method breaks down.
          </p>
        </div>

        {/* Exam Simulation — hero feature */}
        <div style={{
          background: "rgba(245,158,11,0.06)",
          border: "1px solid rgba(245,158,11,0.2)",
          borderRadius: "16px",
          padding: "20px",
          marginBottom: "24px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <span style={{ fontSize: "24px" }}>🎯</span>
            <div>
              <p style={{ fontWeight: 800, fontSize: "16px" }}>Exam Simulation</p>
              <p style={{ fontSize: "11px", color: "#f59e0b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>AI-generated papers</p>
            </div>
          </div>
          <p style={{ color: "var(--muted-foreground)", fontSize: "13px", lineHeight: 1.6 }}>
            Generate timed exam papers for any subject — mixed MCQ, short answer, and structured questions. AI marks every answer and identifies your weak areas.
          </p>
        </div>

        {/* Stats bar */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "8px",
          marginBottom: "32px",
        }}>
          {[
            { value: "14", label: "Subjects" },
            { value: "PWA", label: "Installable" },
            { value: "Free", label: "Forever" },
          ].map(stat => (
            <div key={stat.label} style={{
              background: "var(--card)",
              border: "1px solid var(--card-border)",
              borderRadius: "10px",
              padding: "12px 8px",
              textAlign: "center",
            }}>
              <p style={{ fontSize: "20px", fontWeight: 800, color: "var(--primary)" }}>{stat.value}</p>
              <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "2px" }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Everything else */}
        <p style={{ fontSize: "11px", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: "12px" }}>
          Everything included
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "32px" }}>
          {[
            { icon: "📅", title: "Smart Timetable", desc: "Auto-generated schedule around your subjects" },
            { icon: "✅", title: "Task Tracker", desc: "XP rewards and level progression" },
            { icon: "🔥", title: "Streak System", desc: "Build daily study habits" },
            { icon: "📖", title: "AI Learn", desc: "Topic explanations + practice questions" },
            { icon: "⚡", title: "Daily Challenges", desc: "Fresh challenge every day" },
            { icon: "🏆", title: "Leaderboard", desc: "Compete with other students" },
            { icon: "⏱", title: "Focus Timer", desc: "Pomodoro sessions that earn XP" },
            { icon: "📊", title: "Analytics", desc: "Track exam performance over time" },
            { icon: "📵", title: "Works Offline", desc: "Built for load shedding" },
          ].map(f => (
            <div key={f.title} style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 14px",
              background: "var(--card)",
              border: "1px solid var(--card-border)",
              borderRadius: "10px",
            }}>
              <span style={{ fontSize: "18px", flexShrink: 0 }}>{f.icon}</span>
              <div>
                <p style={{ fontWeight: 600, fontSize: "13px" }}>{f.title}</p>
                <p style={{ color: "var(--muted-foreground)", fontSize: "12px", marginTop: "1px" }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Sign in link */}
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "var(--muted-foreground)", fontSize: "13px", marginBottom: "10px" }}>
            Already have an account?
          </p>
          <Link href="/auth/login" style={{
            display: "block",
            background: "var(--card)",
            color: "var(--foreground)",
            padding: "14px",
            borderRadius: "12px",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "15px",
            textAlign: "center",
            border: "1px solid var(--card-border)",
          }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
