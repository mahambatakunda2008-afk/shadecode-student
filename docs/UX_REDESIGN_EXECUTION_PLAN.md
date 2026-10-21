# Shadecode Student UI/UX Redesign: Execution Plan

## Goal
Make Shadecode Student feel like one coherent academic workspace, not a collection of separately styled modules. Preserve product behavior and improve clarity, readability, accessibility, and mobile usability.

## Product rules
- Upgrade the existing product; do not redesign for novelty or remove useful workflows.
- The next meaningful student action should be easy to identify.
- AI is optional infrastructure: the interface must remain useful when Cortex or network services fail.
- No floating control may obscure lesson text, question controls, or navigation.
- Mobile layouts are first-class. Avoid tiny labels, horizontal overflow, hidden actions, and tap targets below 44px.
- Keep content and controls visually distinct. Use color for hierarchy and state, not decoration.
- Loading, empty, offline, stale-data, and error states must explain what happened and offer a useful next action.
- Preserve authentication, saved lessons, exams, student progress, offline/PWA behavior, and accessibility.

## Work sequence
1. **Dashboard and shared shell**: readability, content hierarchy, navigation, safe areas, keyboard focus, overflow, and loading/error states.
2. **Learn workspace**: lesson reading width, subject/topic selection, generation progress, generation recovery, save state, and completion.
3. **Exam Simulator and past papers**: question readability, answer controls, timer visibility, marking, results, and mobile drawing/scrolling.
4. **Cortex and study tools**: contextual assistance, recovery paths, Math Checker, Computer Science tools, Focus, and Timetable.
5. **Authentication and onboarding**: clear field labels, errors, recovery, setup progress, and no confusing repeated requests.
6. **System-wide consistency**: icon meaning, type scale, spacing, contrast, touch targets, motion, responsive behavior, and duplicate/contradictory CSS.

## Acceptance checklist for every changed surface
- [ ] No horizontal page overflow at 320px, 360px, 390px, and 430px widths.
- [ ] Main content is not covered by bottom navigation, toasts, floating panels, or dialogs.
- [ ] Body and helper text are readable without zooming; essential controls are at least 44px tall.
- [ ] Loading, empty, offline, and failure states have clear copy and recovery actions.
- [ ] Keyboard focus is visible and reduced-motion preferences are respected.
- [ ] Existing routes and core actions remain intact.
- [ ] Automated checks pass; if real-device or production checks were not run, report that explicitly.

## First implementation
The dashboard readability pass raises small dashboard copy to a more legible size, allows supporting text to wrap instead of being cut off, and increases key action targets. This is one controlled improvement, not a claim that the full redesign is complete.

## Verification status
Repository changes must be checked by CI and, where possible, a deployed build and real phone. A merged PR alone is not proof of production deployment or successful device testing.
