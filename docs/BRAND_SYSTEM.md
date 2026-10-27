# Shadecode Student Brand System

This document describes the current Shadecode Student identity: the original layered mark with softened corners.

## Core identity

- **Symbol:** the original three-layer abstract mark: same silhouette and gradient as before, with every corner softened and a soft shadow so the pieces read as stacked layers. A curvy "folded S" redesign was tried and rejected; do not reintroduce it, and do not return to sharp unrounded corners.
- **App tile:** deep navy, with a quiet border.
- **Accent:** cyan-to-blue-to-violet gradient, preserving the product's current colour identity.
- **Wordmark:** clear SHADECODE / STUDENT lockup. Keep the mark itself free of text.
- **Overall feel:** precise, calm, modern, premium. No book/pages or other unrelated symbols.

## Current palette

| Token | Value | Role |
| --- | --- | --- |
| Shadecode Ink | `#081827` | App-icon field |
| Deep border | `#1B354A` | Quiet icon edge |
| Ribbon cyan | `#54DDEB` | Gradient start |
| Ribbon blue | `#2588E8` | Gradient transition |
| Ribbon royal blue | `#465BE5` | Gradient transition |
| Ribbon violet | `#7761D8` | Gradient end |
| Primary text | `#F8FAFC` | Text on dark surfaces |
| Secondary text | `#CBD5E1` | Supporting text on dark surfaces |
| CTA blue | `#3157D5` | Primary action background |
| CTA violet | `#6657D9` | Primary action gradient end |

Keep semantic UI colours separate from brand colours. Never rely on a gradient alone to communicate success, warning, error, or selection.

## Canonical assets

**Single source of truth: `src/lib/brand/markGeometry.json`.** Every file below is generated from it
(`npm run generate:brand`, which also runs on `predev` and `prebuild`). Edit the JSON, never the outputs.

- `src/lib/brand/markGeometry.ts` — typed access to the geometry for React and share-card code.
- `src/components/brand/BrandMark.tsx` — shared in-product mark (unique gradient ids per instance).
- `src/lib/og/OgBrandMark.tsx` — mark for generated share-card images.
- `public/brand/shadecode-icon-master.svg` — transparent master mark on a 1024 canvas.
- `public/brand/shadecode-mark.svg` — transparent gradient mark, square crop.
- `public/brand/shadecode-mark-white.svg` / `shadecode-mark-reversed.svg` — flat single-colour mark (white / ink).
- `public/brand/shadecode-app-icon.svg`, `-dark.svg`, `-light.svg` — rounded icon tiles.
- `public/brand/shadecode-app-icon-fullbleed.svg` — full-bleed square used for iOS icons.
- `public/brand/shadecode-app-icon-maskable.svg` — full-bleed adaptive icon with safe area.
- `public/brand/shadecode-student-logo.svg` — product lockup.
- `public/icons/*.png` — raster set (16–1024, dark, light, maskable, `apple-touch-icon.png`, `favicon.png`).
- `public/icons/shadecode-student.svg`, `public/favicon.svg`, `src/app/icon.svg` — tile SVGs for the manifest, legacy favicon and Next icon route.
- `public/og-image.png` — static social image. Not generated: re-composite the tile if the mark changes.
- `public/manifest.json` and `src/app/layout.tsx` — install and browser metadata. Icons are declared once, in `layout.tsx` metadata.

Note: Next.js does not support SVG for `apple-icon`, so there is no `src/app/apple-icon.svg`; iOS uses `public/icons/apple-touch-icon.png`.

## Button and contrast rules

1. Primary actions must be visually distinct from the surface behind them.
2. On dark surfaces, primary CTAs use the blue-violet action treatment with readable white text.
3. Keep hover and keyboard-focus states visible; focus must not depend on colour alone.
4. Keep touch targets comfortably usable on mobile.
5. Secondary and destructive actions must not visually compete with the primary action.
6. Check contrast in both themes and at mobile and desktop widths.

## Engineering rules

1. The React `BrandMark`, standalone SVGs, app icon, favicon, maskable icon and raster assets must all depict the same layered mark. `src/lib/brand/markGeometry.test.ts` enforces this and fails if the retired angular mark reappears.
2. Change the mark only in `markGeometry.json`, then run `npm run generate:brand` and commit the regenerated assets.
3. iOS and maskable icons must be opaque, full-bleed squares; keep the glyph inside the maskable safe area.
4. Do not use a book/pages symbol or another unrelated replacement.
5. Check shared components before declaring a branding update complete: page-specific icon files alone do not update logos inside modules.
6. Do not claim the production site has changed until a successful deployment is confirmed.
