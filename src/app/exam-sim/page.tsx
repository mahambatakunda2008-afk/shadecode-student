// ONLY CHANGES ARE MARKED WITH 🔧

"use client";

import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

/* ... everything else unchanged ... */

  // ── Exam Screen ───────────────────────────────────────────────────────────
  if (step === "exam" && q) return (
    <div
      style={{
        padding: "0",
        display: "flex",
        flexDirection: "column",
        height: "100dvh", // 🔧 FIX: better mobile viewport handling
        maxWidth: "600px",
        margin: "0 auto",
      }}
    >

      {/* Timer bar */}
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000, // 🔧 FIX: ensure above everything
        background: "var(--card)",
        borderBottom: "1px solid var(--card-border)",
        padding: "12px 20px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <p style={{ fontSize: "13px", fontWeight: 600 }}>
            {subject} — {DIFFICULTIES[difficulty].label}
          </p>

          <p style={{
            fontSize: "18px",
            fontWeight: 800,
            fontVariantNumeric: "tabular-nums",
            color: timeLeft < 300 ? "#ef4444" : timeLeft < 600 ? "#f59e0b" : "var(--foreground)",
          }}>
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </p>
        </div>

        <div style={{ background: "var(--muted)", borderRadius: "99px", height: "4px" }}>
          <div style={{
            background: timeLeft < 300 ? "#ef4444" : timeLeft < 600 ? "#f59e0b" : "var(--primary)",
            borderRadius: "99px",
            height: "4px",
            width: `${timePercent}%`,
            transition: "width 1s linear, background 0.3s ease",
          }} />
        </div>
      </div>

      {/* Question content */}
      <div
        style={{
          padding: "80px 20px 260px", // 🔧 FIX: MORE bottom space so footer never hides content
          overflowY: "auto",
          flex: 1,
        }}
      >
        {/* ... unchanged question UI ... */}
      </div>

      {/* Bottom navigation */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000, // 🔧 FIX: ensure always visible
          background: "var(--card)",
          borderTop: "1px solid var(--card-border)",
          padding: "12px 20px",
          paddingBottom: "calc(12px + env(safe-area-inset-bottom))", // 🔧 FIX: iOS safe area
        }}
      >
        {/* Question dots */}
        <div
          style={{
            display: "flex",
            gap: "6px",
            marginBottom: "10px",
            flexWrap: "wrap", // 🔧 FIX: prevents overflow on small screens
          }}
        >
          {questions.map((_, i) => {
            const answered =
              answers.some(a => a.questionId === questions[i].id) ||
              (i === currentQuestion && currentAnswer);

            return (
              <button
                key={i}
                onClick={() => goToQuestion(i)}
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  cursor: "pointer",
                  fontWeight: 600,
                  border: "none",
                  background:
                    i === currentQuestion
                      ? "var(--primary)"
                      : answered
                      ? "rgba(34,197,94,0.3)"
                      : "var(--muted)",
                  color:
                    i === currentQuestion
                      ? "white"
                      : answered
                      ? "#22c55e"
                      : "var(--muted-foreground)",
                }}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        {/* Buttons */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap", // 🔧 FIX: prevents cutoff on very small screens
          }}
        >
          {currentQuestion > 0 && (
            <button
              onClick={() => goToQuestion(currentQuestion - 1)}
              style={{
                background: "var(--muted)",
                border: "none",
                borderRadius: "8px",
                padding: "10px 16px",
                fontSize: "14px",
                cursor: "pointer",
                color: "var(--foreground)",
                flex: "1",
              }}
            >
              ← Prev
            </button>
          )}

          {currentQuestion < questions.length - 1 ? (
            <button
              onClick={() => goToQuestion(currentQuestion + 1)}
              style={{
                flex: 2,
                background: "var(--primary)",
                border: "none",
                borderRadius: "8px",
                padding: "10px",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
                color: "white",
              }}
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmitExam}
              style={{
                flex: 2,
                background: "#22c55e",
                border: "none",
                borderRadius: "8px",
                padding: "10px",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
                color: "white",
                boxShadow: "0 0 16px rgba(34,197,94,0.4)",
              }}
            >
              Submit Exam ✓
            </button>
          )}
        </div>
      </div>
    </div>
  );
