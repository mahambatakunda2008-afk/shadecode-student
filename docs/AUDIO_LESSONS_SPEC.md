# Audio Lessons — Spec & Design Record

**Date:** 2026-08-08
**Origin:** Direct owner request — a user asked for audio lessons. No existing blueprint spec covers this precisely; the closest reference is `SHADECODE PLATFORM BLUEPRINT/Volume II.docx` §14 "Voice" — a thin, aspirational bullet list (voice questions, voice search, speech-to-notes, pronunciation support, voice revision) about voice *input*, not audio narration of lesson content. This is a genuinely new design, informed by that section's spirit ("voice should reduce effort where appropriate") but not constrained by a detailed prior spec.

## Who this is actually for, and why that matters

Shadecode Student's real users are mobile-first, Android-first, Zimbabwe-based students on Cambridge/ZIMSEC curricula. Two things follow directly from that, and shaped every decision below:

1. **Mobile data costs real money to these students.** A feature that streams or downloads audio files by default, the way a Western SaaS product might default to, would cost users on every listen. The existing "Download lesson for offline access" button (already in `learn/[lessonId]/page.tsx` before this work) shows the product already takes this seriously — new audio features need to match that discipline, not ignore it.
2. **The product is a web app, not a native app.** Mobile browsers suspend background tabs on screen lock. Anything requiring the phone to be in a pocket with the screen off is not achievable here — see the platform limitation section below.

## What was actually searched before building

Per this session's Blueprint Reconciliation methodology: searched for existing audio/TTS/voice infrastructure before designing anything. Found zero — no `speechSynthesis` usage, no TTS provider wiring, no `.mp3`/audio file handling anywhere in `src`. This is genuinely new ground, not a wire-up of dormant infrastructure like the Retention Risk or Scheduling Engine work earlier this session.

One relevant, valuable finding: **both Cloudflare Workers AI and OpenAI — providers already integrated and billed in `src/lib/ai.ts` — offer TTS models.** Adding higher-quality cloud narration later would not require a new vendor relationship.

## Two-tier design

### Tier 1 — shipped this session

**Browser-native speech synthesis** (`window.speechSynthesis`, the Web Speech API), triggered by a "Listen" button in the lesson page's existing action bar.

- Zero data cost to the student — nothing is downloaded or streamed, the browser/OS synthesizes speech locally from text already on the page.
- Zero server cost, zero new vendor.
- Works today, no infrastructure changes needed.
- Real limitation: voice quality is more robotic than a cloud TTS service, and language/accent support depends on what voices the device/browser ships. Chrome on Android (the primary target platform per the product's own profile) has solid support.

**Read-along highlighting** was mocked up as a concept (see chat) but **not implemented this pass** — `SpeechSynthesis`'s word/sentence boundary events (`onboundary`) are unreliable across browsers for precise timing, and building a robust highlight-while-reading experience needs more cross-browser testing than this session's scope allows. Documented as a real next step, not silently dropped.

**Math-type blocks are not read verbatim.** Raw LaTeX/notation through TTS would be unintelligible. `src/lib/audio/narration.ts` substitutes an honest spoken cue ("Here's a formula, take a look at the screen for this one") instead, rather than either garbling the notation or fabricating a fake plain-English restatement of content it can't verify.

### Tier 2 — designed, deferred, not built

**Server-generated, cached cloud TTS** (Cloudflare Workers AI or OpenAI, both already integrated) for higher-quality narration, downloaded explicitly on the student's decision — matching the existing "Download for offline" pattern, ideally gated to Wi-Fi.

Deferred because it has two real, ongoing costs Tier 1 doesn't:
1. **Generation cost** — bounded and cheap if cached per-lesson (generate once, serve many times), not regenerated per listen. Real but manageable.
2. **Delivery cost to the student** — an actual audio file has to reach their device over their mobile data, unlike Tier 1's client-side synthesis. This is the one that matters most for this audience and is the reason Tier 2 isn't just "swap in a better TTS provider" without further product thought about consent/download-gating.

Not attempting this now would be premature relative to validating whether Tier 1 sees real usage first — the same reasoning already applied to deferring the Scheduling Engine's full wiring and the Knowledge Graph/Digital Twin blueprint gaps earlier this session.

## Voice commands — hands-free control while narration plays

The owner's follow-up request: "maybe users don't need to manually click the buttons... phone in pocket or bag... they should be able to request a lesson with their voice... or phone is in their hands but they don't want to stare at it."

### What's honestly achievable, and what isn't

**Achievable, and shipped:** voice commands ("next", "repeat", "pause", "explain", "resume", "previous") while the lesson page is open, the tab is in the foreground, and the screen is on. This genuinely serves "earbuds in, don't want to keep tapping the screen."

**Not achievable with a web app, and not attempted:** hands-free control with the phone in a pocket and the screen locked. Mobile browsers suspend JavaScript execution in background/inactive tabs — there is no way for a web page to keep listening once the screen locks or the app is backgrounded. This would require a native Android app with a foreground background service (a real Android permission model, continuously-running service), which is a materially different, larger engineering investment than this web app's architecture. Stating this plainly rather than shipping something that silently stops working the moment a student's screen locks and looks broken instead of honestly out of scope.

### The feedback-loop problem, and how it's solved

If narration plays through a phone's speaker (not headphones) while the microphone is also actively listening for commands, the microphone would pick up the app's own voice and could misfire as a command. Rather than accept this bug or try to unreliably auto-detect headphone use (no fully cross-browser way to do this via web APIs), the design **only listens for a command in the pause between narrated blocks, never while actively speaking**:

1. App speaks one lesson block (`src/lib/audio/narration.ts`'s script).
2. Once speech ends, the mic listens for ~4 seconds (`src/hooks/useLessonNarration.ts`).
3. If a command is recognized (`src/lib/audio/voiceCommands.ts`), act on it (skip, repeat, pause).
4. If nothing is heard, auto-continue to the next block.

This sidesteps the feedback loop by construction rather than patching around it.

## What shipped this session

- `src/lib/audio/narration.ts` — pure, tested (`buildNarrationScript`): converts lesson blocks into a spoken script, with honest substitutes for math content and spoken-context prefixes for tip/example blocks that would otherwise lose their visual label's meaning when heard rather than read.
- `src/lib/audio/voiceCommands.ts` — pure, tested (`matchVoiceCommand`): maps a raw speech transcript to one of a fixed command set, matching natural phrasing ("can you say that again", "hold on a second") not just exact keywords.
- `src/hooks/useLessonNarration.ts` — the browser-API orchestration (SpeechSynthesis + SpeechRecognition) around the tested pure logic above, following this session's established "extract pure logic, test that, keep the API-heavy wiring thin" pattern (same split as `src/lib/async/withTimeout.ts` + `NextActionDashboard.tsx`).
- A "Listen" button added to the existing lesson page action bar (`learn/[lessonId]/page.tsx`), matching the visual style of the existing Mark Complete / Test Yourself / Ask Tutor / Download buttons exactly rather than introducing a new visual pattern. Shows live status (idle / reading N of M / listening). A discoverability hint appears once narration starts, telling the student what they can say — learned directly from this session's earlier finding that the existing feedback feature went unused because nobody knew the entry point existed; a hidden voice-command feature would repeat that mistake.
- Graceful degradation: if `speechSynthesis` isn't supported at all, the Listen button doesn't render (no dead/broken button). If `SpeechSynthesis` works but `SpeechRecognition` doesn't (narrower browser support), the Listen button still works for playback — it just auto-advances through blocks on a timer instead of listening for a command, rather than the whole feature failing.

## What's deliberately not built this pass

- Read-along word/sentence highlighting (cross-browser `onboundary` reliability needs more testing than this session allows).
- Tier 2 cloud-generated cached audio (real ongoing cost, deferred pending Tier 1 usage validation).
- A wake-word / fully hands-free "phone in pocket" experience (not achievable in a web app — see platform limitation above; would need a native app).
- A settings toggle to disable the discoverability hint once a student has used the feature enough times to know it already (small UX polish, not essential for a first ship).

## Verification

`tsc --noEmit` clean. Full vitest suite: 71 passed (13 new tests across the two pure audio modules, on top of the 58 passing before this work). No component-test infrastructure exists in this repo for the hook/UI wiring itself (consistent with this session's established precedent — `withTimeout.ts` and the dashboard component were handled the same way): the testable logic is thoroughly tested, the thin browser-API layer is typecheck-verified.
