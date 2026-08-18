# Shadecode Student Brand Identity

## Status

Canonical identity updated August 2026.

## Direction

Shadecode Student should feel like a serious technology product that happens to be built for education, not a generic school application.

The identity therefore uses a simple geometric **S** as the primary mark. The symbol is recognizable without relying on graduation caps, books, brains, robots, stars, or other education clichés.

## Design principles

1. **Recognition first** — the silhouette must remain identifiable at favicon and app-icon sizes.
2. **One mark, many surfaces** — the same S geometry is used across web, PWA, desktop and future native packaging.
3. **One-color first** — the transparent cyan mark is the master; effects and gradients are optional atmosphere only.
4. **Vector-native** — SVG is the source of truth.
5. **Strong contrast** — Deep Ink and Shadecode Cyan form the core product pairing.
6. **Technology-led** — geometry, spacing and typography should feel like modern software rather than school stationery.

## Canonical assets

- `public/brand/shadecode-app-icon.svg` — transparent cyan master.
- `public/brand/shadecode-mark-white.svg` — reversed one-color master.
- `public/brand/shadecode-app-icon-dark.svg` — dark platform tile.
- `public/brand/shadecode-app-icon-light.svg` — light platform tile.
- `public/brand/shadecode-app-icon-maskable.svg` — adaptive/maskable tile.
- `public/brand/shadecode-student-logo.svg` — full product lockup.
- `src/components/brand/BrandMark.tsx` — inline UI mark.
- `src/components/brand/BrandLockup.tsx` — reusable product lockup.

## Colour system

- Shadecode Cyan: `#22D3EE`
- Shadecode Cyan Strong: `#0891B2`
- Shadecode Ink: `#06111C`
- Shadecode Surface: `#0B1724`

A cyan-blue-violet gradient may be used in campaign artwork or atmospheric surfaces. The master mark itself remains flat cyan.

## Typography

- **Michroma** for the wordmark and selected brand labels.
- **Space Grotesk** for headings, navigation, controls and display UI.
- **Inter** for reading, forms, tables and dense study content.

## Usage rules

### Do

- Preserve the proportions and negative space of the canonical S.
- Keep clear space around the mark.
- Use the transparent cyan master when the surrounding surface already provides a background.
- Use the dark/maskable tile when a platform expects a complete icon container.
- Use the full wordmark when the product name needs to be explicit.
- Prefer SVG source assets for new interfaces and packaging.

### Do not

- Put text inside the standalone icon.
- Add gradients, bevels, chrome, shadows or 3D effects to the master mark.
- Stretch, rotate, skew or independently reshape the symbol.
- Mix unrelated icon families into the primary identity.
- Use semantic colors as replacements for brand cyan.

## Small-size acceptance test

Inspect new exports at 16px, 32px, 48px, 96px, 180px, 192px, 512px and 1024px. Reject a revision if the S becomes tangled, thin, noisy, or dependent on the wordmark.

## Rationale

The S is deliberately doing less so it can mean more. A single memorable silhouette gives Shadecode Student a durable identity across software, education environments and physical products. Cyan supplies recognition, typography supplies personality, and supporting effects supply atmosphere without becoming the logo.
