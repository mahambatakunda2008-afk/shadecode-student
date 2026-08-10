"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Transitional integration bridge for dashboard → Learn context.
 *
 * LearnPageClient owns its controlled form state, so this bridge applies URL
 * context through the same native input/change events a user would produce.
 * It is intentionally isolated so the eventual Learn form-state refactor can
 * replace it without changing dashboard navigation.
 */
export default function LearnPrefillBridge() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const subject = searchParams.get("subject")?.trim();
    const topic = searchParams.get("topic")?.trim();
    if (!subject && !topic) return;

    const apply = () => {
      const select = document.querySelector<HTMLSelectElement>("select");
      const input = document.querySelector<HTMLInputElement>("input.topic-input, input[placeholder*='topic' i]");

      if (select && subject) {
        const optionExists = Array.from(select.options).some((option) => option.value === subject);
        if (optionExists && select.value !== subject) {
          const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
          setter?.call(select, subject);
          select.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }

      if (input && topic && input.value !== topic) {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        setter?.call(input, topic);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }

      return Boolean((!subject || select?.value === subject) && (!topic || input?.value === topic));
    };

    if (apply()) return;
    const observer = new MutationObserver(() => {
      if (apply()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const timeout = window.setTimeout(() => observer.disconnect(), 5000);
    return () => {
      observer.disconnect();
      window.clearTimeout(timeout);
    };
  }, [searchParams]);

  return null;
}
