"use client";

import Link from "next/link";
import { useState } from "react";

// ─── Global animations ────────────────────────────────────────────────────────

function GlobalStyles() {
  return (
    <style>{`
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      @keyframes orb-1 {
        0%, 100% { transform: translate(0, 0) scale(1); }
        33%       { transform: translate(60px, -40px) scale(1.08); }
        66%       { transform: translate(-30px, 50px) scale(0.95); }
      }
      @keyframes orb-2 {
        0%, 100% { transform: translate(0, 0) scale(1); }
        33%       { transform: translate(-80px, 30px) scale(0.92); }
        66%       { transform: translate(50px, -60px) scale(1.06); }
      }
      @keyframes orb-3 {
        0%, 100% { transform: translate(0, 0) scale(1); }
        50%       { transform: translate(40px, -80px) scale(1.1); }
      }
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50%       { transform: translateY(-14px); }
      }
      @keyframes float-slow {
        0%, 100% { transform: translateY(0px); }
        50%       { transform: translateY(-8px); }
      }
      @keyframes glow-pulse {
        0%, 100% { opacity: 0.5; }
        50%       { opacity: 1; }
      }
      @keyframes gradient-shift {
        0%   { background-position: 0% 50%; }
        50%  { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      @keyframes slide-up {
        from { opacity: 0; transform: translateY(24px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes fade-in {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      @keyframes spin-slow {
        to { transform: rotate(360deg); }
      }
      @keyframes bar-fill {
        from { width: 0%; }
        to   { width: var(--target-width); }
      }

      .hero-content   { animation: slide-up 0.7s ease both; }
      .hero-mockup    { animation: slide-up 0.7s ease 0.2s both; }
      .section-fade   { animation: slide-up 0.6s ease both; }

      .nav-link {
        color: #94a3b8;
        text-decoration: none;
        font-size: 14px;
        font-weight: 500;
        transition: color 0.2s;
      }
      .nav-link:hover { color: #f8fafc; }

      .btn-primary {
        display: inline-flex; align-items: center; justify-content: center;
        background: #6366f1;
        color: white;
        font-weight: 700; font-size: 15px;
        padding: 12px 28px;
        border-radius: 12px; border: none; cursor: pointer;
        text-decoration: none;
        transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
        box-shadow: 0 0 0 rgba(99,102,241,0);
      }
      .btn-primary:hover {
        background: #4f46e5;
        box-shadow: 0 0 30px rgba(99,102,241,0.45);
        transform: translateY(-1px);
      }
      .btn-secondary {
        display: inline-flex; align-items: center; justify-content: center;
        background: rgba(255,255,255,0.06);
        color: #f8fafc;
        font-weight: 600; font-size: 15px;
        padding: 12px 28px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.1);
        cursor: pointer; text-decoration: none;
        transition: background 0.2s, border-color 0.2s, transform 0.15s;
      }
      .btn-secondary:hover {
        background: rgba(255,255,255,0.1);
        border-color: rgba(255,255,255,0.2);
        transform: translateY(-1px);
      }

      .feature-card {
        background: rgba(255,255,255,0.025);
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 20px;
        transition: border-color 0.3s, box-shadow 0.3s, transform 0.3s;
        overflow: hidden;
      }
      .feature-card:hover {
        border-color: rgba(99,102,241,0.35);
        box-shadow: 0 0 50px rgba(99,102,241,0.08);
        transform: translateY(-3px);
      }

      .tool-card {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 14px;
        padding: 18px 16px;
        transition: background 0.2s, border-color 0.2s, transform 0.2s;
        cursor: default;
      }
      .tool-card:hover {
        background: rgba(99,102,241,0.08);
        border-color: rgba(99,102,241,0.25);
        transform: translateY(-2px);
      }

      .faq-item {
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 14px;
        overflow: hidden;
        transition: border-color 0.2s;
      }
      .faq-item:hover { border-color: rgba(255,255,255,0.12); }
      .faq-item.open  { border-color: rgba(99,102,241,0.3); }

      .faq-question {
        width: 100%; background: none; border: none; cursor: pointer;
        display: flex; justify-content: space-between; align-items: center;
        padding: 20px 24px; text-align: left;
        transition: background 0.2s;
        color: #f8fafc;
      }
      .faq-question:hover { background: rgba(255,255,255,0.03); }

      .step-icon {
        animation: float-slow 4s ease-in-out infinite;
      }
      .step-icon:nth-child(2) { animation-delay: -1.3s; }
      .step-icon:nth-child(3) { animation-delay: -2.6s; }

      .mockup-float {
        animation: float 6s ease-in-out infinite;
      }

      .gradient-text {
        background: linear-gradient(135deg, #f8fafc 0%, #c7d2fe 45%, #a5b4fc 100%);
        background-size: 200% 200%;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: gradient-shift 6s ease infinite;
      }

      .section-divider {
        width: 1px;
        height: 80px;
        background: linear-gradient(to bottom, transparent, rgba(99,102,241,0.4), transparent);
        margin: 0 auto;
      }

      .grid-pattern {
        background-image:
          linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
        background-size: 60px 60px;
      }

      @media (max-width: 768px) {
        .hero-layout { flex-direction: column !important; }
        .hero-text   { text-align: center; align-items: center !important; }
        .hero-ctas   { justify-content: center !important; }
        .feature-layout { flex-direction: column !important; }
        .feature-layout.reversed { flex-direction: column !important; }
        .how-grid    { grid-template-columns: 1fr !important; }
        .tools-grid  { grid-template-columns: repeat(2, 1fr) !important; }
        .nav-links   { display: none !important; }
        .trust-grid  { grid-template-columns: 1fr !important; }
        .footer-links { flex-direction: column !important; gap: 12px !important; }
      }
      @media (min-width: 769px) and (max-width: 1024px) {
        .tools-grid { grid-template-columns: repeat(3, 1fr) !important; }
      }
    `}</style>
  );
}

// ─── Reusable atoms ───────────────────────────────────────────────────────────

function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "6px",
      background: "rgba(99,102,241,0.12)",
      border: "1px solid rgba(99,102,241,0.25)",
      borderRadius: "999px",
      padding: "5px 14px",
      fontSize: "12px", fontWeight: 700,
      color: "#a5b4fc", letterSpacing: "0.06em", textTransform: "uppercase",
    }}>
      {children}
    </span>
  );
}

// ─── Navigation ───────────────────────────────────────────────────────────────

function Nav() {
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: "rgba(7,7,13,0.85)",
      backdropFilter: "blur(20px)",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      padding: "0 24px",
      height: "64px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      {/* Logo */}
      <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{
          width: "32px", height: "32px", borderRadius: "8px",
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "16px", flexShrink: 0,
        }}>
          ◈
        </div>
        <span style={{ fontSize: "16px", fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.01em" }}>
          Shadecode <span style={{ color: "#818cf8" }}>Student</span>
        </span>
      </Link>

      {/* Nav links */}
      <div className="nav-links" style={{ display: "flex", alignItems: "center", gap: "32px" }}>
        <a href="#features"  className="nav-link">Features</a>
        <a href="#how"       className="nav-link">How it works</a>
        <a href="#tools"     className="nav-link">Tools</a>
        <a href="#faq"       className="nav-link">FAQ</a>
      </div>

      {/* CTAs */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <Link href="/auth/login" className="btn-secondary" style={{ padding: "9px 20px", fontSize: "14px" }}>
          Sign In
        </Link>
        <Link href="/auth/signup" className="btn-primary" style={{ padding: "9px 20px", fontSize: "14px" }}>
          Get Started
        </Link>
      </div>
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function DashboardMockup() {
  return (
    <div className="mockup-float" style={{
      width: "100%", maxWidth: "480px",
      background: "rgba(10,10,20,0.95)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "20px",
      overflow: "hidden",
      boxShadow: "0 0 0 1px rgba(99,102,241,0.2), 0 40px 80px rgba(0,0,0,0.6), 0 0 60px rgba(99,102,241,0.12)",
    }}>
      {/* App chrome */}
      <div style={{
        padding: "14px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(255,255,255,0.02)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ef4444" }} />
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#f59e0b" }} />
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#22c55e" }} />
        </div>
        <span style={{ fontSize: "11px", color: "#475569", fontWeight: 600 }}>Shadecode Student</span>
        <div style={{ width: "60px", height: "8px", borderRadius: "4px", background: "rgba(99,102,241,0.3)" }} />
      </div>

      {/* Dashboard content */}
      <div style={{ padding: "16px" }}>
        {/* Welcome + streak */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
          <div>
            <p style={{ fontSize: "11px", color: "#475569", margin: 0 }}>Welcome back</p>
            <p style={{ fontSize: "17px", fontWeight: 800, color: "#f8fafc", margin: "2px 0 0" }}>Alex 👋</p>
          </div>
          <div style={{ background: "rgba(251,146,60,0.12)", border: "1px solid rgba(251,146,60,0.25)", borderRadius: "20px", padding: "4px 10px", display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ fontSize: "12px" }}>🔥</span>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#fb923c" }}>14d streak</span>
          </div>
        </div>

        {/* XP bar */}
        <div style={{ marginBottom: "14px", background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "10px 12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#818cf8" }}>Level 7</span>
            <span style={{ fontSize: "11px", color: "#475569" }}>340 / 700 XP</span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: "99px", height: "5px", overflow: "hidden" }}>
            <div style={{ width: "48%", height: "100%", background: "linear-gradient(90deg, #6366f1, #818cf8)", borderRadius: "99px", boxShadow: "0 0 8px rgba(99,102,241,0.6)" }} />
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px", marginBottom: "12px" }}>
          {[
            { v: "+340",  l: "Wkly XP", c: "#6366f1" },
            { v: "180m",  l: "Focus",   c: "#8b5cf6" },
            { v: "82%",   l: "Avg",     c: "#22c55e" },
            { v: "14d",   l: "Streak",  c: "#fb923c" },
          ].map(s => (
            <div key={s.l} style={{ background: `${s.c}12`, border: `1px solid ${s.c}25`, borderRadius: "8px", padding: "8px 6px", textAlign: "center" }}>
              <p style={{ fontSize: "13px", fontWeight: 800, color: s.c, margin: 0 }}>{s.v}</p>
              <p style={{ fontSize: "9px", color: "#475569", margin: "2px 0 0", fontWeight: 600 }}>{s.l}</p>
            </div>
          ))}
        </div>

        {/* Cortex insight */}
        <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "10px", padding: "10px 12px", marginBottom: "12px", display: "flex", gap: "8px", alignItems: "flex-start" }}>
          <span style={{ fontSize: "13px", flexShrink: 0 }}>🔮</span>
          <p style={{ fontSize: "11px", color: "#94a3b8", margin: 0, lineHeight: 1.5 }}>
            <span style={{ color: "#818cf8", fontWeight: 700 }}>Cortex: </span>
            Physics dropped 15pts this week. Time to review.
          </p>
        </div>

        {/* Subject progress */}
        <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "10px 12px" }}>
          <p style={{ fontSize: "10px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>Subjects</p>
          {[
            { name: "Mathematics", pct: 82, color: "#22c55e" },
            { name: "Physics",     pct: 45, color: "#ef4444" },
            { name: "Chemistry",   pct: 67, color: "#6366f1" },
          ].map(s => (
            <div key={s.name} style={{ marginBottom: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8" }}>{s.name}</span>
                <span style={{ fontSize: "10px", color: "#475569" }}>{s.pct}%</span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "99px", height: "4px" }}>
                <div style={{ width: `${s.pct}%`, height: "100%", background: s.color, borderRadius: "99px", transition: "width 1s ease" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", overflow: "hidden", paddingTop: "64px" }}>
      {/* Animated background orbs */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div className="grid-pattern" style={{ position: "absolute", inset: 0, opacity: 0.4 }} />
        <div style={{ position: "absolute", top: "15%", left: "8%", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)", animation: "orb-1 18s ease-in-out infinite", filter: "blur(40px)" }} />
        <div style={{ position: "absolute", bottom: "10%", right: "10%", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)", animation: "orb-2 22s ease-in-out infinite", filter: "blur(50px)" }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)", animation: "orb-3 26s ease-in-out infinite", filter: "blur(60px)", transform: "translate(-50%, -50%)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: "1200px", margin: "0 auto", padding: "80px 24px", width: "100%" }}>
        <div className="hero-layout" style={{ display: "flex", alignItems: "center", gap: "60px" }}>

          {/* Text side */}
          <div className="hero-content hero-text" style={{ flex: "1 1 50%", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "24px" }}>
            <SectionBadge>✦ AI-Powered Study Platform</SectionBadge>

            <h1 style={{
              fontSize: "clamp(2.4rem, 5vw, 4rem)",
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: "-0.025em",
              color: "#f8fafc",
            }}>
              Study smarter with{" "}
              <span className="gradient-text">AI insights,</span>
              {" "}math checking, and exam practice.
            </h1>

            <p style={{
              fontSize: "clamp(1rem, 1.5vw, 1.15rem)",
              color: "#94a3b8",
              lineHeight: 1.7,
              maxWidth: "480px",
            }}>
              Shadecode Student helps you understand how you study, improve weak areas, and prepare faster — built for real student work at every level.
            </p>

            <div className="hero-ctas" style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <Link href="/auth/signup" className="btn-primary" style={{ padding: "14px 32px", fontSize: "16px" }}>
                Get Started Free →
              </Link>
              <Link href="/auth/login" className="btn-secondary" style={{ padding: "14px 28px", fontSize: "16px" }}>
                Sign In
              </Link>
            </div>

            <p style={{ fontSize: "13px", color: "#475569" }}>
              Free to start · No card required · Works online and offline
            </p>

            {/* Social proof bar */}
            <div style={{ display: "flex", alignItems: "center", gap: "20px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.06)", width: "100%" }}>
              {[
                { v: "14",    l: "Subjects" },
                { v: "3",     l: "AI tools" },
                { v: "100%",  l: "Free tier" },
              ].map((s, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "20px", fontWeight: 900, color: "#f8fafc" }}>{s.v}</span>
                  <span style={{ fontSize: "12px", color: "#475569", fontWeight: 500 }}>{s.l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mockup side */}
          <div className="hero-mockup" style={{ flex: "1 1 50%", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      num: "01",
      icon: "🔮",
      title: "Understand your study habits",
      desc: "Cortex silently analyses your exam results, focus sessions, and weak areas to build a precise picture of how you learn — and what needs attention.",
      color: "#6366f1",
    },
    {
      num: "02",
      icon: "📐",
      title: "Solve work with guidance",
      desc: "Upload handwritten math problems and get step-by-step feedback. Understand exactly where you went wrong and how to improve — not just what the answer is.",
      color: "#8b5cf6",
    },
    {
      num: "03",
      icon: "🎯",
      title: "Prepare before exams",
      desc: "Practice under real exam conditions with timed, AI-generated simulations across 14 subjects. Track your performance and build genuine confidence.",
      color: "#06b6d4",
    },
  ];

  return (
    <section id="how" style={{ padding: "120px 24px", position: "relative" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "72px" }}>
          <SectionBadge>How it works</SectionBadge>
          <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.8rem)", fontWeight: 900, color: "#f8fafc", marginTop: "20px", letterSpacing: "-0.02em" }}>
            Three steps to study with intelligence
          </h2>
          <p style={{ fontSize: "16px", color: "#64748b", marginTop: "14px", maxWidth: "480px", margin: "14px auto 0", lineHeight: 1.7 }}>
            Not another app to manage. A system that works quietly in the background as you study.
          </p>
        </div>

        {/* Steps */}
        <div className="how-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2px", position: "relative" }}>
          {steps.map((step, i) => (
            <div key={i} style={{ position: "relative", padding: "2px" }}>
              {/* Connector line */}
              {i < 2 && (
                <div style={{
                  position: "absolute", top: "52px", right: "-1px",
                  width: "2px", height: "40px",
                  background: `linear-gradient(to bottom, ${step.color}40, transparent)`,
                  display: "none", // hidden on mobile, shown via CSS
                }} />
              )}

              <div style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "20px",
                padding: "36px 32px",
                height: "100%",
                position: "relative",
                overflow: "hidden",
              }}>
                {/* Glow */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: `linear-gradient(90deg, transparent, ${step.color}60, transparent)` }} />

                {/* Step number */}
                <div style={{ fontSize: "11px", fontWeight: 800, color: step.color, letterSpacing: "0.1em", marginBottom: "20px", opacity: 0.7 }}>
                  STEP {step.num}
                </div>

                {/* Icon */}
                <div className="step-icon" style={{
                  width: "56px", height: "56px", borderRadius: "16px",
                  background: `${step.color}15`,
                  border: `1px solid ${step.color}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "26px", marginBottom: "20px",
                }}>
                  {step.icon}
                </div>

                <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#f8fafc", marginBottom: "12px", lineHeight: 1.3 }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.7 }}>
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Core Features ────────────────────────────────────────────────────────────

function CortexMockup() {
  return (
    <div style={{ background: "rgba(8,8,18,0.9)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "16px", padding: "20px", maxWidth: "400px", width: "100%", boxShadow: "0 0 40px rgba(99,102,241,0.1)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        <span style={{ fontSize: "16px" }}>🔮</span>
        <span style={{ fontSize: "13px", fontWeight: 700, color: "#818cf8" }}>Cortex Analytics</span>
        <div style={{ marginLeft: "auto", width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e", animation: "glow-pulse 2s ease infinite" }} />
      </div>

      <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: "10px", padding: "12px", marginBottom: "14px" }}>
        <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0, lineHeight: 1.5 }}>
          <span style={{ color: "#818cf8", fontWeight: 700 }}>Cortex: </span>
          Physics dropped 18pts this week. You study best in the evening — schedule review sessions then.
        </p>
      </div>

      <p style={{ fontSize: "10px", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>Revision Queue</p>
      {[
        { topic: "Quantum Mechanics",  sub: "Physics",   pct: 80, color: "#ef4444", n: "4x" },
        { topic: "Organic Chemistry",  sub: "Chemistry", pct: 50, color: "#f59e0b", n: "2x" },
        { topic: "Integration",        sub: "Maths",     pct: 20, color: "#6366f1", n: "1x" },
      ].map(r => (
        <div key={r.topic} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.topic}</span>
              <span style={{ fontSize: "10px", color: r.color, fontWeight: 700, flexShrink: 0, marginLeft: "4px" }}>{r.n}</span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "99px", height: "3px" }}>
              <div style={{ width: `${r.pct}%`, height: "100%", background: r.color, borderRadius: "99px" }} />
            </div>
          </div>
        </div>
      ))}

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "12px", marginTop: "4px", display: "flex", gap: "8px" }}>
        {[
          { l: "Evening sessions", v: "73%", c: "#818cf8" },
          { l: "Sprint XP bonus",  v: "Active", c: "#22c55e" },
        ].map(s => (
          <div key={s.l} style={{ flex: 1, background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "8px 10px" }}>
            <p style={{ fontSize: "9px", color: "#475569", margin: 0, fontWeight: 600 }}>{s.l}</p>
            <p style={{ fontSize: "13px", fontWeight: 800, color: s.c, margin: "2px 0 0" }}>{s.v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MathMockup() {
  return (
    <div style={{ background: "rgba(8,8,18,0.9)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: "16px", padding: "20px", maxWidth: "400px", width: "100%", boxShadow: "0 0 40px rgba(139,92,246,0.1)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        <span style={{ fontSize: "16px" }}>📐</span>
        <span style={{ fontSize: "13px", fontWeight: 700, color: "#a78bfa" }}>Math Checker</span>
      </div>

      <div style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)", borderRadius: "10px", padding: "14px", marginBottom: "14px", fontFamily: "monospace" }}>
        <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 8px", fontFamily: "inherit" }}>Problem:</p>
        <p style={{ fontSize: "15px", color: "#e2e8f0", fontWeight: 600, margin: 0, fontFamily: "inherit" }}>2x² + 5x − 3 = 0</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "14px" }}>
        {[
          { icon: "✓", step: "Identify a=2, b=5, c=−3",         note: "Correct",         ok: true  },
          { icon: "✓", step: "Factor: (2x−1)(x+3) = 0",         note: "Correct",         ok: true  },
          { icon: "⚠", step: "You wrote: x = −1/2",             note: "Sign error",      ok: false },
          { icon: "✓", step: "Corrected: x = 1/2 or x = −3",    note: "Model answer",    ok: true  },
        ].map((s, i) => (
          <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "8px 10px", borderRadius: "8px", background: s.ok ? "rgba(34,197,94,0.05)" : "rgba(239,68,68,0.05)", border: `1px solid ${s.ok ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}` }}>
            <span style={{ fontSize: "12px", flexShrink: 0 }}>{s.icon}</span>
            <div>
              <p style={{ fontSize: "11px", color: s.ok ? "#86efac" : "#fca5a5", margin: 0, fontFamily: "monospace" }}>{s.step}</p>
              <p style={{ fontSize: "10px", color: "#475569", margin: "2px 0 0" }}>{s.note}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        <div style={{ flex: 1, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "8px", padding: "8px", textAlign: "center" }}>
          <p style={{ fontSize: "16px", fontWeight: 800, color: "#22c55e", margin: 0 }}>8/10</p>
          <p style={{ fontSize: "10px", color: "#475569", margin: 0 }}>Score</p>
        </div>
        <div style={{ flex: 1, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "8px", padding: "8px", textAlign: "center" }}>
          <p style={{ fontSize: "16px", fontWeight: 800, color: "#818cf8", margin: 0 }}>B+</p>
          <p style={{ fontSize: "10px", color: "#475569", margin: 0 }}>Grade</p>
        </div>
      </div>
    </div>
  );
}

function ExamMockup() {
  return (
    <div style={{ background: "rgba(8,8,18,0.9)", border: "1px solid rgba(6,182,212,0.2)", borderRadius: "16px", padding: "20px", maxWidth: "400px", width: "100%", boxShadow: "0 0 40px rgba(6,182,212,0.08)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "14px" }}>🎯</span>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8" }}>Physics · A-Level</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)", borderRadius: "8px", padding: "5px 10px" }}>
          <span style={{ fontSize: "11px" }}>⏱</span>
          <span style={{ fontSize: "13px", fontWeight: 900, color: "#06b6d4", fontVariantNumeric: "tabular-nums" }}>18:42</span>
        </div>
      </div>

      {/* Progress */}
      <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "99px", height: "4px", marginBottom: "16px", overflow: "hidden" }}>
        <div style={{ width: "60%", height: "100%", background: "#06b6d4", borderRadius: "99px" }} />
      </div>

      <p style={{ fontSize: "11px", fontWeight: 600, color: "#475569", marginBottom: "10px" }}>Q6 of 10</p>

      <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "10px", padding: "12px", marginBottom: "12px" }}>
        <p style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: 1.6, margin: 0 }}>
          A particle of mass 2.0 kg is acted on by a net force. If acceleration is 4.8 m/s², what is the force?
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "14px" }}>
        {[
          { l: "A", t: "4.8 N", selected: false },
          { l: "B", t: "9.6 N", selected: true  },
          { l: "C", t: "2.4 N", selected: false },
          { l: "D", t: "19.2 N",selected: false },
        ].map(opt => (
          <div key={opt.l} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", borderRadius: "8px", border: `1px solid ${opt.selected ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.07)"}`, background: opt.selected ? "rgba(99,102,241,0.12)" : "transparent", cursor: "pointer" }}>
            <div style={{ width: "22px", height: "22px", borderRadius: "50%", border: `1px solid ${opt.selected ? "#6366f1" : "rgba(255,255,255,0.15)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, color: opt.selected ? "#818cf8" : "#475569", flexShrink: 0 }}>
              {opt.l}
            </div>
            <span style={{ fontSize: "12px", color: opt.selected ? "#e2e8f0" : "#64748b", fontWeight: opt.selected ? 600 : 400 }}>{opt.t}</span>
            {opt.selected && <span style={{ marginLeft: "auto", fontSize: "10px", color: "#818cf8" }}>✓ selected</span>}
          </div>
        ))}
      </div>

      {/* Question dots */}
      <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} style={{ width: "26px", height: "26px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, background: i === 5 ? "#6366f1" : i < 5 ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.05)", color: i === 5 ? "white" : i < 5 ? "#22c55e" : "#475569" }}>
            {i + 1}
          </div>
        ))}
      </div>
    </div>
  );
}

function CoreFeatures() {
  const features = [
    {
      id: "cortex",
      badge: "🔮 Cortex AI",
      badgeColor: "#6366f1",
      headline: "Your personal study intelligence system.",
      subhead: "Cortex watches silently. It learns how you study, when you focus best, and exactly where you're losing marks — then tells you what to do next.",
      points: [
        "Detects weak topics automatically from exam results",
        "Tracks focus patterns across all your sessions",
        "Builds a personalised revision queue by priority",
        "Surfaces learning trends before exams arrive",
      ],
      color: "#6366f1",
      Mockup: CortexMockup,
      reversed: false,
    },
    {
      id: "math",
      badge: "📐 Math Checker",
      badgeColor: "#8b5cf6",
      headline: "Check handwritten math, step by step.",
      subhead: "Upload photos of your handwritten work. Get honest, step-level feedback that explains the mistake — not just the correct answer.",
      points: [
        "Upload handwritten solutions and equations",
        "Step-by-step breakdown of where errors occur",
        "Understand the method, not just the answer",
        "Works across O-Level, A-Level, and university math",
      ],
      color: "#8b5cf6",
      Mockup: MathMockup,
      reversed: true,
    },
    {
      id: "exam",
      badge: "🎯 Exam Simulation",
      badgeColor: "#06b6d4",
      headline: "Practice under real exam pressure.",
      subhead: "AI-generated exams, timed to the minute. Cortex marks your answers, identifies weak areas, and adds them to your revision queue automatically.",
      points: [
        "Timed exams across 14 subjects and 3 difficulty levels",
        "AI marks written and structured answers",
        "Weak areas fed directly into your revision queue",
        "Track performance trends across every attempt",
      ],
      color: "#06b6d4",
      Mockup: ExamMockup,
      reversed: false,
    },
  ];

  return (
    <section id="features" style={{ padding: "80px 24px 120px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "80px" }}>
          <SectionBadge>Core features</SectionBadge>
          <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.8rem)", fontWeight: 900, color: "#f8fafc", marginTop: "20px", letterSpacing: "-0.02em", maxWidth: "600px", margin: "20px auto 0" }}>
            Three tools. One system. Built around how students actually study.
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {features.map((f) => (
            <div key={f.id} className="feature-card" style={{ padding: "0" }}>
              <div
                className={`feature-layout ${f.reversed ? "reversed" : ""}`}
                style={{
                  display: "flex",
                  flexDirection: f.reversed ? "row-reverse" : "row",
                  alignItems: "center",
                  gap: "60px",
                  padding: "56px 52px",
                }}
              >
                {/* Text */}
                <div style={{ flex: "1 1 45%" }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "6px",
                    background: `${f.color}15`, border: `1px solid ${f.color}30`,
                    borderRadius: "999px", padding: "5px 14px",
                    fontSize: "12px", fontWeight: 700, color: f.color,
                    marginBottom: "20px",
                  }}>
                    {f.badge}
                  </span>

                  <h3 style={{ fontSize: "clamp(1.4rem, 2.5vw, 2rem)", fontWeight: 900, color: "#f8fafc", lineHeight: 1.2, letterSpacing: "-0.02em", marginBottom: "16px" }}>
                    {f.headline}
                  </h3>

                  <p style={{ fontSize: "15px", color: "#64748b", lineHeight: 1.7, marginBottom: "24px" }}>
                    {f.subhead}
                  </p>

                  <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "10px", marginBottom: "28px" }}>
                    {f.points.map((pt, i) => (
                      <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "14px", color: "#94a3b8" }}>
                        <span style={{ color: f.color, flexShrink: 0, fontSize: "14px", marginTop: "1px" }}>✓</span>
                        {pt}
                      </li>
                    ))}
                  </ul>

                  <Link href="/auth/signup" style={{
                    display: "inline-flex", alignItems: "center", gap: "6px",
                    color: f.color, fontSize: "14px", fontWeight: 700,
                    textDecoration: "none", borderBottom: `1px solid ${f.color}40`,
                    paddingBottom: "2px", transition: "border-color 0.2s",
                  }}>
                    Try it free →
                  </Link>
                </div>

                {/* Mockup */}
                <div style={{ flex: "1 1 50%", display: "flex", justifyContent: "center" }}>
                  <f.Mockup />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Supporting Tools ─────────────────────────────────────────────────────────

function SupportingTools() {
  const tools = [
    { icon: "📅", name: "Smart Timetable",    desc: "Organise your study schedule" },
    { icon: "✅", name: "Task Tracker",        desc: "Manage work by subject" },
    { icon: "🤖", name: "AI Learn",            desc: "Ask anything, explained clearly" },
    { icon: "🏆", name: "Daily Challenges",    desc: "XP rewards for consistency" },
    { icon: "⏱", name: "Focus Timer",          desc: "Pomodoro and sprint modes" },
    { icon: "🔥", name: "Streak System",        desc: "Build study habits daily" },
    { icon: "📊", name: "Analytics",           desc: "Full performance history" },
    { icon: "🥇", name: "Leaderboards",        desc: "Compete with other students" },
    { icon: "📶", name: "Offline Support",     desc: "Study without internet" },
    { icon: "📚", name: "14 Subjects",         desc: "O-Level to University" },
  ];

  return (
    <section id="tools" style={{ padding: "100px 24px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <SectionBadge>Supporting tools</SectionBadge>
          <h2 style={{ fontSize: "clamp(1.6rem, 2.5vw, 2.2rem)", fontWeight: 900, color: "#f8fafc", marginTop: "20px", letterSpacing: "-0.02em" }}>
            Everything you need to stay organised
          </h2>
          <p style={{ fontSize: "15px", color: "#64748b", marginTop: "12px" }}>
            All included. No upsells. No feature gates.
          </p>
        </div>

        <div className="tools-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px" }}>
          {tools.map((tool, i) => (
            <div key={i} className="tool-card">
              <div style={{ fontSize: "24px", marginBottom: "10px" }}>{tool.icon}</div>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#e2e8f0", margin: "0 0 4px" }}>{tool.name}</p>
              <p style={{ fontSize: "11px", color: "#475569", margin: 0, lineHeight: 1.5 }}>{tool.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Trust ────────────────────────────────────────────────────────────────────

function TrustSection() {
  const signals = [
    {
      icon: "🔒",
      title: "Your data stays yours",
      desc: "We don't sell your study data. Your exam results, weak areas, and progress belong to you — always.",
      color: "#22c55e",
    },
    {
      icon: "📶",
      title: "Works offline",
      desc: "Built with offline support from day one. Study during load-shedding, on a bus, or anywhere with no signal.",
      color: "#6366f1",
    },
    {
      icon: "🎓",
      title: "Free to start",
      desc: "No credit card. No trial limits. Create an account and access the full platform immediately.",
      color: "#f59e0b",
    },
  ];

  return (
    <section style={{ padding: "80px 24px", background: "rgba(255,255,255,0.015)", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <div className="trust-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "32px", alignItems: "start" }}>
          {signals.map((s, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: `${s.color}12`, border: `1px solid ${s.color}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>
                {s.icon}
              </div>
              <div>
                <h4 style={{ fontSize: "15px", fontWeight: 800, color: "#f8fafc", margin: "0 0 6px" }}>{s.title}</h4>
                <p style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);

  const faqs = [
    {
      q: "Who is Shadecode Student for?",
      a: "High school, A-Level, and university students who want to study more intelligently. If you take exams, want to understand your weak areas, or need structured revision tools — this is built for you. It works especially well for students doing 14 core academic subjects.",
    },
    {
      q: "What exactly is Cortex?",
      a: "Cortex is the study intelligence layer that runs quietly across everything you do on Shadecode Student. It analyses your exam results, focus sessions, and task completion to detect patterns — like which topics keep appearing as weak areas, when you study most effectively, and what you should revise next. It's not a chatbot. It's a system that learns from your study behaviour.",
    },
    {
      q: "Is it actually free?",
      a: "Yes. Create an account and access the full platform with no credit card required and no time limit. There are no hidden paywalls on the core features: Cortex, Exam Simulation, Math Checker, Focus Timer, and all study tools are included from day one.",
    },
    {
      q: "Does it work without internet?",
      a: "Yes. Shadecode Student is built as a Progressive Web App (PWA) with offline support. You can study, use the focus timer, review flashcards, and access your saved content without an internet connection. A great fit for studying during load-shedding or on the go.",
    },
    {
      q: "What subjects are supported?",
      a: "14 subjects at O-Level, A-Level, and University entrance standard: Mathematics, Physics, Chemistry, Biology, Geography, History, Economics, Computer Science, English Language, English Literature, Accounting, Business Studies, Sociology, and Psychology.",
    },
  ];

  return (
    <section id="faq" style={{ padding: "100px 24px" }}>
      <div style={{ maxWidth: "720px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <SectionBadge>FAQ</SectionBadge>
          <h2 style={{ fontSize: "clamp(1.6rem, 2.5vw, 2.2rem)", fontWeight: 900, color: "#f8fafc", marginTop: "20px", letterSpacing: "-0.02em" }}>
            Common questions
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {faqs.map((faq, i) => (
            <div key={i} className={`faq-item ${open === i ? "open" : ""}`}>
              <button
                className="faq-question"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
              >
                <span style={{ fontSize: "15px", fontWeight: 700, paddingRight: "16px" }}>{faq.q}</span>
                <span style={{ fontSize: "18px", color: open === i ? "#818cf8" : "#334155", flexShrink: 0, transition: "transform 0.2s, color 0.2s", transform: open === i ? "rotate(45deg)" : "rotate(0deg)", display: "inline-block" }}>
                  +
                </span>
              </button>
              {open === i && (
                <div style={{ padding: "0 24px 20px", animation: "slide-up 0.2s ease" }}>
                  <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.75, margin: 0 }}>{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ────────────────────────────────────────────────────────────────

function FinalCTA() {
  return (
    <section style={{ padding: "80px 24px 100px", position: "relative", overflow: "hidden" }}>
      {/* Background */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.18) 0%, transparent 65%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.5) 50%, transparent 100%)" }} />

      <div style={{ position: "relative", maxWidth: "700px", margin: "0 auto", textAlign: "center" }}>
        <div style={{ width: "64px", height: "64px", borderRadius: "18px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", margin: "0 auto 32px", boxShadow: "0 0 40px rgba(99,102,241,0.4)" }}>
          ◈
        </div>

        <h2 style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)", fontWeight: 900, color: "#f8fafc", lineHeight: 1.15, letterSpacing: "-0.025em", marginBottom: "20px" }}>
          Start studying with{" "}
          <span className="gradient-text">insight,</span>
          {" "}not guesswork.
        </h2>

        <p style={{ fontSize: "17px", color: "#64748b", lineHeight: 1.7, marginBottom: "36px", maxWidth: "480px", margin: "0 auto 36px" }}>
          Join students using Shadecode Student to understand how they learn, fix their weak areas, and walk into exams prepared.
        </p>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/auth/signup" className="btn-primary" style={{ padding: "16px 40px", fontSize: "17px" }}>
            Get Started Free →
          </Link>
        </div>

        <p style={{ fontSize: "13px", color: "#334155", marginTop: "20px" }}>
          Free forever · No card required · Offline support included
        </p>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "40px 24px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "28px", height: "28px", borderRadius: "7px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>
            ◈
          </div>
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#64748b" }}>
            Shadecode Student
          </span>
        </div>

        {/* Links */}
        <div className="footer-links" style={{ display: "flex", alignItems: "center", gap: "28px" }}>
          {[
            { label: "Dashboard",  href: "/dashboard"    },
            { label: "Exam Sim",   href: "/exam-sim"     },
            { label: "Focus",      href: "/focus"        },
            { label: "Analytics",  href: "/analytics"    },
            { label: "Sign In",    href: "/auth/login"   },
          ].map(l => (
            <Link key={l.label} href={l.href} style={{ fontSize: "13px", color: "#475569", textDecoration: "none", transition: "color 0.2s" }} className="nav-link">
              {l.label}
            </Link>
          ))}
        </div>

        <p style={{ fontSize: "12px", color: "#334155" }}>
          © {new Date().getFullYear()} Shadecode Student
        </p>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div style={{ background: "#07070d", minHeight: "100vh", color: "#f8fafc", overflowX: "hidden", fontFamily: "inherit" }}>
      <GlobalStyles />
      <Nav />
      <Hero />
      <HowItWorks />
      <CoreFeatures />
      <SupportingTools />
      <TrustSection />
      <FAQSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}
