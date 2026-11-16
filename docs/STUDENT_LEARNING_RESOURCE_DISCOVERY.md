# Student Learning Resource Discovery

## What this adds

The Student Client now has a dedicated `/learn/resources` discovery surface. It combines:
- Published, reviewed Shadecode educator tutorials already available to the learner's enrolled subjects.
- Subject-validated YouTube search, with topic and optional level/syllabus context included in the search query.
- A targeted YouTube search fallback when the server-side YouTube Data API key is not configured or the API is temporarily unavailable.

## Security and data handling

- The API requires an authenticated learner.
- The selected subject is resolved through `resolveLearnerSubject`; a client cannot search another learner's subject by forging a subject name.
- YouTube API credentials are read only on the server from `YOUTUBE_DATA_API_KEY`; the key is never sent to the browser.
- Search input is bounded and control characters are stripped.
- Video results are external links and click-to-open. The page does not autoplay or eagerly embed videos.
- The page keeps published Shadecode tutorials behind the existing subject-access rules.

## Configuration

Set `YOUTUBE_DATA_API_KEY` as a server-side environment variable in the deployment environment to enable live YouTube Data API results. Enable YouTube Data API v3 for the Google Cloud project that owns the key and restrict the key to the YouTube Data API. Apply quota limits/monitoring. Do not use a browser-exposed `NEXT_PUBLIC_` key.

Without the key, students still receive a pre-filled YouTube search link constructed from their verified subject plus the requested topic and level. This fallback is deliberately explicit: it does not pretend that live results have been curated or verified.

## Next quality milestone

Live search relevance is not the same as educational quality. The next iteration should add:
1. Syllabus/topic identifiers from the learner's active curriculum profile, not only free-text labels.
2. Curated/teacher-endorsed external resources with reviewer notes and last-checked timestamps.
3. Resource usefulness feedback and student save/collection actions.
4. Captions/transcript availability, language, duration, creator and content-quality signals.
5. Resource recommendations informed by Cortex mastery gaps, without replacing the learner's choice.
