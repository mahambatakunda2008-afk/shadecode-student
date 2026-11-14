"use client";

import React from "react";

type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullet" | "number"; text: string; number?: string }
  | { type: "code"; text: string };

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let code: string[] = [];
  let inCode = false;
  const flush = () => {
    const text = paragraph.join(" ").trim();
    if (text) blocks.push({ type: "paragraph", text });
    paragraph = [];
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^\s*```/.test(line)) {
      flush();
      if (inCode) blocks.push({ type: "code", text: code.join("\n") });
      code = [];
      inCode = !inCode;
      continue;
    }
    if (inCode) { code.push(raw); continue; }
    if (!line.trim()) { flush(); continue; }
    const heading = line.match(/^\s{0,3}(#{1,4})\s+(.+)$/);
    if (heading) { flush(); blocks.push({ type: "heading", level: heading[1].length, text: heading[2] }); continue; }
    const bullet = line.match(/^\s*[-*•]\s+(.+)$/);
    if (bullet) { flush(); blocks.push({ type: "bullet", text: bullet[1] }); continue; }
    const numbered = line.match(/^\s*(\d{1,2})[.)]\s+(.+)$/);
    if (numbered) { flush(); blocks.push({ type: "number", number: numbered[1], text: numbered[2] }); continue; }
    paragraph.push(line.trim());
  }
  flush();
  if (inCode && code.length) blocks.push({ type: "code", text: code.join("\n") });
  return blocks;
}

function InlineText({ text }: { text: string }) {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return <>{tokens.map((token, index) => {
    if (token.startsWith("**") && token.endsWith("**")) return <strong key={index} className="font-bold text-[var(--foreground)]">{token.slice(2, -2)}</strong>;
    if (token.startsWith("`") && token.endsWith("`")) return <code key={index} className="rounded bg-[var(--muted)] px-1.5 py-0.5 font-mono text-[0.9em]">{token.slice(1, -1)}</code>;
    return <React.Fragment key={index}>{token}</React.Fragment>;
  })}</>;
}

export default function CortexResponse({ text, className = "" }: { text: string; className?: string }) {
  const blocks = parseBlocks(text);
  return <div className={`space-y-3 text-sm leading-7 text-[var(--muted-foreground)] ${className}`}>
    {blocks.map((block, index) => {
      if (block.type === "heading") {
        const Tag = block.level <= 2 ? "h4" : "h5";
        return <Tag key={index} className="pt-1 text-base font-bold leading-6 text-[var(--foreground)]"><InlineText text={block.text} /></Tag>;
      }
      if (block.type === "bullet" || block.type === "number") return <div key={index} className="flex gap-3 pl-1">
        <span className="shrink-0 font-bold text-[var(--primary)]">{block.type === "bullet" ? "•" : `${block.number}.`}</span>
        <p className="min-w-0 flex-1"><InlineText text={block.text} /></p>
      </div>;
      if (block.type === "code") return <pre key={index} className="overflow-x-auto rounded-xl bg-[var(--muted)] p-3 font-mono text-xs leading-6 text-[var(--foreground)]"><code>{block.text}</code></pre>;
      return <p key={index}><InlineText text={block.text} /></p>;
    })}
  </div>;
}
