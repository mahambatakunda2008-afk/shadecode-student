# Glass-Inspired Visual Experience Upgrade

**Status:** Documented / not yet implemented platform-wide  
**Recorded:** 2026-10-25  
**Scope:** Shadecode Student and Cortex OS  
**Principle:** Upgrade the existing product. Do not replace its information architecture or working learning flows.

## Product feeling
Shadecode Student should feel premium, tactile, fluid, intelligent, and satisfying to use: a personal academic operating system, not a generic dashboard or an AI chatbot wrapper. The tagline remains **“Study smarter. Live sharper.”** The target is a cohesive visual and interaction system, not a one-off glass effect on a few buttons.

## Visual direction
- Use **selective glassmorphism**: translucent surfaces, restrained backdrop blur, fine borders, layered depth, and controlled reflections.
- Preserve the existing cyan/blue identity as an accent. Use light, color, and glow to communicate hierarchy or a real state, not as decoration everywhere.
- Pair glass surfaces with solid, high-contrast surfaces so essential text, controls, and learning content remain clear.
- Establish reusable tokens for glass opacity, blur, borders, elevation, radii, spacing, typography, focus rings, and motion.
- Keep dark mode polished and preserve a coherent light theme where supported.
- Use consistent, high-quality icons and typography. Avoid bulky cards, excessive gradients, noisy glows, generic AI aesthetics, and competing floating widgets.

## Interaction and feel
- Make controls feel tactile with restrained hover, pressed, focus, and transition states.
- Use purposeful microinteractions for real actions: saved progress, completed steps, loading, success, and recovery.
- Respect `prefers-reduced-motion`; avoid motion that delays learning or creates distraction.
- Keep loading/progress states truthful and connected to actual work or saved state.
- Ask Cortex should remain compact, translucent, discoverable, and usable on both mobile and desktop without covering navigation or study content.
- Maintain one persistent floating app action at most. Contextual actions should live where they are useful.

## Mobile, accessibility, and performance
- Design and verify at **360px and wider**, including safe-area insets and bottom navigation.
- Prevent overlap, horizontal overflow, layout shift, and tiny touch targets.
- Preserve keyboard access, visible focus, screen-reader labels, WCAG 2.2 AA contrast, and reduced-motion preferences.
- Blur and transparency must degrade gracefully on low-powered devices; avoid costly full-screen effects and unnecessary animation.
- Keep core study workflows usable on low data and when optional AI services are unavailable.

## Rollout plan
1. Audit existing design tokens, global CSS, navigation, dashboard, Learn, Exam Hub, study sessions, settings, and Cortex before editing. Reuse existing components rather than creating duplicates.
2. Define semantic design tokens and a small set of reusable surface/interaction primitives.
3. Apply the system in focused passes, starting with the app shell and highest-frequency learner flows.
4. Verify mobile and desktop layouts, dark/light themes, reduced motion, keyboard navigation, contrast, and loading/empty/error states.
5. Run available CI/build checks and inspect a deployed preview before declaring visual completion.

## Acceptance criteria
- The product feels like one deliberately designed system across modules.
- Glass treatment improves depth and hierarchy without harming readability.
- The interface feels responsive and satisfying without becoming flashy or distracting.
- Ask Cortex is present on mobile and desktop, compact, and does not overlap navigation/content.
- There is no duplicate floating feedback/chat launcher.
- Existing routes, auth, learning logic, data integrity, and accessibility remain intact.
- No fake progress, fabricated learning data, or unverified claims of functionality.
- Visual success is not declared until the rendered preview is checked.

## Related work
The current focused launcher cleanup is tracked in [PR #482](https://github.com/mahambatakunda2008-afk/shadecode-student/pull/482). It makes Ask Cortex compact/translucent and removes the overlapping floating feedback launcher; it is not the full visual-system upgrade described here.
