# Universal Development Interaction Architecture

Shadecode Student must support development as a human activity, not merely text entry. This applies to programming, web development, design, diagrams, presentations, documents, spreadsheets, databases, science practicals, projects and other creative or technical work.

## Principle

**The user should be able to create through whichever interaction is most effective for the device and task.**

Typing is one input method, not the platform.

```text
                         DEVELOPMENT
                              |
                 +------------+------------+
                 |            |            |
               TYPE         VOICE        TOUCH
                 |            |            |
              KEYBOARD      SPEECH       DRAW
                 |            |            |
                 +------------+------------+
                              |
                         INTENT MODEL
                              |
             +----------------+----------------+
             |                |                |
           CREATE           EDIT            EXPLAIN
             |                |                |
             +----------------+----------------+
                              |
                       SHARED ARTIFACT
                              |
                 +------------+------------+
                 |            |            |
               CODE         DESIGN       DATA
                 |            |            |
                 +------------+------------+
                              |
                         CORTEX + TOOLS
                              |
                    Browser / Native / Edge
```

## Interaction modes

### Voice

Voice must support more than dictation. It should support structured commands such as:

- "Create a Python project for a student grade calculator."
- "Add a function that calculates the average."
- "Change the button to green and make it larger."
- "Move this card below the chart."
- "Explain why this database query fails."
- "Generate three test cases."
- "Undo that change."
- "Show me what changed."

Voice-generated changes must be previewable and reversible. The system should distinguish between **dictation**, **command**, **generation**, and **conversation**.

### Touch and pen

On phones and tablets, touch becomes a primary development surface for:

- drawing diagrams and flowcharts
- arranging UI elements
- annotating documents
- selecting and transforming design elements
- handwriting mathematical work
- marking up PDFs and lessons
- manipulating timelines, tables and cards
- approving or rejecting generated changes

### Camera and vision

Camera input can become a development tool rather than merely an attachment feature:

- photograph handwritten code or mathematics
- scan a whiteboard
- capture a circuit or practical setup
- import a sketch into a design
- scan a physical document into an editable artifact
- inspect a UI or physical prototype

Vision must produce structured artifacts where possible, not just an image caption.

### Keyboard and desktop precision

Desktop remains the high-throughput surface for serious editing. Native clients should preserve keyboard shortcuts, multi-window workflows, drag-and-drop, filesystem integration and professional input devices.

## Artifact-first model

Every development action should operate on a typed artifact rather than an unstructured chat response.

Examples:

- code project
- website
- UI design
- poster
- presentation
- spreadsheet
- database
- document
- diagram
- flowchart
- dataset
- lesson
- exam response
- science practical

Cortex should understand the artifact type, structure, history, dependencies and available operations before modifying it.

## Design is development

Design must use the same platform architecture as code.

A student should be able to move between:

```text
idea -> sketch -> wireframe -> visual design -> prototype -> implementation -> test -> revision
```

A voice instruction such as "make this dashboard easier to use" should not blindly regenerate the whole interface. Cortex should inspect the current artifact, identify candidate changes, preview them, and let the learner accept or reject them.

## Cross-device continuity

An artifact must not become trapped on one device.

```text
Phone
  -> voice/sketch
  -> shared project
  -> laptop
  -> precise editing/native execution
  -> phone review
  -> school/edge sync
```

The same project identity, history, permissions, learning context and evidence model follow the artifact.

## Native capability layer

The platform should expose device capabilities through a capability broker rather than allowing features to call native APIs directly.

Examples:

- microphone
- camera
- filesystem
- notifications
- local AI
- GPU/NPU
- compilers
- database engines
- document applications
- Office integrations
- printing
- USB/Bluetooth
- local network
- background jobs

The broker reports whether a capability is available, unavailable, permission-gated, remote, or requires a native companion.

## Cortex interaction routing

Cortex should route requests based on intent, artifact, device capabilities and user context.

```text
User intent
    |
    +--> input modality
    |
    +--> artifact/context
    |
    +--> required capability
    |
    +--> local device capability
    |
    +--> trusted remote capability
    |
    +--> policy / permissions
    |
    +--> execute or generate
    |
    +--> preview
    |
    +--> user approval where required
    |
    +--> commit change
    |
    +--> record evidence/history
```

## Safety and reversibility

Generated or voice-driven development must never silently destroy work.

- Preview consequential changes.
- Maintain undo/redo and version history.
- Show changed artifacts and files.
- Keep generated edits attributable.
- Require explicit approval for destructive or external actions.
- Do not grant arbitrary filesystem, shell, network or native access to model-generated actions.
- Record execution and artifact events for debugging and learning evidence.

## Product outcome

The goal is not an AI chatbot with development features.

The goal is a **unified development environment** where a learner can think, speak, draw, type, build, test, revise and understand across devices and artifact types.

Comp Lab is the first demanding implementation of this architecture. The same interaction and capability layer must eventually serve every serious creation workflow in Shadecode Student.
