# Hackathon Learn Repair

## Goal

Make Learn prompt-first, context-prefilled, and materially better at producing usable lessons for the WebMCP demonstration.

## Current verified problems

- Learn currently requires a separate subject selector and topic field before generation.
- The lesson API prompt only receives `subject`, `topic`, and `difficulty`; it does not incorporate the student's broader learning context.
- The lesson contract is only `title + blocks`, with a minimum of generic text/example/math/tip blocks. It does not require objectives, prerequisite checks, worked reasoning, checkpoints, practice, feedback, or a next action.
- The route uses a repair pass for malformed JSON, but repairing shape does not improve pedagogical quality.
- Course generation already has a richer lesson shape, but its prompt is still a compact generic curriculum request.

## Target interaction

The primary Learn interaction is a prompt-first command surface. A student can write a natural request such as:

> I have Physics tomorrow and 45 minutes. Teach me deformation of solids, then test me.

The system should resolve known context automatically, ask only for genuinely missing information, generate a structured lesson, and make the resulting lesson actionable.

## Lesson contract

Generated lessons should contain, where applicable:

- title
- subject
- topic
- level
- difficulty
- estimated minutes
- learning objectives
- prerequisite concepts
- diagnostic/checkpoint question
- explanation sections
- worked example with reasoning
- misconception/trap notes
- guided practice
- independent practice
- answers or feedback guidance
- exam/application tip
- recap
- next action

The generator must not invent curriculum alignment. When curriculum evidence is unavailable, it should explicitly stay topic-focused rather than fabricate syllabus claims.

## WebMCP relevance

The lesson flow is a primary candidate for the WebMCP demo because a natural-language request can resolve into application capabilities rather than stopping at generated text. The intended path is:

`student prompt -> context resolution -> Cortex intent -> WebMCP capability selection -> lesson generation -> study action -> evidence/progress`

## Submission rule

Do not submit until this path is demonstrably working end-to-end in the deployed app and the hackathon-specific WebMCP contribution is clearly documented.
