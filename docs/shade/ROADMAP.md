# Shade Roadmap

## Phase 0: Design core

Status: **in progress**

- [x] lexer and parser
- [x] interpreter
- [x] semantic model
- [x] project model
- [x] deterministic artifact identity
- [x] project graph
- [x] executable IR
- [x] execution evidence
- [x] Comp Lab environment registration
- [x] official documentation hub

## Phase 1: Make Shade inspectable

Priority: **now**

- [ ] IR source-location mapping
- [ ] IR inspector in Comp Lab
- [ ] semantic inspector
- [ ] project graph viewer
- [ ] capability requirement viewer
- [ ] source-to-IR navigation
- [ ] runtime event timeline
- [ ] structured Shade test runner

## Phase 2: Make Shade reliable

- [ ] multi-file module resolution
- [ ] package manifest validation
- [ ] deterministic builds
- [ ] snapshot/golden tests
- [ ] better diagnostics and source spans
- [ ] debugger model
- [ ] breakpoints and stepping
- [ ] reproducible execution evidence

## Phase 3: Make Shade safe to execute elsewhere

- [ ] capability broker enforcement
- [ ] isolated server sandbox
- [ ] CPU, memory, wall-time, and output limits
- [ ] protected execution for assessment
- [ ] runtime provenance
- [ ] artifact/version IDs in every execution

## Phase 4: Expand the platform

- [ ] device capability bridge
- [ ] local native runtime
- [ ] trusted Shade node
- [ ] edge execution
- [ ] offline synchronization
- [ ] device-to-device computation
- [ ] distributed project execution

## Phase 5: Shade ecosystem

- [ ] package registry
- [ ] reusable modules
- [ ] project templates
- [ ] project collaboration
- [ ] provenance and signatures
- [ ] deployment targets
- [ ] external language interoperability
- [ ] SDK for third-party capabilities

## Phase 6: Learning-native computing

- [ ] curriculum-aware Shade objectives
- [ ] learner-specific diagnostics
- [ ] adaptive exercises
- [ ] project-based assessment
- [ ] evidence linked to Learning Graph
- [ ] Cortex explanations and next-step recommendations

## Decision rule

Every milestone should answer one question:

> Does this make Shade more real, more useful, more understandable, or more safely executable?

If not, it is probably a distraction.
