# Shadecode Offline Distillation Dataset

The compact local model should be distilled for the jobs Shadecode actually performs, rather than optimized only against generic chat benchmarks.

## Dataset families

### 1. Tutor
- concept explanations at multiple learner levels;
- worked examples with intermediate reasoning;
- misconception diagnosis;
- hints before answers;
- concise explanations suitable for low-bandwidth devices.

### 2. STEM verifier/co-pilot
- Mathematics symbolic/numeric checks where deterministic engines can verify answers;
- Physics formula selection and unit reasoning;
- Computer Science algorithm and code explanations;
- explicit uncertainty when the model cannot verify a claim.

### 3. Project Coach
- turning a board/project brief into stages;
- research-question refinement;
- methodology planning;
- evidence collection prompts;
- data-analysis guidance;
- presentation/viva preparation;
- refusal to fabricate interviews, measurements, observations, citations or results.

### 4. Study Planner
- schedule-aware revision plans;
- adaptive prioritization from local performance;
- short study sessions for constrained connectivity/device conditions.

### 5. Question Generator
- curriculum-grounded questions;
- difficulty progression;
- answer/rubric generation;
- avoidance of unsupported syllabus content.

## Training-example shape

Each example should retain structured metadata such as capability, subject, qualification/board, level, language, difficulty, expected behavior and verification source. The final serialized training format can change without changing the source dataset.

## Quality strategy

Prefer verified teacher-authored/reference-backed examples. Use deterministic checkers for arithmetic, units, code syntax where possible, and rubric-based evaluation for open-ended responses. Keep adversarial examples for hallucination, project fabrication and unsafe academic behavior.

## Privacy

Do not put identifiable student submissions into the distillation corpus without an explicit approved data-governance process. Synthetic and de-identified examples are preferred for the initial corpus.
