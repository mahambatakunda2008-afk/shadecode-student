# Demo runbook (27 Nov 2026 showcase)

Audience: parents, the Minister, teachers, the principal, the director, students.
Goal: nothing on the demo path depends on one provider being healthy that day.

## How a lesson is produced (in order, each lane falls through to the next)
1. **Authored / verified curriculum**: instant, no AI. Used first when offline or signed out.
2. **Cloud AI**: Gemini, then Groq (`openai/gpt-oss-120b`, `openai/gpt-oss-20b`), then OpenRouter / Cloudflare / OpenAI if keyed. Section by section, each section gated by quality rules and retried up to 3 times.
3. **Shared library** (`lesson_library`): lessons generated for any learner. Strict match (60% of the requested words must appear in the lesson title/topic). A wrong lesson is never shown in place of an honest error.
4. **On-device AI**: warm local model only; never starts a hidden model download during an outage.
5. **Device cache**: lessons already opened or downloaded stay available offline, scoped to the signed-in account.

## T-48h
- [ ] Vercel: latest `main` deployed and Ready (the Hobby plan caps deployments per rolling 24h; do not push to main on the day).
- [ ] Vercel env: `GEMINI_API_KEY`, `GROQ_API_KEY` set. Optional: `OPENROUTER_API_KEY`. Delete `AI_GATEWAY_API_KEY` unless a card is on file (it fails with 403 on every request and wastes seconds).
- [ ] Rotate any token pasted into chats (GitHub PAT, Groq key).
- [ ] Sign in as the demo account on the demo device and generate each demo lesson **once**, off-peak. Open each lesson fully. Confirm it shows "Ready to study" and a 16+ section outline.
- [ ] Download the demo lessons for offline use on the demo device.

## T-2h
- [ ] Open every demo lesson on the demo device with Wi-Fi **off**. Confirm it still opens.
- [ ] Run one flashcard set and one quiz end to end.
- [ ] Run the Exam Simulation once; confirm it completes and shows results.
- [ ] Keep a phone hotspot ready as a second network.

## Live-demo script (suggested order, 8-10 minutes)
1. Dashboard (calm, one screen).
2. Open a **pre-generated** Physics lesson; scroll to show the stage labels (The big picture, How it works, Put it together, Go deeper).
3. Flashcards, then a short quiz.
4. Exam Simulation (short paper).
5. Only then, if time: generate a **new** topic live. Treat as a bonus, not the main act. If it is slow, say "it builds section by section and saves as it goes" and return to a saved lesson.

## If something fails on stage
| Symptom | Do this |
|---|---|
| "Cortex is building..." takes > 90s | Switch to a saved lesson; the build continues in the background |
| Provider error banner | Normal fallback is automatic; open the saved lesson instead |
| No internet | Open downloaded lessons; offline is a feature, say so |
| Anything unexpected | Reload once; do not retry generation repeatedly |

## Known limits (be honest if asked)
- Live AI generation depends on external providers; Gemini returns 503 "high demand" at peak.
- Shared-library coverage is strong for Physics, thin for Maths, Biology and Computer Science: generate those demo lessons ahead of time.
