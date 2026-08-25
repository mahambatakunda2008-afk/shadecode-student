# Curriculum scale plan

Shadecode should support the learner's stage first, then the curriculum board, then the exact syllabus version.

## Stages

- Primary
- Lower secondary
- Upper secondary
- Advanced secondary / AS & A Level
- Tertiary

Primary is not a smaller A Level experience. It needs a different pedagogy: shorter explanations, stronger visualisation, guided practice, immediate feedback, stories/examples, age-appropriate language, and careful avoidance of intimidating notation.

## Curriculum architecture

```text
Learner stage
  -> board
  -> qualification
  -> syllabus version
  -> subject
  -> topic tree
  -> learning outcomes
  -> assessment/practical requirements
  -> source evidence
  -> Cortex learning plan
```

## Rollout

### Wave 1: Cambridge advanced secondary

Deep support for the already targeted Cambridge subjects and syllabus years.

### Wave 2: Cambridge primary/lower secondary

Add Cambridge Primary and Lower Secondary curriculum sources and map subjects to the stage policy. Do not reuse AS/A Level prompts.

### Wave 3: Zimbabwe

Add official ZIMSEC curricula where officially published and legally usable. Prioritise common primary/secondary subjects.

### Wave 4: broader boards

Pearson Edexcel, AQA, OCR, IB, WAEC and other official curricula, prioritised by user demand and source quality.

## Source policy

- Prefer official board sources.
- Store source URL, syllabus code, version/year, retrieval timestamp and content hash.
- Never silently replace a syllabus version.
- Keep historical versions available for students sitting legacy examinations.
- Respect copyright. Store metadata and extracted facts needed for learning; do not redistribute protected syllabus PDFs unless licensing permits it.

## AI policy

Cortex must be curriculum-grounded before claiming syllabus coverage. If no verified curriculum node exists, it should say that the topic is not yet mapped instead of pretending it is.

## Primary experience

Primary Learn should include:

- visual concept cards;
- short interactive explanations;
- drawing and manipulation;
- guided examples;
- gentle hints;
- immediate feedback;
- vocabulary support;
- read-aloud friendly content;
- safe curiosity prompts;
- age-appropriate diagrams;
- teacher/parent progress views where enabled.

Primary Exam Simulation should use shorter, clearer assessments and avoid pretending to be a formal examination when the curriculum does not define one.
