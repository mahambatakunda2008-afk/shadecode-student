"use client";

import React from "react";
import katex from "katex";

function decodeNumericEntity(original: string, codePoint: number): string {
  return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
    ? String.fromCodePoint(codePoint)
    : original;
}

/** Normalize common provider-side Markdown/HTML escaping before parsing. */
export function normalizeCortexResponseText(source: string): string {
  // Protect LaTeX delimiters while repairing transport-escaped Markdown.
  const mathDelimiters: string[] = [];
  const protectedSource = source.replace(/\\+\(([\s\S]*?)\\+\)|\\+\[([\s\S]*?)\\+\]/g, (_match, roundBody: string | undefined, squareBody: string | undefined) => {
    const index = mathDelimiters.push(roundBody !== undefined ? "\\(" + roundBody + "\\)" : "\\[" + (squareBody ?? "") + "\\]") - 1;
    return "\\uE000" + index + "\\uE001";
  });
  return protectedSource
    .replace(/\r\n?/g, "\n")
    .replace(/&#x([0-9a-f]+);/gi, (entity: string, hex: string) => decodeNumericEntity(entity, parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (entity: string, decimal: string) => decodeNumericEntity(entity, parseInt(decimal, 10)))
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    // Remove up to three transport-escaping layers from Markdown punctuation.
    .replace(/\\([\\\`*_{}\[\]()#+.!|>~-])/g, "$1")
    .replace(/\\([\\\`*_{}\[\]()#+.!|>~-])/g, "$1")
    .replace(/\\([\\\`*_{}\[\]()#+.!|>~-])/g, "$1")
    .replace(/\\uE000(\d+)\\uE001/g, (_, index: string) => mathDelimiters[Number(index)] ?? "")
    .trim();
}
type ListItem = { text: string; checked?: boolean; children?: { ordered: boolean; items: ListItem[] }[] };

type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: ListItem[] }
  | { type: "quote"; text: string }
  | { type: "table"; rows: string[][] }
  | { type: "code"; text: string }
  | { type: "rule" };

function splitTableRow(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let mathDelimiter = "";
  let inCode = false;
  let escaped = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    const next = line[index + 1] ?? "";
    if (escaped) {
      cell += char === "|" ? "|" : "\\" + char;
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char.charCodeAt(0) === 96 && !mathDelimiter) {
      inCode = !inCode;
      cell += char;
      continue;
    }
    if (!inCode) {
      if (!mathDelimiter && char === "$") {
        mathDelimiter = next === "$" ? "$$" : "$";
        cell += char;
        continue;
      }
      if (!mathDelimiter && char === "\\" && (next === "(" || next === "[")) {
        mathDelimiter = next === "(" ? "\\(" : "\\[";
        cell += char;
        continue;
      }
      if (mathDelimiter) {
        const closing = mathDelimiter === "$$" ? line.startsWith("$$", index)
          : mathDelimiter === "$" ? char === "$"
          : line.startsWith(mathDelimiter === "\\(" ? "\\)" : "\\]", index);
        if (closing) {
          if (mathDelimiter === "$$") { cell += "$$"; index++; }
          else if (mathDelimiter === "\\(" || mathDelimiter === "\\[") {
            cell += mathDelimiter === "\\(" ? "\\)" : "\\]";
            index++;
          } else cell += char;
          mathDelimiter = "";
          continue;
        }
      }
      if (!mathDelimiter && char === "|") {
        cells.push(cell.trim());
        cell = "";
        continue;
      }
    }
    cell += char;
  }
  if (escaped) cell += "\\";
  cells.push(cell.trim());
  if (cells[0] === "") cells.shift();
  if (cells[cells.length - 1] === "") cells.pop();
  return cells;
}

function isTableDivider(line: string): boolean {
  const cells = splitTableRow(line);
  return cells.length > 1 && cells.every(cell => /^:?-{3,}:?$/.test(cell));
}

function listMarker(line: string): { indent: number; ordered: boolean; text: string; checked?: boolean } | null {
  const match = line.match(/^(\s*)(?:([-*+])|(\d{1,3})[.)])\s+(.+)$/);
  if (!match) return null;
  const task = match[4].match(/^\[([ xX])\]\s+(.+)$/);
  return { indent: match[1].length, ordered: Boolean(match[3]), text: task ? task[2] : match[4], checked: task ? task[1].toLowerCase() === "x" : undefined };
}

function parseListAt(lines: string[], start: number, indent: number): { block: { type: "list"; ordered: boolean; items: ListItem[] }; next: number } {
  const first = listMarker(lines[start])!;
  const items: ListItem[] = [];
  let index = start;
  while (index < lines.length) {
    const marker = listMarker(lines[index]);
    if (!marker || marker.indent < indent) break;
    if (marker.indent > indent) {
      if (items.length && marker.indent > indent) {
        const nested = parseListAt(lines, index, marker.indent);
        const parent = items[items.length - 1];
        parent.children = [...(parent.children || []), nested.block];
        index = nested.next;
        continue;
      }
      break;
    }
    if (marker.ordered !== first.ordered) break;
    const item: ListItem = { text: marker.text, checked: marker.checked };
    items.push(item);
    index++;
    while (index < lines.length) {
      const nextMarker = listMarker(lines[index]);
      if (nextMarker) {
        if (nextMarker.indent > indent) {
          const nested = parseListAt(lines, index, nextMarker.indent);
          item.children = [...(item.children || []), nested.block];
          index = nested.next;
          continue;
        }
        break;
      }
      const raw = lines[index];
      if (!raw.trim()) break;
      const leading = raw.match(/^\s*/)?.[0].length || 0;
      if (leading > indent && raw.trim()) {
        item.text += "\n" + raw.trim();
        index++;
        continue;
      }
      break;
    }
  }
  return { block: { type: "list", ordered: first.ordered, items }, next: index };
}

export function parseCortexResponseBlocks(source: string): Block[] {
  const lines = normalizeCortexResponseText(source).split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let code: string[] = [];
  let inCode = false;
  const flush = () => {
    const text = paragraph.join("\n").trim();
    if (text) blocks.push({ type: "paragraph", text });
    paragraph = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trimEnd();
    if (/^\s*\x60\x60\x60/.test(line)) {
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
    if (/^\s*>/.test(line)) {
      flush();
      const quoteLines = [line.replace(/^\s*>\s?/, "")];
      while (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (/^\s*>/.test(nextLine)) {
          quoteLines.push(nextLine.replace(/^\s*>\s?/, ""));
          i++;
          continue;
        }
        if (/^ {2,}\S/.test(nextLine)) {
          quoteLines.push(nextLine.trim());
          i++;
          continue;
        }
        break;
      }
      blocks.push({ type: "quote", text: quoteLines.join("\n") });
      continue;
    }

    const marker = listMarker(line);
    if (marker) {
      flush();
      const parsed = parseListAt(lines, i, marker.indent);
      blocks.push(parsed.block);
      i = parsed.next - 1;
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
      if (html) return displayMath
        ? <span key={index} className="my-3 block max-w-full overflow-x-auto overscroll-x-contain py-1 text-center" role="math" dangerouslySetInnerHTML={{ __html: html }} />
        : <span key={index} className="inline-block max-w-full align-middle" dangerouslySetInnerHTML={{ __html: html }} />;
      return <code key={index}>{expression}</code>;
    }
    const linkStart = token.startsWith("[") ? token.indexOf("](") : -1;
    const linkLabel = linkStart > 1 && token.endsWith(")") ? token.slice(1, linkStart) : "";
    const linkHref = linkStart > 1 && token.endsWith(")") ? token.slice(linkStart + 2, -1) : "";
    const safeLink = linkHref.startsWith("https://") || linkHref.startsWith("http://");
    if (linkLabel && safeLink && !linkHref.includes(" ")) return <a key={index} href={linkHref} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--primary)] underline decoration-[var(--primary)]/40 underline-offset-2 hover:decoration-[var(--primary)]">{linkLabel}</a>;
    if ((token.startsWith("**") && token.endsWith("**")) || (token.startsWith("__") && token.endsWith("__"))) return <strong key={index} className="font-bold text-[var(--foreground)]">{token.slice(2, -2)}</strong>;
    if ((token.startsWith("*") && token.endsWith("*")) || (token.startsWith("_") && token.endsWith("_"))) return <em key={index}>{token.slice(1, -1)}</em>;
    if (token.startsWith("~~") && token.endsWith("~~")) return <del key={index}>{token.slice(2, -2)}</del>;
    if (token.startsWith("`") && token.endsWith("`")) return <code key={index} className="rounded-md border border-[var(--card-border)] bg-[var(--muted)] px-1.5 py-0.5 font-mono text-[0.9em] text-[var(--foreground)]">{token.slice(1, -1)}</code>;
    return <React.Fragment key={index}>{token}</React.Fragment>;
  })}</>;
}


function ResponseList({ ordered, items, className = "" }: { ordered: boolean; items: ListItem[]; className?: string }) {
  const List = ordered ? "ol" : "ul";
  return <List className={`space-y-2 pl-6 marker:font-bold marker:text-[var(--primary)] ${ordered ? "list-decimal" : "list-disc"} ${className}`}>
    {items.map((item, index) => <li key={index} className="min-w-0 whitespace-pre-line ps-1 leading-7 [overflow-wrap:anywhere]">
      {item.checked !== undefined && <span aria-label={item.checked ? "Completed" : "Not completed"} className={`me-2 inline-flex h-4 w-4 translate-y-0.5 items-center justify-center rounded border text-[10px] leading-none ${item.checked ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--muted-foreground)]"}`}>{item.checked ? "✓" : ""}</span>}
      <InlineText text={item.text} />
      {item.children?.map((child, childIndex) => <ResponseList key={childIndex} ordered={child.ordered} items={child.items} className="mt-2" />)}
    </li>)}
  </List>;
}

export default function CortexResponse({ text, className = "" }: { text: string; className?: string }) {
  const blocks = parseCortexResponseBlocks(text || "");
  return <div className={`cortex-response min-w-0 space-y-4 text-[15px] leading-7 text-[var(--foreground)] [overflow-wrap:anywhere] ${className}`}>
    {blocks.map((block, index) => {
      if (block.type === "heading") {
        const Tag = block.level <= 2 ? "h4" : "h5";
        return <Tag key={index} className="pt-2 text-base font-bold leading-6 text-[var(--foreground)]"><InlineText text={block.text} /></Tag>;
      }
      if (block.type === "list") return <ResponseList key={index} ordered={block.ordered} items={block.items} />;
      if (block.type === "quote") return <blockquote key={index} className="whitespace-pre-wrap border-s-[3px] border-[var(--primary)] bg-[var(--muted)]/70 px-4 py-3 text-[var(--muted-foreground)]"><InlineText text={block.text} /></blockquote>;
      if (block.type === "table") return <div key={index} className="w-full max-w-full overflow-x-auto overscroll-x-contain rounded-xl border border-[var(--card-border)]" role="region" aria-label="Scrollable response table" tabIndex={0}><table className="w-full min-w-[420px] table-auto border-collapse text-left text-sm"><thead className="bg-[var(--muted)]"><tr>{block.rows[0]?.map((cell, cellIndex) => <th key={cellIndex} className="max-w-[min(70vw,24rem)] whitespace-normal break-words border-b border-[var(--card-border)] px-3 py-2.5 font-bold text-[var(--foreground)] [overflow-wrap:anywhere]"><InlineText text={cell} /></th>)}</tr></thead><tbody>{block.rows.slice(1).map((row, rowIndex) => <tr key={rowIndex} className="even:bg-[var(--muted)]/50">{row.map((cell, cellIndex) => <td key={cellIndex} className="max-w-[min(70vw,24rem)] whitespace-normal break-words border-b border-[var(--card-border)] px-3 py-2.5 align-top last:border-0 [overflow-wrap:anywhere]"><InlineText text={cell} /></td>)}</tr>)}</tbody></table></div>;
      if (block.type === "code") return <pre key={index} className="max-w-full overflow-x-auto rounded-xl border border-[var(--card-border)] bg-[var(--muted)] p-4 font-mono text-xs leading-6 text-[var(--foreground)] [tab-size:2]"><code>{block.text}</code></pre>;
      if (block.type === "rule") return <hr key={index} className="border-[var(--card-border)]" />;
      return <p key={index} className="whitespace-pre-line leading-7"><InlineText text={block.text} /></p>;
    })}
  </div>;
}
