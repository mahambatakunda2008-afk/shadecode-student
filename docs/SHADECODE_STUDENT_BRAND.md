# Shadecode Student Brand System v2

## Core decision

The **Shadecode Student S mark is the master identity**.

The production master is a **single-color cyan mark on transparent background**. A deep-ink tile is a platform container, not part of the logo itself.

This gives one symbol a much longer life: it works in a browser tab, on a phone, on a laptop lid, on clothing, in embroidery, in vinyl signage, in print, in engraving, and in one-color production without depending on effects.

## Master assets

- `public/brand/shadecode-app-icon.svg` — transparent cyan master mark.
- `public/brand/shadecode-mark-white.svg` — transparent reversed white mark.
- `public/brand/shadecode-app-icon-dark.svg` — cyan mark on deep-ink product tile.
- `public/brand/shadecode-app-icon-light.svg` — dark-cyan mark on light product tile.
- `public/brand/shadecode-app-icon-maskable.svg` — safe-area PWA/adaptive icon with a deep-ink background.
- `src/components/brand/BrandMark.tsx` — reusable inline mark for the product UI.
- `src/components/brand/BrandLockup.tsx` — mark + wordmark lockup.
- `src/app/icon.svg` — framework-managed browser/app icon.
- `src/app/apple-icon.svg` — framework-managed Apple icon.

## Color architecture

### Core identity

- **Shadecode Cyan:** `#22D3EE`
- **Shadecode Cyan Strong:** `#0891B2`
- **Shadecode Ink:** `#06111C`

The icon itself stays monochrome. Cyan is the recognition color.

A restrained cyan-blue-violet gradient exists only as an **atmospheric campaign treatment**. It must never be required to recognize the mark.

### UI semantics

- Cyan = primary action, focus, active state, brand recognition.
- Green = success/progress completion.
- Amber = warning/attention.
- Red = destructive/error.
- Blue = informational state.

Semantic colors never replace the master brand color in the logo.

## Typography

The system now uses two complementary typefaces:

- **Michroma** = brand voice only: wordmark, compact brand labels, selected launch/marketing moments.
- **Space Grotesk** = product display/UI: page titles, headings, navigation, controls, data-heavy interface labels.
- **Inter** = long-form reading and dense utility text.

This is intentionally different from making every heading Michroma. Michroma carries the futuristic identity, while Space Grotesk keeps the product fast to scan and comfortable to use for hours of studying.

## Visual language

Shadecode Student should feel:

- precise, not decorative
- futuristic, not sci-fi cosplay
- energetic, not noisy
- premium, not glossy
- intelligent, not corporate
- youthful, not childish

Use deep surfaces, thin borders, restrained cyan illumination, generous spacing, and strong typographic hierarchy. Glass effects and glow belong to supporting surfaces, never the master mark.

## Icon rules

1. The standalone icon contains **no text**.
2. The transparent cyan mark is the preferred master asset.
3. Use the dark tile where a platform requires a complete icon container.
4. Use the maskable variant for Android/PWA adaptive surfaces.
5. Use the white mark for one-color dark production.
6. Never stretch, skew, rotate, bevel, outline, or add a shadow to the master mark.
7. Never attach a gradient directly to the master mark.
8. Preserve generous clear space around the mark.
9. At tiny sizes, use the mark alone and avoid wordmarks.
10. For physical production, use cyan, black, or white depending on the material and contrast requirements.

## Product-wide placement

The mark and visual language should be consistent across:

- browser tabs and favicons
- PWA and install surfaces
- desktop/mobile app shells
- navigation and headers
- loading and empty states
- result and score pages
- exam/assessment surfaces
- achievement and reward surfaces
- notifications and completion states
- onboarding
- social/share cards
- documentation and presentations
- clothing and merchandise
- school/university/polytechnic signage
- laptops, phones, tablets, backpacks and accessories

## The rule that keeps the system coherent

**The S is the identity. Cyan is the recognition color. Typography carries the personality. Effects create atmosphere.**

Never reverse those priorities.
