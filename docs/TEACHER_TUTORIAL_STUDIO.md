# Teacher Tutorial Studio

## Goal
Give teachers one cross-platform authoring and review workflow for lessons that combine text, images, sketches, diagrams, graphs, tables, audio and video. This is a separate author-owned content system; it does not write directly into the learner-facing `lesson_library`.

## Content contract
A tutorial is an ordered array of versioned blocks. Each block has a stable `id`, a `type`, and type-specific fields. Initial supported types:

- `text`: rich plain text / Markdown-safe content
- `image`: private media asset, alt text, caption and optional credit
- `diagram` / `sketch`: image-backed visual with a descriptive caption
- `video`: provider (`youtube` or `drive`), validated provider ID or file ID, title, caption, optional transcript
- `audio`: provider-hosted or uploaded audio with transcript
- `graph`: structured axes, labels, ranges and plotted series, rendered natively
- `table`: structured headings and rows

Unknown block types must be rejected by server validation, not silently rendered. Media URLs are not trusted as arbitrary HTML or iframe markup.

## Workflow
`draft -> in_review -> verified -> published`

A reviewer may instead return `changes_requested` or `rejected`. A changed tutorial increments its version. A verified/published version is immutable; edits require a new draft/version. Reviews are tied to the exact version. Publication is an admin action and must not be conflated with review approval.

## Media and low-data rules
- Storage bucket `teacher-media` is private.
- Object paths are scoped to the uploader: `<auth-user-id>/<tutorial-id>/<random-file-id>.<ext>`.
- Upload allowlist and 50 MiB hard ceiling are enforced in storage and must also be enforced in the API.
- Signed read URLs are short-lived and issued only after authorization.
- YouTube/Drive embeds are click-to-load, never eager-load. Show provider, duration when known, captions/transcript availability and a data-use warning.
- No autoplay. Respect reduced motion and user data-saver preferences.
- Text, captions, transcripts and structured diagrams remain useful without video playback.

## Security and publication
- RLS separates author drafts from reviewer queues.
- Teacher/admin role checks are server-side; client-supplied role, owner, status or publication fields are never trusted.
- Reviews are append-only evidence for the exact tutorial version.
- Students must not read drafts or in-review assets through a public storage URL.
- The tutorial system must be integrated into the existing subject-access gate before student delivery.

## Implementation sequence
1. Schema, RLS and private bucket (this migration).
2. Server-side validation for block payloads and provider URLs.
3. Teacher draft CRUD API and editor shell.
4. Authenticated media upload + signed preview URLs.
5. Video provider parsers and click-to-play renderer.
6. Review queue, version-bound verdicts and admin publication.
7. Student delivery through subject access and offline caching for text/images.
8. E2E tests across desktop, narrow mobile and Android WebView.

## Important boundary
This migration intentionally does not modify `lesson_library`, publish any tutorial, or grant new roles. Applying it to production requires a separate reviewed deployment step.
