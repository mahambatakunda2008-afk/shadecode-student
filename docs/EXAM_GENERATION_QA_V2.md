# Exam Generation QA v2

Exam Simulation must fail safely and diagnose failures rather than display a generic generation error.

## Request lifecycle

```text
request
  -> validate
  -> normalize
  -> select syllabus/context
  -> build blueprint
  -> generate candidates
  -> parse/schema validate
  -> semantic quality gate
  -> independent solve/check
  -> deduplicate
  -> assemble paper
  -> persist/cache
  -> return
```

## Failure classes

Every failure should map to a user-safe error code and an internal diagnostic:

- INVALID_REQUEST
- UNSUPPORTED_SUBJECT
- MISSING_CURRICULUM
- PROVIDER_TIMEOUT
- PROVIDER_UNAVAILABLE
- PROVIDER_RATE_LIMIT
- PARSE_FAILURE
- INSUFFICIENT_QUALITY
- INSUFFICIENT_COVERAGE
- VERIFICATION_FAILURE
- PERSISTENCE_FAILURE
- UNKNOWN

Never expose provider secrets, raw prompts, or internal stack traces to students.

## Recovery strategy

1. Retry only transient provider failures with bounded exponential backoff.
2. Do not retry malformed model output indefinitely.
3. If one candidate fails validation, replace the candidate rather than restarting the entire paper where possible.
4. If a complete paper cannot be verified, do not present it as an exam.
5. If a cached verified paper exists and the request permits reuse, offer it explicitly as a fallback.
6. Preserve the user's selected subject/topic/difficulty/length when retrying.

## Quality telemetry

Record non-sensitive diagnostics:

- generation duration;
- provider/model class;
- candidates requested/generated/accepted/rejected;
- rejection reasons;
- verification status;
- final question count;
- paper marks;
- cache hit/miss.

## Browser acceptance matrix

For each supported subject:

- generate 5-question paper;
- generate 10-question paper;
- generate 20-question paper;
- each difficulty;
- single topic;
- multiple topics;
- slow network;
- offline with cached paper;
- retry after provider failure;
- complete and mark paper.

## Quality rules

A successful HTTP response is not sufficient. The UI should only show a generated paper after the backend has established that:

- required question count exists;
- questions are parseable;
- questions match the requested subject/topics;
- marks are valid;
- answers/mark schemes are internally consistent;
- duplicate questions are removed;
- required diagrams validate;
- verification has passed or the paper is explicitly marked as unverified draft.

Production Exam Simulation should never silently downgrade from a failed generation to fabricated placeholder questions.
