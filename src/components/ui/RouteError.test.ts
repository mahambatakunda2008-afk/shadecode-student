import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import RouteError from "./RouteError";

const render = (digest?: string, fullPage = false) =>
  renderToStaticMarkup(
    createElement(RouteError, { error: Object.assign(new Error("secret stack detail"), { digest }), reset: () => {}, boundary: "test", fullPage }),
  );

describe("RouteError", () => {
  it("announces itself as an alert with both recovery actions", () => {
    const html = render();
    expect(html).toContain('role="alert"');
    expect(html).toContain("Try again");
    expect(html).toContain('href="/dashboard"');
  });
  it("never leaks the raw error message to students", () => {
    expect(render("abc123")).not.toContain("secret stack detail");
  });
  it("shows the support reference only when a digest exists", () => {
    expect(render("abc123")).toContain("Reference: abc123");
    expect(render()).not.toContain("Reference:");
  });
  it("uses design tokens, not hard-coded light-on-light colours", () => {
    const html = render();
    expect(html).not.toMatch(/text-slate-100|bg-white\/10/);
    expect(html).toContain("var(--foreground)");
  });
  it("only claims the full viewport when it replaces the whole app", () => {
    expect(render(undefined, true)).toContain("min-h-screen");
    expect(render(undefined, false)).not.toContain("min-h-screen");
  });
});
