# Tertiary Academic Model

Status: discovery/specification complete
Date: 2026-08-16

## Purpose

Shadecode Student must support secondary learners and post-secondary learners without creating a second product or forcing university/polytechnic data into school-specific fields.

The existing code already contains a partial post-secondary type layer in `src/lib/curriculum/types.ts` and helper logic in `src/lib/academic/postSecondary.ts`. The missing piece is a persisted, user-facing source of truth and a clear boundary between curriculum-board data and institution/course data.

## Canonical academic hierarchy

```text
Education Pathway
  ├── secondary
  │    └── curriculum board → qualification/level → subject → topic
  │
  └── post-secondary
       ├── university
       ├── polytechnic / TVET
       └── college
            └── institution
                 └── programme / qualification
                      └── academic period
                           └── course / module
                                ├── topics
                                ├── materials
                                └── assessments
```

The application should use `pathway` as the first discriminator. Post-secondary learners must not be forced to select a `CurriculumBoard` or school `Subject` merely to use the core study features.

## Canonical entities

### 1. Institution

Represents the organization delivering the programme.

Required concepts:
- id
- name
- type: university | polytechnic | college | other
- country
- optional campus

Institution-specific integrations are out of scope for the first implementation.

### 2. Programme / qualification

Represents the learner's degree, diploma, certificate, apprenticeship or other formal pathway.

Required concepts:
- id
- institution_id
- name
- qualification_type
- duration or expected completion period

### 3. Academic period

Represents semester, term, trimester or equivalent.

Required concepts:
- id
- programme_id
- label
- start_date
- end_date
- status

The model must not assume every institution uses semesters.

### 4. Course / module

This is the primary learning unit for post-secondary students.

Required concepts:
- id
- academic_period_id
- code
- name
- description
- credits, nullable
- topic list
- assessment types

This maps directly to the existing `AcademicCourse` type where possible.

### 5. Assessment

Required concepts:
- id
- course_id
- title
- type
- due_at, nullable
- weight, nullable
- completed
- score/result, nullable

Supported types already include assignment, project, quiz, test, midterm, exam, practical, lab, workshop, presentation and report.

### 6. Course material

Required concepts:
- id
- course_id
- title
- kind
- source/provenance
- optional source URL or storage reference

Existing `CourseMaterial` should be reused rather than creating another material abstraction.

## Student academic identity

The existing `profiles` table currently has generic fields such as `study_level` and a `subjects` array. It does not provide a normalized institution/programme/course hierarchy.

Do not immediately add many nullable columns to `profiles`.

Preferred direction:
- keep `profiles` for identity and lightweight preferences;
- introduce a separate academic-context relation for the learner;
- allow one active academic context at a time while retaining historical contexts later;
- keep the existing secondary curriculum flow intact.

## Compatibility with existing systems

Existing systems that should remain sources of truth:

- `profiles`: identity, preferences and lightweight learner state
- `subjects`: current secondary-style subject records
- `study_topics`: current topic activity records
- `exams`: existing exam records
- `topic_mastery`: existing mastery evidence
- curriculum modules under `src/lib/curriculum/`: board-based secondary curriculum
- `AcademicContext`, `AcademicCourse`, `AcademicAssessment`, `CourseMaterial`: existing type vocabulary
- `src/lib/academic/postSecondary.ts`: existing post-secondary helper vocabulary

Do not create a second mastery graph. The future tertiary model should feed the same mastery and Cortex systems through course/module/topic identifiers.

## Onboarding changes required later

Current onboarding collects subjects/goals/daily study preferences. It does not establish a persisted tertiary academic identity.

For post-secondary learners, onboarding should branch after pathway selection:

1. Choose pathway: Secondary / University / Polytechnic / College/TVET.
2. If secondary: existing board + level + subjects flow.
3. If post-secondary: institution + programme + year/level + academic period.
4. Add courses/modules.
5. Add optional assessment deadlines.
6. Confirm study goals.

Institution and programme fields should be free-form initially. A curated institution catalogue can be added later after real usage establishes which institutions matter.

## Current gap audit

| Area | Current state | Gap |
|---|---|---|
| Academic types | Partial | Types exist but are not a persisted source of truth |
| Post-secondary helpers | Partial | Utility functions exist but have no end-to-end product path |
| Profile | Secondary-oriented | No normalized tertiary identity |
| Courses/modules | Type only | No durable learner course records |
| Academic periods | Type concepts only | No persisted semester/term context |
| Assessments | Type only | Existing `exams` is too narrow for coursework/assignments |
| Course materials | Type only | No post-secondary material workflow |
| Onboarding | Existing | No tertiary branch |
| Cortex context | Partial | Course/programme/institution context is not consistently available |
| Mastery | Existing | Must be connected to course/module/topic hierarchy without duplication |
| Past papers | Existing Exam Hub | Needs tertiary metadata and provenance model |
| GPA/credits | Missing | Requires assessment + credit-aware academic result model |
| Institution integrations | Missing | Correctly deferred until generic model is stable |

## Implementation boundary

### Phase T1: model and storage

- Add normalized academic-context entities after schema review.
- Add RLS from day one.
- Keep user ownership explicit.
- Add indexes for user, active context, programme, period and course.
- Add migration tests.

### Phase T2: onboarding

- Add pathway selection.
- Route tertiary learners through the new academic context flow.
- Preserve existing secondary onboarding behavior.

### Phase T3: student experience

- Show current programme and academic period.
- Show course/module workload.
- Add assignment/coursework tracking.
- Integrate deadlines into Mission Control and study planning.

### Phase T4: Cortex

Cortex should receive structured academic context such as:

- pathway
- institution
- programme
- year/level
- current academic period
- active courses
- credits
- upcoming assessments
- mastery/weakness evidence

It must never invent institution, course, credit or assessment facts.

### Phase T5: results intelligence

Only after real assessment data exists:

- weighted course results
- GPA/average calculations
- credit progression
- academic-risk signals
- revision recommendations

## Non-goals

Do not yet build:

- institution-specific APIs
- university LMS integrations
- automatic scraping of university portals
- a marketplace
- peer-to-peer academic exchange
- a full digital twin
- institution-wide administration

Those can sit on top of this generic model later.

## Acceptance criteria

The model is ready for implementation when:

- a secondary student can continue using the existing curriculum path unchanged;
- a university student can be represented without selecting a school exam board;
- a polytechnic/TVET student can be represented without pretending every course is a school subject;
- one learner can have an active programme and academic period;
- courses/modules can own topics, materials and assessments;
- assessment deadlines can feed Mission Control;
- mastery can attach to course topics without creating a duplicate mastery system;
- Cortex can consume the context without fabricated academic metadata;
- RLS can isolate one learner's academic records from another learner.
