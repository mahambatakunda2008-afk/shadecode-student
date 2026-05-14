"use client";

import LessonRenderer from "@/components/learn/LessonRenderer";

interface Block {
  type: string;
  title: string;
  content: string;
}

export default function LessonRenderer({
  blocks,
}: {
  blocks: Block[];
}) {
  if (!blocks || blocks.length === 0) {
    return (
      <div style={{ opacity: 0.6, fontSize: "14px" }}>
        No lesson content available.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {blocks.map((block, i) => (
        <LessonBlock
          key={i}
          type={block.type as any}
          title={block.title}
          content={block.content}
        />
      ))}
    </div>
  );
}
