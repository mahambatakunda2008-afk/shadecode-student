"use client";

import React from "react";
import katex from "katex";

type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; text: string }
  | { type: "table"; rows: string[][] }
  | { type: "code"; text: string }
  | { type: "rule" };

function splitTableRow(line: string): string[] {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(cell => cell.trim());
}

function isTableDivider(line: string): boolean {
  const cells = splitTableRow(line);
  return cells.length > 1 && cells.every(cell => /^:?-{3,}:?$/.test(cell));
}

export function parseCortexResponseBlocks(source: string): Block[] {
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

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
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

    if (i + 1 < lines.length && line.includes("|") && isTableDivider(lines[i + 1])) {
      flush();
      const rows = [splitTableRow(line)];
      i += 2;
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
        rows.push(splitTableRow(lines[i]));
        i++;
      }
      i--;
      blocks.push({ type: "table", rows });
      continue;
    }

    const heading = line.match(/^\s{0,3}(#{1,4})\s+(.+)$/);
    if (heading) { flush(); blocks.push({ type: "heading", level: heading[1].length, text: heading[2] }); continue; }
    if (/^\s*(---+|\*\*\*|___+)\s*$/.test(line)) { flush(); blocks.push({ type: "rule" }); continue; }
    if (/^\s*>/.test(line)) { flush(); blocks.push({ type: "quote", text: line.replace(/^\s*>\s?/, "") }); continue; }

    const bullet = line.match(/^\s*[-*+]\s+(.+)$/);
    const numbered = line.match(/^\s*(\d{1,3})[.)]\s+(.+)$/);
    if (bullet || numbered) {
      flush();
      const ordered = !!numbered;
      const items = [bullet?.[1] || numbered?.[2] || ""];
      while (i + 1 < lines.length) {
        const next = lines[i + 1];
        const match = ordered ? next.match(/^\s*\d{1,3}[.)]\s+(.+)$/) : next.match(/^\s*[-*+]\s+(.+)$/);
        if (!match) break;
        items.push(match[1]);
        i++;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }
    paragraph.push(line.trim());
  }
  flush();
  if (inCode && code.length) blocks.push({ type: "code", text: code.join("\n") });
  return blocks;
}

function renderMath(expression: string, display: boolean) {
  try {
    return katex.renderToString(expression, {
      displayMode: display,
      throwOnError: false,
      strict: "ignore",
      trust: false,
      output: "html",
    });
  } catch {
    return null;
  }
}

function InlineText({ text }: { text: string }) {
  const pattern = /(\$\$[\s\S]+?\$\$|\$[^\n$]+\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\]|\[[^\]]+\]\(https?:\/\/[^\s)]+\)|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|~~[^~]+~~|`[^`]+`)/g;
  const tokens = text.split(pattern).filter(Boolean);
  return <>{tokens.map((token, index) => {
    const displayMath = token.startsWith("$$") && token.endsWith("$$") || token.startsWith("\\[") && token.endsWith("\\]");
    const inlineMath = token.startsWith("$") && token.endsWith("$") || token.startsWith("\\(") && token.endsWith("\\)");
    if (displayMath || inlineMath) {
      const expression = displayMath ? token.slice(2, -2) : token.startsWith("$") ? token.slice(1, -1) : token.slice(2, -2);
      const html = renderMath(expression, displayMath);
      if (html) return <span key={index} className={displayMath ? "my-3 block overflow-x-auto text-center" : "inline-block max-w-full align-middle"} dangerouslySetInnerHTML={{ __html: html }} />;
      return <code key={index}>{expression}</code>;
    }
    const linkStart = token.startsWith("[") ? token.indexOf("](") : -1;
    const linkLabel = linkStart > 1 && token.endsWith(")") ? token.slice(1, linkStart) : "";
    const linkHref = linkStart > 1 && token.endsWith(")") ? token.slice(linkStart + 2, -1) : "";
    const safeLink = linkHref.startsWith("https://") || linkHref.startsWith("http://");
    if (linkLabel && safeLink && !/\\s/.test(linkHref)) return <a key={index} href={linkHref} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--primary)] underline decoration-[var(--primary)]/40 underline-offset-2 hover:decoration-[var(--primary)]">{linkLabel}</a>;
    if ((token.startsWith("**") && token.endsWith("**")) || (token.startsWith("__") && token.endsWith("__"))) return <strong key={index} className="font-bold text-[var(--foreground)]">{token.slice(2, -2)}</strong>;
    if ((token.startsWith("*") && token.endsWith("*")) || (token.startsWith("_") && token.endsWith("_"))) return <em key={index}>{token.slice(1, -1)}</em>;
    if (token.startsWith("~~") && token.endsWith("~~")) return <del key={index}>{token.slice(2, -2)}</del>;
    if (token.startsWith("`") && token.endsWith("`")) return <code key={index} className="rounded-md border border-[var(--card-border)] bg-[var(--muted)] px-1.5 py-0.5 font-mono text-[0.9em] text-[var(--foreground)]">{token.slice(1, -1)}</code>;
    return <React.Fragment key={index}>{token}</React.Fragment>;
  })}</>;
}

export default function CortexResponse({ text, className = "" }: { text: string; className?: string }) {
  const blocks = parseCortexResponseBlocks(text || "");
  return <div className={`cortex-response min-w-0 space-y-4 text-[15px] leading-7 text-[var(--foreground)] [overflow-wrap:anywhere] ${className}`}>
    {blocks.map((block, index) => {
      if (block.type === "heading") {
        const Tag = block.level <= 2 ? "h4" : "h5";
        return <Tag key={index} className="pt-2 text-base font-bold leading-6 text-[var(--foreground)]"><InlineText text={block.text} /></Tag>;
      }
      if (block.type === "list") {
        const List = block.ordered ? "ol" : "ul";
        return <List key={index} className={`space-y-2.5 pl-6 marker:font-bold marker:text-[var(--primary)] ${block.ordered ? "list-decimal" : "list-disc"}`}>
          {block.items.map((item, itemIndex) => <li key={itemIndex} className="ps-1 leading-7"><InlineText text={item} /></li>)}
        </List>;
      }
      if (block.type === "quote") return <blockquote key={index} className="border-s-[3px] border-[var(--primary)] bg-[var(--muted)]/70 px-4 py-3 text-[var(--muted-foreground)]"><InlineText text={block.text} /></blockquote>;
      if (block.type === "table") return <div key={index} className="max-w-full overflow-x-auto rounded-xl border border-[var(--card-border)]"><table className="w-full min-w-[420px] border-collapse text-left text-sm"><thead className="bg-[var(--muted)]"><tr>{block.rows[0]?.map((cell, cellIndex) => <th key={cellIndex} className="border-b border-[var(--card-border)] px-3 py-2.5 font-bold text-[var(--foreground)]"><InlineText text={cell} /></th>)}</tr></thead><tbody>{block.rows.slice(1).map((row, rowIndex) => <tr key={rowIndex} className="even:bg-[var(--muted)]/50">{row.map((cell, cellIndex) => <td key={cellIndex} className="border-b border-[var(--card-border)] px-3 py-2.5 align-top last:border-0"><InlineText text={cell} /></td>)}</tr>)}</tbody></table></div>;
      if (block.type === "code") return <pre key={index} className="max-w-full overflow-x-auto rounded-xl border border-[var(--card-border)] bg-[var(--muted)] p-4 font-mono text-xs leading-6 text-[var(--foreground)]"><code>{block.text}</code></pre>;
      if (block.type === "rule") return <hr key={index} className="border-[var(--card-border)]" />;
      return <p key={index} className="whitespace-pre-wrap leading-7"><InlineText text={block.text} /></p>;
    })}
  </div>;
}
