# Cambridge Computer Science curriculum contract

Shadecode Student treats Cambridge Computer Science as versioned curriculum data, not a generic list of CS topics.

## Supported identities

| Qualification | Syllabus | Exam years | Candidate status |
|---|---|---:|---|
| Cambridge IGCSE Computer Science | 0478 | 2026-2028 | Candidate, fail-closed |
| Cambridge IGCSE (9-1) Computer Science | 0984 | 2026-2028 | Candidate, fail-closed |
| Cambridge O Level Computer Science | 2210 | 2026-2028 | Candidate, fail-closed |
| Cambridge International AS & A Level Computer Science | 9618 | 2027-2029 | Candidate, fail-closed |

## Alignment order

Learner identity → qualification → exact syllabus → syllabus version → complete content scope → learning requirements → assessment requirements → learning activity.

A learner must never receive a claim such as “required for your exam” from a broad generic CS knowledge base when an exact Cambridge syllabus is selected.

## Content versus requirements

The candidate inventory contains topic and subtopic structure. The requirements layer captures capabilities a learner is expected to demonstrate. The two layers are intentionally separate so a topic cannot be mistaken for a complete learning requirement.

The wider content model also supports concepts, knowledge, skills, practical work, projects, prerequisites, progression and assessment requirements. Objectives alone are not the whole syllabus.

## Trust gates

Cambridge candidate data is currently `draft`, `complete: false`, and `verified: false` until it is reconciled against the exact official syllabus version. Code Lab and Cortex must fail closed for curriculum-aligned claims until those gates pass.

## Assessment

Assessment components are stored separately from teaching content. This lets Exam Sim reproduce the relevant paper structure without pretending that a paper's existence proves the whole syllabus has been ingested.

## 0478 / 0984 / 2210

0478 and 0984 use the same Computer Science teaching content, with 0984 using the 9-1 grading scale. 2210 remains a separate learner identity even where content overlaps, because qualification and syllabus identity must remain explicit.

Cambridge's official 0478 page says the 2026–2028 syllabus updates the learning objectives and topic structure, removes pre-release material, moves logic gates to Paper 2, and adds a scenario-based Paper 2 question. urlOfficial Cambridge 0478 syllabushttps://www.cambridgeinternational.org/Images/697167-2026-2028-syllabus.pdf

## 9618

9618 is not treated as an extension of IGCSE. Its AS and A Level sections, assessment components and practical programming requirements are represented under its own syllabus identity and version. The official 2027–2029 syllabus specifies Paper 1 for sections 1–8, Paper 2 for sections 9–12, Paper 3 for sections 13–20 and Paper 4 as the practical component covering sections 19–20 with stated exclusions. urlOfficial Cambridge 9618 syllabushttps://www.cambridgeinternational.org/Images/721397-2027-2029-syllabus.pdf

## Progression

Progression edges are intentionally conservative. They represent useful prerequisite/build-on relationships, not a claim that Cambridge mandates one classroom teaching sequence. The progression engine returns no edges unless the exact scope is complete and verified.

## Source policy

Official Cambridge International syllabus documents and syllabus-update documents are the authority. Third-party copies may assist discovery but cannot independently promote a candidate record to verified status.

Stored requirement text is paraphrased. Shadecode Student should not copy an entire syllabus into application data.
