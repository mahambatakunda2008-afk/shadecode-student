# Exam Generation Incident - 2026-08-25

## Symptoms

Exam Simulation was reported as failing to generate exams.

## Root causes found in the generation path

1. **Client timeout was only 8 seconds.** The server AI gateway is a bounded multi-provider chain, so a legitimate generation could exceed the client timeout before the server completed.
2. **Generator input assumptions were too strict.** The server assumed `topics` was an array and numeric inputs were valid before normalizing them.
3. **Question validation was unnecessarily brittle.** A generated question could be valid while omitting the redundant `topic` field. Such a question was rejected even when the requested topic was explicit.
4. **Candidate generation was overly expensive.** The prompt requested too many candidates relative to the final paper size, increasing latency and increasing the chance that the provider returned incomplete JSON.

## Fixes

- Increased the client request budget to 50 seconds to match realistic AI fallback behavior.
- Normalized and validated subject, topics, difficulty and question count at the API boundary.
- Reduced candidate generation overhead while retaining spare candidates for quality filtering.
- Made a missing question-level topic inherit the explicit requested topic, while still rejecting genuine topic drift.
- Increased server AI budget and provider attempt budget appropriately.
- Preserved the quality gate. The system still refuses to return fabricated/generic questions when generation fails.
- Added an explicit empty-exam response guard on the client.
- Bumped exam cache namespace to avoid serving stale/broken generated payloads from the previous generator contract.

## Important limitation

The current environment cannot execute the production Vercel/Supabase/AI provider chain. These fixes should therefore be verified by CI and browser testing against the deployed environment before calling the incident closed.

## Required verification

- Generate 5, 10 and 20 question exams.
- Test easy, medium and hard.
- Test single topic and multiple topics.
- Test Maths, Physics, Chemistry and Computer Science.
- Test slow provider/fallback behavior.
- Confirm no 8-second client abort.
- Confirm invalid/empty AI output returns a useful error.
- Confirm valid generated exams are cached and reopen offline.
- Confirm existing cached exams can still be used when fresh generation is unavailable.
