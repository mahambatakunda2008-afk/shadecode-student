"use client";

import katex from "katex";
import "katex/dist/katex.min.css";

interface Props {
  content: string;
  block?: boolean;
}

export default function MathRenderer({ content, block = true }: Props) {
  let html: string | null = null;
  try {
    html = katex.renderToString(content, {
      throwOnError: false,
      displayMode: block,
    });
  } catch {
    html = null;
  }

  if (html === null) {
    return <span style={{ color: "red" }}>{content}</span>;
  }

  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
