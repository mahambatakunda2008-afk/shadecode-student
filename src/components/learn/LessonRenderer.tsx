"use client";

// ⚠️ NOT CURRENTLY MOUNTED: no page or component in src/app imports this
// component. Verified 2026-09-13 (`grep -rln "LessonRenderer" src --include="*.tsx"`
// outside this file returns nothing). See the note in MathRenderer.tsx.
import LessonBlock from "./LessonBlock";

interface Block {
  type: string;
  content: string;
}

interface Props {
  blocks: Block[];
}

export default function LessonRenderer({ blocks }: Props) {
  return (
    <div className="lesson-renderer">
      {blocks.map((block, i) => (
        <LessonBlock key={i} type={block.type} content={block.content} />
      ))}
    </div>
  );
}
