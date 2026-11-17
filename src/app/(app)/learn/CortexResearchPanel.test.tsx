import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import CortexResearchPanel from "./CortexResearchPanel";

describe("Cortex Learn research panel", () => {
  it("keeps online research opt-in and disabled by default", () => {
    const html = renderToStaticMarkup(
      <CortexResearchPanel
        subject="Physics"
        topic="Waves"
        onTopicChange={() => undefined}
        token="session-token"
        userId="00000000-0000-4000-8000-000000000001"
        offline={false}
      />,
    );

    expect(html).toContain('aria-label="Enable online research for this Cortex question"');
    expect(html).not.toContain('aria-label="Enable online research for this Cortex question" checked');
    expect(html).toContain("Research with the open web");
    expect(html).toContain("Subject: Physics");
  });

  it("does not allow a request without an authenticated session or selected subject", () => {
    const withoutSession = renderToStaticMarkup(
      <CortexResearchPanel
        subject="Physics"
        topic="Waves"
        onTopicChange={() => undefined}
        token={null}
        userId={null}
        offline={false}
      />,
    );
    const withoutSubject = renderToStaticMarkup(
      <CortexResearchPanel
        subject=""
        topic="Waves"
        onTopicChange={() => undefined}
        token="session-token"
        userId="00000000-0000-4000-8000-000000000001"
        offline={false}
      />,
    );

    expect(withoutSession).toContain("disabled");
    expect(withoutSubject).toContain("Choose a subject above");
    expect(withoutSubject).toContain("disabled");
  });

  it("explains that offline research falls back to local tutoring", () => {
    const html = renderToStaticMarkup(
      <CortexResearchPanel
        subject="Physics"
        topic="Waves"
        onTopicChange={() => undefined}
        token={null}
        userId={null}
        offline
      />,
    );

    expect(html).toContain("Offline: Cortex will answer locally and skip web research.");
    expect(html).not.toMatch(/<button[^>]*disabled/);
  });
});
