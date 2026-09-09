"use client";

import { BookOpen, Sparkles } from "lucide-react";

interface PartialLessonPreviewProps {
  text: string;
  subject: string;
  prompt: string;
}

function cleanMarkdown(value: string) {
  return value
    .replace(/```(?:markdown|md)?/gi, "")
    .replace(/```/g, "")
    .replace(/^\s*(?:assistant|cortex)\s*:\s*/i, "")
    .trim();
}

function splitSections(text: string) {
  const normalized = cleanMarkdown(text);
  if (!normalized) return [];
  return normalized
    .split(/\n(?=##?\s+|###\s+|\d+[.)]\s+|\*\*[^*]+\*\*\s*$)/g)
    .map(section => section.trim())
    .filter(Boolean)
    .map((section, index) => {
      const heading = section.match(/^#{1,3}\s+(.+)\n?([\s\S]*)$/);
      const numbered = section.match(/^\d+[.)]\s+([^\n]+)\n?([\s\S]*)$/);
      const bold = section.match(/^\*\*([^*]+)\*\*\s*\n?([\s\S]*)$/);
      const title = heading?.[1]?.trim() || numbered?.[1]?.trim() || bold?.[1]?.trim();
      const content = (heading?.[2] ?? numbered?.[2] ?? bold?.[2] ?? section).trim();
      return { title: title || (index === 0 ? "Lesson in progress" : `Part ${index + 1}`), content };
    })
    .filter(section => section.content.length > 0);
}

function renderContent(content: string) {
  return content.split("\n").map((line, index) => {
    const value = line.trim();
    if (!value) return <div key={index} className="h-2" />;
    if (/^[-*]\s+/.test(value)) return <li key={index} className="ml-5 list-disc text-sm leading-6">{value.replace(/^[-*]\s+/, "")}</li>;
    return <p key={index} className="text-sm leading-6 text-[var(--muted-foreground)]">{value}</p>;
  });
}

export default function PartialLessonPreview({ text, subject, prompt }: PartialLessonPreviewProps) {
  const sections = splitSections(text);
  if (!text.trim()) return null;

  return (
    <section className="overflow-hidden rounded-3xl border border-[var(--primary)]/20 bg-[var(--card)] shadow-sm" aria-label="Cortex lesson preview" aria-live="polite">
      <div className="border-b border-[var(--card-border)] bg-[var(--primary-glow)] px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--primary)]">
          <Sparkles className="h-3.5 w-3.5" /> Cortex is writing
        </div>
        <h2 className="mt-1 text-lg font-black">{sections[0]?.title || prompt}</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">{subject} · Live preview</p>
      </div>
      <div className="space-y-5 px-5 py-5 sm:px-6">
        {sections.map((section, index) => (
          <article key={`${section.title}-${index}`} className="space-y-2">
            {index > 0 && <h3 className="text-base font-bold">{section.title}</h3>}
            <div>{renderContent(section.content)}</div>
          </article>
        ))}
        <div className="flex items-center gap-2 border-t border-[var(--card-border)] pt-4 text-sm font-medium text-[var(--muted-foreground)]">
          <BookOpen className="h-4 w-4 text-[var(--primary)]" /> More of the lesson is being generated locally on this device.
        </div>
      </div>
    </section>
  );
}
