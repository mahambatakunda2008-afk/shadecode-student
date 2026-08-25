# Canvas + Shared Learning Tooling v2

## Goal

The Shadecode canvas is a learning instrument, not a generic drawing box. It should help students express mathematics, physics, chemistry, computer science and other visual reasoning while preserving the student's original intent.

## Intelligent stroke assistance

### Real-time geometry assistance

The canvas should continuously observe recent pointer/stroke geometry and offer low-latency local corrections:

- straighten nearly straight lines;
- snap lines to useful angles when confidence is high;
- smooth noisy curves;
- fit circles/ellipses/arcs;
- snap endpoints to nearby endpoints;
- join open endpoints when the gesture strongly indicates a connection;
- snap intersections and connection points;
- align parallel/perpendicular elements;
- recognize arrows and arrowheads;
- recognize common symbols where confidence is high;
- preserve intentional freehand marks when confidence is low.

### Critical UX rule

**Never silently destroy the student's stroke.**

Use a preview/ghost correction during the gesture or a reversible correction immediately after release. The student can accept, reject or undo it. High-confidence micro-corrections may be automatic, but every correction must remain undoable.

### Confidence bands

```text
0.00 - 0.59  preserve original
0.60 - 0.84  show suggested correction
0.85 - 0.94  apply reversible correction
0.95 - 1.00  apply + keep undo history
```

Thresholds must be tuned with real student drawings rather than assumed to be optimal.

## Geometry pipeline

```text
pointer events
     |
     v
stroke buffer
     |
     +--> smoothing / resampling
     |
     +--> feature extraction
     |      length, curvature, angle, endpoints,
     |      intersections, velocity, pressure where available
     |
     v
candidate recognizers
     |
     +--> line
     +--> curve
     +--> circle
     +--> rectangle
     +--> arrow
     +--> connector
     +--> symbol
     |
     v
confidence + context
     |
     v
reversible transform
     |
     v
rendered scene + original stroke metadata
```

Do this locally for responsiveness. Do not send every pointer event to Cortex or a network model.

## Context-aware snapping

The same stroke can mean different things in different contexts. The canvas should eventually expose modes:

- Free draw
- Maths
- Physics
- Chemistry
- Computer Science
- Diagram
- Graph
- Whiteboard

For example, Physics mode may prioritize arrows, force vectors, axes and circuit symbols. Maths mode may prioritize axes, geometric lines, circles and graph curves.

## Semantic recognition

After geometry stabilization, an optional higher-level recognizer can infer:

```text
line -> vector
circle -> object
arrow -> direction/force
parallel lines -> geometry relationship
closed shape -> region
axis + labels -> graph
nodes + arrows -> flow/algorithm
```

Semantic inference must not rewrite the drawing without user confirmation.

## Diagram repair

Add explicit commands such as:

- Straighten
- Smooth
- Join
- Align
- Distribute
- Make parallel
- Make perpendicular
- Snap to grid
- Clean diagram
- Label with Cortex
- Convert to structured diagram

"Clean diagram" should produce a polished copy while retaining the original board state.

## Canvas learning actions

Selected content can be sent to Cortex:

- Explain my diagram
- Check my diagram
- Find missing labels
- Turn this into a question
- Turn this into an exam question
- Generate a clean version
- Compare with the expected diagram
- Identify the misconception
- Convert to notes

For exam practice, Cortex should be able to compare a student's drawing against a structured expected representation, not merely use image similarity.

## Shared tools

The same canvas should be available from:

- Learn
- Workmate
- Exam Simulation
- Math Checker
- Physics practicals
- revision sessions
- StudySpace
- source/reader annotations

Avoid creating separate drawing implementations for each module.

## Calculator contract

The calculator must be treated as a learning tool and verified shared component.

It should support, subject to the actual current implementation and safe parser capabilities:

- arithmetic;
- fractions;
- powers/roots;
- scientific notation;
- brackets;
- percentages;
- unit-aware calculations where implemented;
- trigonometry;
- logarithms/exponentials;
- constants;
- equation evaluation/solving where implemented;
- history;
- copy/share result;
- exact vs decimal display.

### Calculator + Cortex

Do not make Cortex blindly reproduce calculator arithmetic. Prefer deterministic calculation for numerical correctness and let Cortex explain the result.

Example:

```text
Student: sin(35°)
Calculator: 0.573576...
Cortex: "Here's why you use sine here..."
```

The calculator should expose a machine-readable expression/result pair to other learning modules.

## Tool verification matrix

Every shared learning tool needs:

1. component/unit tests;
2. keyboard tests;
3. mobile/touch tests where applicable;
4. offline tests where applicable;
5. accessibility checks;
6. persistence/reload tests;
7. integration tests with Learn/StudySpace;
8. error-state tests;
9. empty-state tests;
10. performance checks.

Minimum release gate:

```text
build passes
lint passes
unit tests pass
critical integration tests pass
no console/runtime errors in main learning flows
calculator produces deterministic expected results
canvas survives reload/offline transitions
exam generation cannot expose invalid/unverified papers
lesson rendering handles all supported content block types
```

## Do not over-automate

The intelligent canvas should feel like an assistant holding a ruler, not a robot taking over the student's hand.

The product wins when it removes friction while preserving intent.
