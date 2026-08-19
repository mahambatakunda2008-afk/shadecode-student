# Shadecode Student Brand System v3

## Core decision

The **Shadecode Student S mark is the master identity**, using the exact interlocking S geometry established in the supplied neon branding references.

The production master is a **transparent cyan-to-blue-to-violet gradient mark**. The deep-ink, white, and light tiles are deployment variants, not replacements for the master geometry.

The same S must remain recognizable on a browser tab, phone, laptop, clothing, embroidery, vinyl signage, print, engraving, buildings, and device surfaces. Where a medium cannot reproduce the gradient, use the approved white/monochrome fallback rather than inventing a new treatment.

## Master assets

- `public/brand/shadecode-icon-master.svg` — canonical transparent neon master mark.
- `public/brand/shadecode-app-icon.svg` — transparent application mark.
- `public/brand/shadecode-mark.svg` — transparent inline gradient mark.
- `public/brand/shadecode-mark-white.svg` — transparent reversed white mark.
- `public/brand/shadecode-app-icon-dark.svg` — neon mark on deep-ink product tile.
- `public/brand/shadecode-app-icon-light.svg` — neon mark on light product tile.
- `public/brand/shadecode-app-icon-maskable.svg` — safe-area PWA/adaptive icon with a deep-ink background.
- `src/components/brand/BrandMark.tsx` — reusable inline gradient mark for product UI.
- `src/components/brand/BrandLockup.tsx` — mark + wordmark lockup.
- `src/app/icon.svg` — framework-managed browser/app icon.
- `src/app/apple-icon.svg` — framework-managed Apple icon.

## Color architecture

### Primary identity gradient

- **Neon Cyan:** `#00E5FF`
- **Electric Blue:** `#00A8FF`
- **Royal Blue:** `#245BFF`
- **Shadecode Violet:** `#7A3CFF`
- **Shadecode Magenta:** `#C135FF`
- **Shadecode Ink:** `#06111C`

The primary gradient is part of the identity and may be used directly on the master mark. It should remain cyan-led, clean, and crisp. Do not add glow, bevel, shadow, outline, or perspective to the master vector.

### UI semantics

- Gradient/cyan = brand identity and selected primary actions.
- Green = success/progress completion.
- Amber = warning/attention.
- Red = destructive/error.
- Blue = informational state.

Semantic colors never replace the S identity and the brand gradient must never be the only signal for a semantic state.

## Typography

- **Michroma** = brand voice: wordmark, compact brand labels, selected launch/marketing moments.
- **Space Grotesk** = product display/UI: page titles, headings, navigation, controls, data-heavy interface labels.
- **Inter** = long-form reading and dense utility text.

## Visual language

Shadecode Student should feel:

- precise, not decorative
- futuristic, not sci-fi cosplay
- energetic, not noisy
- premium, not glossy
- intelligent, not corporate
- youthful, not childish

Use deep surfaces, thin borders, restrained illumination, generous spacing, and strong typographic hierarchy. Effects belong to supporting surfaces, never the master mark.

## Icon rules

1. The standalone icon contains **no text**.
2. The supplied S geometry is canonical.
3. The transparent neon gradient is the preferred master treatment.
4. Use the dark tile where a platform requires a complete icon container.
5. Use the maskable variant for Android/PWA adaptive surfaces.
6. Use the white mark for one-color dark production and constrained physical applications.
7. Never stretch, skew, rotate, bevel, outline, or add a shadow to the master mark.
8. Never alter the silhouette of the S with effects.
9. Preserve generous clear space around the mark.
10. At tiny sizes, use the mark alone and avoid wordmarks.
11. For physical production, use the gradient where practical; otherwise use the approved white/monochrome fallback.

## Product-wide placement

The mark and visual language should be consistent across browser tabs, favicons, PWA/install surfaces, desktop/mobile app shells, navigation, headers, loading and empty states, result and score pages, exam/assessment surfaces, achievement and reward surfaces, notifications, onboarding, social/share cards, documentation, presentations, clothing, merchandise, school/university/polytechnic signage, laptops, phones, tablets, backpacks and accessories.

## The rule that keeps the system coherent

**The S is the identity. The neon gradient is the recognition treatment. Typography carries the personality. Effects create atmosphere.**
