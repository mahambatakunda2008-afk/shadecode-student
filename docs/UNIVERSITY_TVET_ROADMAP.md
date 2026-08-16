# University + Polytechnic/TVET Implementation Roadmap

## Shipped

- Separate post-secondary academic context model
- University and Polytechnic/TVET onboarding paths
- A-Level correctly remains secondary
- Institution, programme, year, semester and course/module capture
- Secure `academic_contexts` persistence with RLS
- Read/update API at `/api/academic-context`
- Editable `/courses` workspace
- Cortex snapshot support for post-secondary context
- Course/assessment/material domain types
- Post-secondary assessment prioritization utilities

## Next production layer

### Course intelligence
- course/module IDs and stable records
- topic trees and prerequisites
- lecturer/department metadata
- credit/contact-hour support

### Materials
- upload lecture notes, slides, PDFs and readings
- OCR/text extraction where needed
- course-scoped retrieval
- material freshness/versioning

### Assessments
- assignment tracker
- project milestones
- quizzes/tests/midterms/finals
- practical/lab/workshop records
- deadline and weighting model

### Cortex
- cross-course workload planning
- course-grounded explanations
- weak-concept detection
- prerequisite diagnosis
- assessment-aware recommendations
- adaptive timetable generation

### TVET specialization
- theory/practical split
- workshop/lab sessions
- competency tracking
- practical evidence and project milestones

### Distribution
- low-data UX
- offline-first course workspace
- sync queues
- device-to-device/peer-assisted distribution where appropriate

### Business
- free university onboarding
- premium course intelligence
- premium document ingestion/grounded AI
- student productivity bundle
- institution partnerships without requiring institutional adoption

## Quality gates

Every phase must pass TypeScript typecheck, tests and production build. Database changes must have RLS and a verification query before being considered complete.
