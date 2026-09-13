# Code Lab Environment Strategy

Code Lab is not a JavaScript-only coding page. It is the execution and learning layer for the real computing environments students encounter across school, university and professional development.

## Environment matrix

| Environment | Primary stack | Code Lab role | Execution target |
|---|---|---|---|
| Console | JavaScript / TypeScript | Algorithms, programming, debugging | Browser now; stronger runtimes later |
| Console | Python | Algorithms, programming, practical work | Python runtime service/WASM |
| Console | C# | .NET programming | Real .NET runtime |
| Console | VB.NET | Visual Basic programming | Real .NET runtime |
| Windows Forms | C# | GUI, controls, events, desktop projects | Windows/.NET runtime |
| Windows Forms | VB.NET | GUI, controls, events, desktop projects | Windows/.NET runtime |
| Web | HTML + CSS + JS/TS | Web design and web development | Browser preview/runtime |
| Database | SQL | Relational database design and queries | Sandboxed DB engine |
| Microsoft Access | Access database artifacts | Tables, relationships, queries, forms, reports | Office/Access-compatible environment |
| Excel | Workbook artifacts | Formulas, functions, charts, data analysis | Spreadsheet-compatible environment |

## Important distinction

Access and Excel are not programming languages. They should not be forced into the same runtime abstraction as JavaScript or C#.

They belong in a broader project/artifact model where Code Lab can understand the student's work, inspect structure and provide curriculum-aware assessment. This leaves room for an eventual **Data & Office Lab** surface while keeping Code Lab focused on software development.

## ZIMSEC alignment

The current Zimbabwe secondary Computer Science curriculum explicitly includes practical programming, databases and web design. The 2024-2030 Form 1-4 syllabus directs candidates toward high-level programming languages such as Visual Basic or Python and requires practical experience writing, running, testing and debugging programs.

That means Visual Basic and Python are first-class curriculum targets, not optional extras. Windows Forms should be supported as a genuine desktop project type because it represents the visual/event-driven environment many learners encounter, while the product must not claim that every desktop framework is itself an official examination requirement.

Database work must support the concepts students actually need: relational structure, tables, queries, forms, reports, import/export and security. Microsoft Access is therefore an important compatibility target rather than something to simulate as if it were a programming language.

Web work should support HTML/CSS/JavaScript and the practical workflow of designing, testing, debugging and previewing a site.

## Architecture rule

Every environment gets four independent layers:

1. **Language/editor support**: syntax, formatting, diagnostics and project files.
2. **Project model**: files, folders, forms, controls, database objects or workbook sheets.
3. **Execution/preview**: only where a real runtime is available.
4. **Learning + assessment**: map work to the learner's board, level, syllabus and objective.

This prevents a dangerous shortcut: showing a fake "Run" button for an environment we cannot actually execute.

## Roadmap

### Phase 1: IDE substrate
- Language-aware files for JS/TS, Python, C#, VB.NET, HTML, CSS and SQL.
- Project templates for console, web, Windows Forms, database and spreadsheet work.
- Honest capability states: browser, planned, external-runtime, artifact.
- Monaco diagnostics and workspace intelligence.

### Phase 2: Web Lab
- HTML/CSS/JS live preview.
- Browser console and network/error inspection.
- Multi-page project support.
- Curriculum-aware web tasks.

### Phase 3: .NET Lab
- Real C# and VB.NET compilation/execution.
- Console projects.
- Windows Forms project structure and designer-aware editing.
- Build errors, runtime errors and debugging mapped back to source lines.

### Phase 4: Data Lab
- Sandboxed SQL database engine.
- Schema/relationship visualisation.
- Query runner and result grid.
- Access-style tables, queries, forms and reports.

### Phase 5: Office Lab
- Workbook model for Excel files.
- Formula/function practice.
- Spreadsheet validation and chart/data-analysis tasks.
- Import/export without pretending that an `.xlsx` file is source code.

### Phase 6: Learning intelligence
- Objective-specific tasks.
- Evidence-based testing.
- Error-pattern memory.
- Project health and mastery graph.
- Teacher review and classroom assignments.

## Product principle

Code Lab should feel like one serious environment even though its runtimes are different underneath.

The learner should be able to move from:

**"Write this VB program" → "build this Windows Forms application" → "design this database" → "create this website" → "analyse this spreadsheet" → "ship a real software project"**

without leaving the learning system.
