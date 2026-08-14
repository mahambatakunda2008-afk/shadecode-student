# Tertiary Academic Model — Discovery Specification

**Status:** Discovery complete enough to begin implementation in a later slice.  
**Scope:** Universities, polytechnics, colleges and technical/vocational pathways.

## 1. What the current product already has

The current onboarding model already has an `education_level` concept with `basic`, `secondary`, `tvet`, `university` and `self_learning`, plus learning goals and subject interests. The onboarding flow persists `user_profiles` and initializes a `learning_paths` record.

The current UI-level `StudyLevel` is narrower (`high-school`, `a-level`, `university`, `professional`). The mapping layer currently maps `a-level` to `university`, which is semantically wrong for an A-Level learner and must be corrected before tertiary expansion.

The existing core learning model is still subject-centric. Cortex snapshot types expose `subjects` and exam subject/weak-area information, while the strategic roadmap already identifies `topic_mastery` as an existing mastery source.

## 2. Canonical academic hierarchy

Do not force tertiary education into the existing subject-only vocabulary. The generic hierarchy should be:

```text
Institution (optional for independent learners)
  └── Qualification / Programme
        └── Academic Period
              └── Course / Module
                    └── Topic
                          ├── Learning Evidence
                          ├── Questions / Assessments
                          ├── Lessons / Resources
                          └── Mastery State
```

### Core concepts

- **Institution:** university, polytechnic, college or training provider. Optional because independent learners may have no institution.
- **Qualification:** degree, diploma, certificate or other credential being pursued.
- **Programme:** the named course of study leading to a qualification, e.g. BSc Computer Science.
- **Academic period:** semester, term, quarter, block or custom period.
- **Course/Module:** a credit-bearing or otherwise assessable academic unit inside a programme.
- **Topic:** the learning concept beneath a course/module. This should connect to the existing mastery system.
- **Assessment:** assignment, test, quiz, examination, practical, laboratory, project, presentation, dissertation/research component or other assessed activity.

## 3. Tertiary learner context

Cortex should eventually receive structured context such as:

- education level
- institution (when applicable)
- qualification
- programme
- academic period
- active courses/modules
- credits or workload weight where known
- assessment deadlines
- recent assessment evidence
- topic mastery evidence
- study goals

This context should be additive. A learner must still be able to use Shadecode without completing every tertiary field.

## 4. Minimum implementation boundary

The first implementation slice should **not** create institution integrations or a large new database schema.

First build:

1. canonical TypeScript domain types for academic context;
2. mapping/validation helpers that translate existing profile data into that context;
3. a read-only context resolver for Cortex and learning features;
4. tests covering secondary, A-Level, university, polytechnic/TVET and self-learning cases;
5. only then determine which persisted fields are genuinely missing.

## 5. Compatibility rules

- Preserve existing `subjects` and `study_topics` while migration is incremental.
- Treat `course/module` as the tertiary analogue of a subject, not as a destructive replacement.
- Keep `topic_mastery` as the mastery source of truth.
- Do not duplicate profile identity data in multiple tables without a clear ownership boundary.
- Do not require an institution for independent learners.
- Do not infer a qualification or institution from a subject list.
- Do not classify A-Level as university.

## 6. Assessment model direction

Assessment should be polymorphic at the domain level:

```text
Assessment
  ├── type: assignment | quiz | test | exam | practical | lab | project | presentation | research
  ├── course/module
  ├── period
  ├── due/start/end dates (as applicable)
  ├── weight (optional)
  ├── score/result (optional)
  └── evidence/questions
```

This allows the same intelligence layer to serve school examinations and tertiary coursework without pretending they are identical.

## 7. Immediate implementation decision

The first code change after this specification should be a **non-persistent academic-context domain layer**. It should expose a single normalized context shape to Cortex and other consumers. Persistence changes should follow only after an audit of actual data requirements.

## 8. Known gap discovered during audit

`src/lib/onboarding/mapFormData.ts` currently maps the UI value `a-level` to the canonical education level `university`. This should be corrected as part of the tertiary/education-level normalization work. Because the canonical enum currently has no explicit `a_level` value, the next implementation decision must determine whether A-Level belongs under `secondary` or whether a distinct education-level value is warranted across the product. That decision should be made consistently for analytics, recommendations and Cortex context rather than patched in one mapper.
