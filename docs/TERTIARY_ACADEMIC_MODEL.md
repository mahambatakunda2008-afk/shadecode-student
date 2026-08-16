# Tertiary Academic Model

Status: discovery/specification corrected after live-code/database audit
Date: 2026-08-16

## Important correction

The first version of this document incorrectly stated that there was no persisted academic-context source of truth. A live Supabase audit found that `public.academic_contexts` already exists, is currently empty, has `user_id` as its primary key, and has RLS policies restricting reads/writes to the authenticated owner.

The repository also already contains `src/app/api/academic-context/route.ts`, which authenticates with the Supabase server client and reads/upserts that table, plus `src/lib/curriculum/types.ts` and `src/lib/academic/postSecondary.ts` for the TypeScript vocabulary and helper logic.

Therefore the tertiary gap is **integration and model depth**, not creation of a second academic-context table.

## Existing source of truth

`academic_contexts` currently contains:

- `user_id`
- `pathway`
- `institution`
- `programme`
- `year_level`
- `semester`
- `courses text[]`
- `created_at`
- `updated_at`

The primary key is `user_id`, so the current design intentionally supports one active context per learner.

Current RLS policies are owner-scoped for SELECT, INSERT, UPDATE and DELETE.

Current API behavior:

- `GET /api/academic-context` returns the authenticated user's context.
- `PATCH /api/academic-context` upserts the authenticated user's context.
- Current API pathways are `university` and `tvet`.
- Courses are currently stored as a string array, not normalized course entities.

## Canonical hierarchy

```text
Pathway
  ├── secondary → board → qualification/level → subject → topic
  └── post-secondary
       ├── university
       └── TVET / polytechnic
            └── institution
                 └── programme / qualification
                      └── academic period
                           └── course / module
                                ├── topics
                                ├── materials
                                └── assessments
```

The existing `AcademicContext` / `AcademicCourse` / `AcademicAssessment` / `CourseMaterial` types are the correct vocabulary to extend rather than inventing parallel concepts.

## Remaining tertiary gaps

### P0: product integration

- Tertiary learners are not yet routed through a dedicated onboarding branch.
- The existing academic-context API is not enough by itself to make university/polytechnic learning a first-class user experience.
- `courses text[]` cannot represent course codes, credits, topics, materials or assessment structure.

### P1: normalized academic entities

Only after confirming the current consumers of `academic_contexts`, introduce normalized child entities where needed:

- academic periods
- courses/modules
- course topics
- assessments/coursework
- course materials
- optional results/credits

Do not create a replacement `academic_contexts` table.

### P1: Cortex integration

Cortex should consume verified context including:

- pathway
- institution
- programme
- year level
- academic period
- active courses
- upcoming assessments
- mastery evidence

Cortex must not invent any of these values.

### P1: Mission Control integration

Coursework and assessment deadlines should become scheduling inputs alongside existing tasks and exams.

### P2: academic results

After assessment data exists:

- weighted course results
- credit-aware progress
- GPA/average calculations where the institution's grading scheme is known
- academic-risk signals

Never assume a universal GPA scale.

## Compatibility rules

Keep existing secondary systems intact:

- `profiles`
- `subjects`
- `study_topics`
- `exams`
- `topic_mastery`
- `src/lib/curriculum/*`

Post-secondary records should feed the existing learning/mast​​ery/Cortex infrastructure instead of creating a second learning intelligence stack.

## Onboarding target

1. Choose pathway.
2. Secondary learners continue through the existing board/level/subject flow.
3. University/TVET learners provide institution, programme, year/level and academic period.
4. Add courses/modules.
5. Optionally add assessments/deadlines.
6. Confirm study goals.

Institution and programme should remain free-form initially. A curated institution catalogue can follow real usage.

## Implementation boundary

### T1: integrate existing context

- Audit all current reads/writes of `academic_contexts`.
- Add onboarding pathway selection.
- Connect existing context API to the student experience.
- Preserve secondary onboarding.

### T2: normalize courses

- Replace the course string array only after consumers are mapped.
- Preserve backwards compatibility during migration.
- Add RLS and ownership to every child entity.

### T3: assessments and workload

- Add assignment/coursework/practical/lab/project tracking.
- Feed due dates into Mission Control.

### T4: Cortex

- Include academic context in behavior summaries and planning.
- Use only stored/evidenced academic facts.

### T5: results

- Add institution-aware grading models before GPA calculations.

## Non-goals

Do not make these prerequisites:

- university LMS integrations
- institution-specific APIs
- portal scraping
- marketplace/community systems
- P2P exchange
- digital twin
- multi-agent architecture

## Acceptance criteria

Tertiary support is considered product-ready when:

- a university student can onboard without selecting a school exam board;
- a polytechnic/TVET student can onboard without pretending every course is a school subject;
- their existing `academic_contexts` record becomes the root of their tertiary academic state;
- courses/modules support real academic workload rather than only names;
- assessments can be tracked and scheduled;
- Cortex can use academic context without fabrication;
- mastery remains a single shared intelligence system;
- RLS keeps academic data isolated per learner.
