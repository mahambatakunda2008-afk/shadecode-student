# Shadecode Student Code Lab — Exam Board & Syllabus Architecture

**Status:** Approved product/engineering direction  
**Scope:** Code Lab, Computer Science practical learning, curriculum-aware adaptation  

## 1. Non-negotiable requirement

Code Lab MUST be **exam-board-, qualification-, syllabus-version-, level-, and user-aware**.

A learner must never receive a generic Computer Science pathway when Shadecode Student knows their:

- exam board
- qualification / level
- syllabus version
- subject
- paper/component, where applicable
- target examination/session, where applicable
- learning goals

The curriculum layer must determine what content, examples, exercises, practical tasks, terminology, assessment style, and exam preparation are appropriate for that learner.

## 2. Learner curriculum context

Every curriculum-aware learning experience should resolve a context equivalent to:

```text
User
 └── Education Profile
      ├── Country / education system (optional)
      ├── Exam Board
      ├── Qualification / Level
      ├── Syllabus Version
      ├── Subject
      ├── Paper / Component (optional)
      ├── Examination Session (optional)
      └── Learning Goal
```

Examples:

```text
Computer Science → Cambridge International → A Level → 9618 → current syllabus version
Computer Science → ZIMSEC → A Level → applicable syllabus version
```

The examples above are identifiers, not permission to assume that every topic or practical requirement is identical across boards.

## 3. Curriculum must be data-driven

Do NOT hard-code curriculum assumptions into UI components or learning logic.

Use a versioned curriculum model:

```text
Exam Board
  ↓
Qualification
  ↓
Syllabus Version
  ↓
Subject
  ↓
Paper / Component
  ↓
Topic
  ↓
Learning Objective
  ↓
Skill
  ↓
Practice Activity
  ↓
Assessment / Practical Task
```

A syllabus revision must be representable as a new version rather than silently changing the meaning of an existing curriculum.

## 4. Board-specific adaptation

The same underlying Computer Science capability can be taught differently depending on the selected board.

Code Lab should therefore support:

- board-specific terminology
- board-specific pseudocode conventions
- board-specific programming expectations
- board-specific practical requirements
- board-specific assessment objectives
- board-specific question styles
- board-specific allowed/recommended technologies where applicable
- board-specific marking/checklist structures
- board-specific syllabus mappings

A shared concept library is encouraged, but mappings to each syllabus must remain explicit.

## 5. Level-aware progression

The learner's level is part of curriculum resolution.

The system must distinguish, where applicable, between:

- lower/secondary levels
- IGCSE/O Level equivalents
- AS Level
- A Level
- vocational/technical pathways
- university/polytechnic pathways

Do not show advanced practical content simply because the user selected Computer Science. The learning pathway must respect the learner's level and syllabus.

## 6. Code Lab capability map

The broader Code Lab capability set includes:

### Foundations
- computational thinking
- decomposition
- abstraction
- algorithms
- logic
- data representation

### Algorithms & pseudocode
- variables/constants
- input/output
- selection
- iteration
- arrays
- records
- procedures/functions
- searching
- sorting
- recursion
- trace tables
- dry runs
- algorithm correction
- pseudocode ↔ code translation

### Program design
- flowcharts
- structure charts
- state-transition diagrams
- modular design
- requirements
- analysis
- design
- implementation
- testing
- evaluation
- maintenance

### Programming
- Python
- Java
- Visual Basic/.NET where appropriate
- C#
- JavaScript
- additional languages as curriculum requirements evolve

Languages are capabilities. A syllabus mapping determines when and why a learner encounters one.

### Console programming
- input/output
- menus
- validation
- loops
- functions
- data structures
- file handling
- debugging
- exception/error handling
- CRUD-style applications

### Windows desktop development

Explicit support for the **Visual Studio / Windows Forms** workflow where relevant:

- forms
- controls
- buttons
- labels
- text boxes
- combo boxes
- list boxes
- check boxes
- radio buttons
- DataGridView
- menus
- events/event handlers
- form navigation
- validation
- debugging
- database-connected applications

### Web development
- HTML
- CSS
- JavaScript
- forms
- validation
- DOM
- responsive design
- backend concepts
- APIs
- CRUD
- database integration

### Databases
- relational concepts
- tables/records/fields
- primary keys
- foreign keys
- relationships
- entity modelling
- normalisation
- SQL
- queries
- joins
- aggregation
- constraints
- forms
- reports
- import/export
- application/database integration

### External application integration
Where required by the syllabus/practical pathway:

- Microsoft Word workflows
- Microsoft Excel workflows
- database systems
- import/export
- generated reports
- templates
- application-to-application data workflows

This capability must be syllabus-mapped rather than universally presented as an examination requirement.

## 7. Practical examination model

A practical task should be resolved from the learner's curriculum context.

The system may generate a workflow such as:

```text
Scenario
 → Requirements
 → Analysis
 → Design
 → Pseudocode / Algorithm
 → Implementation
 → Database / UI / Integration
 → Testing
 → Debugging
 → Evaluation
 → Submission checklist
```

Assessment must be mapped to the selected syllabus and should not claim that a criterion is examinable unless the curriculum source supports it.

## 8. Cortex integration

Cortex must receive curriculum context when generating or evaluating Computer Science learning.

Cortex should understand:

- what the learner is studying
- which board they follow
- which syllabus version applies
- what level they are at
- which objectives have been covered
- which skills are weak/strong
- what practical requirements apply

Example:

> A student may understand loops in Python but struggle translating algorithms from their board's pseudocode conventions into working code.

The recommended intervention should target that exact gap, not produce a generic programming lesson.

## 9. Assessment integrity

Code Lab must distinguish between:

- curriculum knowledge
- transferable Computer Science skills
- board-specific examinable requirements
- broader enrichment content

A topic offered for enrichment must not be presented as a requirement of a specific examination board unless verified against the relevant syllabus.

Likewise, an old syllabus must not silently be treated as the current syllabus.

## 10. Source-of-truth policy

Official syllabus/specification material is the source of truth for board-specific mappings.

Curriculum records should retain provenance such as:

- board
- qualification
- syllabus/code identifier
- syllabus version/year
- source document
- retrieval/review date
- relevant section/page where practical
- mapping status

When a syllabus changes, the new version must be added and reviewed rather than overwriting historical mappings.

## 11. Initial priority

Initial curriculum implementation priority:

1. **Cambridge International Computer Science**
2. **ZIMSEC Computer Science**
3. Additional boards through the same curriculum engine

The architecture must remain board-agnostic from the beginning.

## 12. Product principle

Code Lab is NOT merely an AI code editor.

It is a **curriculum-aware practical Computer Science environment** that adapts to each learner's level, exam board, syllabus version and goals.

The same platform can therefore serve different students without pretending they are following the same curriculum.

## 13. Engineering acceptance criteria

Before calling the curriculum architecture complete:

- [ ] User education profile can identify exam board.
- [ ] User level/qualification is represented.
- [ ] Syllabus version is represented explicitly.
- [ ] Subject is represented.
- [ ] Optional paper/component and examination session can be represented.
- [ ] Learning content can map to one or more syllabus objectives.
- [ ] Board-specific mappings are separate from shared concepts.
- [ ] Syllabus versions are immutable/history-preserving once published.
- [ ] Cortex receives curriculum context.
- [ ] Practical assessments resolve against the learner's curriculum.
- [ ] Analytics can record skills against curriculum context.
- [ ] Adding another exam board does not require rewriting Code Lab logic.
- [ ] Outdated syllabus content cannot silently appear as current content.

## 14. Build order

### Phase 1 — Foundation

- Curriculum domain model
- Education profile fields
- Board/qualification/syllabus resolution
- Versioned curriculum records
- Shared Computer Science skill taxonomy
- Curriculum-to-skill mapping

### Phase 2 — Learning

- Pseudocode
- Algorithms
- Python
- Console programming
- SQL/database playground
- Practical projects
- Cortex tutoring

### Phase 3 — Practical development

- Web development
- C# / Visual Studio concepts
- Windows Forms
- Database-connected applications
- Testing/debugging tools
- External application workflows

### Phase 4 — Exam intelligence

- Board-specific practical simulations
- Timed assessments
- Marking/checklists
- Syllabus coverage tracking
- Exam readiness analytics

### Phase 5 — Expansion

- Additional examination boards
- Additional qualifications
- University/polytechnic curricula
- More programming languages
- Deeper desktop/offline execution

## Final rule

**Never build a generic Code Lab first and bolt curriculum support on later.**

Curriculum context is a first-class architectural concern from the first implementation.
