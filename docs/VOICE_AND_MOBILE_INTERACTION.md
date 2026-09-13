# Voice and Mobile Interaction

Mobile should not be treated as a smaller desktop. Where typing is slow or error-prone, Shadecode should provide alternative interaction modes.

## Core model

```text
                 MOBILE SHADECODE
                       |
          +------------+------------+
          |            |            |
        Touch        Voice       Camera
          |            |            |
          +------------+------------+
                       |
                Intent Layer
                       |
          +------------+------------+
          |            |            |
       Navigate     Create       Answer
          |            |            |
          +------------+------------+
                       |
                Shared Platform
```

Voice is not only speech-to-text. The system should understand an intent and then produce an explicit action or draft that the user can review.

## Voice modes

### 1. Dictation

Speak normal text into lessons, notes, answers, feedback and project files.

### 2. Command

Examples:

- open Physics
- start a focus session
- show my timetable
- run this project
- explain this error
- create a revision task

Commands must be permission-scoped and confirmed when an action has meaningful consequences.

### 3. Code dictation

A learner can describe code verbally and receive editable source, for example:

```text
"Create a function called average that takes an array of numbers and returns the mean."
```

The result is a draft, not silently executed code. The IDE should show what was generated and allow the learner to inspect it.

### 4. Code explanation

A learner can select code and ask verbally for an explanation, debugging help, a trace, or a simpler explanation.

### 5. Answer capture

For supported learning activities, spoken answers can be transcribed into the answer field. The original audio should not be retained unless the product explicitly needs it and the user permits it.

### 6. Camera + voice

A learner can photograph a handwritten problem, diagram, practical question or page, then verbally ask what they want done with it.

Examples:

- explain this
- check my working
- turn this into a question
- read the diagram

## Mobile Comp Lab

Typing code on a phone remains useful for small edits, but it should not be the only interaction model.

Mobile Comp Lab should support:

- voice-to-code drafting
- code completion
- error explanation
- spoken navigation
- run/build/test commands
- quick file creation
- touch-friendly symbol insertion
- project browsing
- remote or native execution through a trusted runtime

A phone can therefore act as the control surface while a laptop, desktop or trusted ShadeNet node performs heavy compilation.

## Trust and safety

Voice actions should be classified:

```text
READ-ONLY
  -> execute immediately when safe

DRAFT
  -> generate content for review

MUTATING
  -> require explicit confirmation when consequential

PRIVILEGED
  -> require capability permission and confirmation
```

The voice layer must not become an unrestricted command shell. Natural language is converted into typed platform intents, and only allowed intents reach platform services.

## Offline strategy

Basic dictation and selected commands should work offline when the device provides an appropriate speech engine. More complex language understanding can fall back to local models, a trusted personal device, ShadeNet or cloud according to policy.

## Accessibility

Voice should complement, not replace, touch and keyboard input. Every important voice action needs a visible equivalent and users should be able to correct transcription before committing important work.
