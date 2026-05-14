"use client";

import React from "react";

type LessonBlockType =
  | "intro"
  | "concept"
  | "example"
  | "mistake"
  | "reflection"
  | "warning";

interface LessonBlockProps {
  type: LessonBlockType;
  title: string;
  content: string;
}

export default function LessonBlock({
  type,
  title,
  content,
}: LessonBlockProps) {
  const styles = {
    base: {
      padding: "14px",
      borderRadius: "12px",
      border: "1px solid var(--card-border)",
      background: "var(--card)",
      marginBottom: "12px",
    },
  };

  const accent = {
    intro: "rgba(99,102,241,0.15)",
    concept: "rgba(59,130,246,0.12)",
    example: "rgba(34,197,94,0.12)",
    mistake: "rgba(239,68,68,0.12)",
    reflection: "rgba(245,158,11,0.12)",
    warning: "rgba(244,63,94,0.12)",
  }[type];

  return (
    <div style={{ ...styles.base, background: accent }}>
      <p
        style={{
          fontSize: "11px",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          opacity: 0.7,
          marginBottom: "6px",
        }}
      >
        {type}
      </p>

      <p style={{ fontWeight: 800, marginBottom: "6px" }}>{title}</p>

      <p
        style={{
          fontSize: "14px",
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
        }}
      >
        {content}
      </p>
    </div>
  );
}
