"use client";

import { BlockMath } from "react-katex";

interface Props {
  type: string;
  content: string;
}

export default function LessonBlock({ type, content }: Props) {
  switch (type) {
    case "text":
      return <p>{content}</p>;
    case "example":
      return (
        <div className="lesson-example">
          <strong>Example:</strong>
          <p>{content}</p>
        </div>
      );
    case "math":
      return <BlockMath math={content} />;
    case "tip":
      return (
        <div className="lesson-tip">
          <em>Tip: {content}</em>
        </div>
      );
    default:
      return <p>{content}</p>;
  }
}
