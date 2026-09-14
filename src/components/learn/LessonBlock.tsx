"use client";

// ⚠️ NOT CURRENTLY MOUNTED: only LessonRenderer.tsx imports this file, and
// nothing in the live app imports LessonRenderer. See the note in
// MathRenderer.tsx -- same unreached chain.
import MathRenderer, { containsMathSyntax } from "./MathRenderer";
import { normalizeMathContent } from "@/lib/learn/mathNotation";

interface Props {
  type: string;
  content: string;
}

function cleanLessonText(content: string): string {
  return content.split("\n").map((line) => {
    let value = line;
    const boldMarkers = (value.match(/\*\*/g) ?? []).length;
    if (boldMarkers % 2 === 1) value = value.replace(/\*\*/g, "");
    value = value.replace(/^(\d{2})(?=[A-Z][a-z])/g, "$1 ");
    return value;
  }).join("\n");
}

function InlineContent({ content }: { content: string }) {
  const normalized = cleanLessonText(normalizeMathContent(content));
  return containsMathSyntax(normalized) ? (
    <MathRenderer content={normalized} block={false} />
  ) : (
    <>{normalized}</>
  );
}

export default function LessonBlock({ type, content }: Props) {
  const normalized = cleanLessonText(normalizeMathContent(content));

  switch (type) {
    case "text":
      return (
        <p style={{ lineHeight: 1.7 }}>
          <InlineContent content={normalized} />
        </p>
      );

    case "example":
      return (
        <div style={{ padding: 12, borderLeft: "3px solid #6366f1", background: "rgba(99,102,241,0.06)", borderRadius: 8 }}>
          <strong>Example</strong>
          <p style={{ marginTop: 6 }}>
            <InlineContent content={normalized} />
          </p>
        </div>
      );

    case "math":
      return (
        <div style={{ padding: "8px 0" }}>
          <MathRenderer content={normalized} block />
        </div>
      );

    case "tip":
      return (
        <div style={{ padding: 10, background: "rgba(34,197,94,0.08)", borderRadius: 8 }}>
          <strong>Tip:</strong> <InlineContent content={normalized} />
        </div>
      );

    default:
      return (
        <p>
          <InlineContent content={normalized} />
        </p>
      );
  }
}
