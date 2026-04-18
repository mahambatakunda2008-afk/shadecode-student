import Link from "next/link";

export default function Home() {
  return (
    <div style={{
      minHeight: "100vh",
      padding: "60px 24px 24px",
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
          Your intelligent study companion. Stay consistent, track progress, and stay motivated.
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
          Get Started
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

      {/* Features */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {[
          { icon: "📅", title: "Smart Timetable", desc: "Auto-generated study schedule with breaks" },
          { icon: "✅", title: "Task Tracker", desc: "Subject-based tasks with XP rewards" },
          { icon: "🔥", title: "Streak System", desc: "Stay consistent and build daily habits" },
          { icon: "🧠", title: "Cortex", desc: "AI that thinks with you — coming soon" },
        ].map((feature) => (
          <div key={feature.title} style={{
            background: "var(--card)",
            border: "1px solid var(--card-border)",
            borderRadius: "12px",
            padding: "16px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}>
            <span style={{ fontSize: "24px" }}>{feature.icon}</span>
            <div>
              <p style={{ fontWeight: 600, fontSize: "15px" }}>{feature.title}</p>
              <p style={{ color: "var(--muted-foreground)", fontSize: "13px", marginTop: "2px" }}>{feature.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
