"use client";

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
