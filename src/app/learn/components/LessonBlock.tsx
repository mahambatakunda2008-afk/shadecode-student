interface Props {
  type: string;
  title?: string;
  content: string;
}

export default function LessonBlock({
  type,
  title,
  content,
}: Props) {
  const styles = {
    intro: {
      bg: "rgba(99,102,241,0.08)",
      border: "rgba(99,102,241,0.25)",
      icon: "🧠",
    },

    concept: {
      bg: "rgba(59,130,246,0.08)",
      border: "rgba(59,130,246,0.25)",
      icon: "📘",
    },

    example: {
      bg: "rgba(34,197,94,0.08)",
      border: "rgba(34,197,94,0.25)",
      icon: "✏️",
    },

    warning: {
      bg: "rgba(239,68,68,0.08)",
      border: "rgba(239,68,68,0.25)",
      icon: "⚠️",
    },

    reflection: {
      bg: "rgba(245,158,11,0.08)",
      border: "rgba(245,158,11,0.25)",
      icon: "🧠",
    },

    summary: {
      bg: "rgba(168,85,247,0.08)",
      border: "rgba(168,85,247,0.25)",
      icon: "📌",
    },

    formula: {
      bg: "rgba(236,72,153,0.08)",
      border: "rgba(236,72,153,0.25)",
      icon: "📐",
    },

    tip: {
      bg: "rgba(16,185,129,0.08)",
      border: "rgba(16,185,129,0.25)",
      icon: "💡",
    },
  } as const;

  const current =
    styles[type as keyof typeof styles] ||
    styles.concept;

  return (
    <div
      style={{
        background: current.bg,
        border: `1px solid ${current.border}`,
        borderRadius: "14px",
        padding: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "10px",
        }}
      >
        <span style={{ fontSize: "18px" }}>
          {current.icon}
        </span>

        <p
          style={{
            fontWeight: 800,
            fontSize: "15px",
            margin: 0,
          }}
        >
          {title || type}
        </p>
      </div>

      <p
        style={{
          fontSize: "14px",
          lineHeight: 1.8,
          color: "var(--foreground)",
          margin: 0,
          whiteSpace: "pre-wrap",
        }}
      >
        {content}
      </p>
    </div>
  );
}
