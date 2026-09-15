# Comp Lab Authoritative Assessment Boundary

## Status

The authoritative assessment API boundary is now present at `/api/comp-lab/assessment`.

It requires an authenticated learner and accepts only the exercise ID, learner artifact and supported language. Expected outputs and protected cases are resolved from server-side exercise definitions, not from client input.

## Important limitation

The current endpoint establishes the security boundary and returns `202 Accepted` with `pending-sandbox`. It does **not** claim that a browser or serverless JavaScript process is an authoritative compiler/sandbox.

A real authoritative runner must provide:

1. isolated execution;
2. CPU, memory, wall-clock and output limits;
3. protected test cases outside the browser bundle;
4. deterministic expected-output comparison;
5. attempt and exercise version identifiers;
6. runtime-failure vs learner-failure separation;
7. minimal result payloads to the client;
8. durable assessment evidence after successful execution.

## Practice vs authoritative

Practice can remain browser-first for fast feedback and offline use. Authoritative assessment is a separate trust boundary intended for graded attempts, certificates, school reporting and other high-stakes evidence.

Never present the current browser practice result as official board marking.
