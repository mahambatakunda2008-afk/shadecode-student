"use client";

import katex from "katex";
import "katex/dist/katex.min.css";

interface Props {
  content: string;
  block?: boolean;
}

export default function MathRenderer({ content, block = true }: Props) {
  try {
    const html = katex.renderToString(content, {
      throwOnError: false,
      displayMode: block,
    });

    return (
      <span
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch (err) {
    return <span style={{ color: "red" }}>{content}</span>;
  }
}
