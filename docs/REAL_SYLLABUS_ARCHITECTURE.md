# Real syllabus architecture

Shadecode should not ask Cortex to invent a curriculum from memory.

## Principle

The syllabus is the curriculum contract. AI is the teaching engine operating inside that contract.

```text
official syllabus
      ↓
source registry
      ↓
versioned syllabus definition
      ↓
topic tree + learning outcomes + command words + assessment objectives
      ↓
Cortex grounding context
      ↓
lesson / exam / revision / analytics
```

## Source policy

Prefer the awarding body's official syllabus and update notices. For Cambridge International, the syllabus year corresponds to the year of examination. Do not silently mix syllabus years. Candidates taking exams in 2027 follow the 2027 syllabus; candidates taking exams in 2028 follow the new 2028-2030 syllabus where applicable.

Every syllabus-backed generation should retain provenance:

- board;
- qualification code;
- subject;
- syllabus year;
- source URL;
- retrieval date;
- topic code;
- topic title;
- source locator/page when available.

## Topic grounding

When a student asks to learn a topic, first resolve it to a syllabus node. If no exact node exists, Cortex may offer the closest official node or explain that the requested concept is outside the selected syllabus. It must not silently pretend the topic is examinable.

## Lesson generation

The lesson planner receives the resolved syllabus context and generates enough depth to cover the relevant official learning outcomes. It can add enrichment, intuition, applications and curiosity, but enrichment must be visibly distinguished from examinable scope.

## Exam generation

Exam blueprints must be derived from syllabus topics, assessment objectives, command words, paper/component constraints and available official assessment evidence. Generated questions are not copies of source questions. They should be novel while matching the demand and skill profile.

## Change detection

When a new syllabus/update is ingested:

1. store it as a new immutable version;
2. diff topic codes/titles/outcomes/papers;
3. flag additions, removals and moved content;
4. invalidate affected lesson/exam caches;
5. preserve historical results against the old syllabus version;
6. notify users whose selected exam year changed.

## Multi-board future

Keep the model board-neutral so Cambridge is the first high-quality implementation rather than a hard-coded one-off. Add other boards only after their official source and assessment structure can be represented accurately.
