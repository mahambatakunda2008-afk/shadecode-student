# Shadecode Student Brand System

This document describes the current product identity. The smooth folded-S ribbon is the canonical symbol across web, PWA, app, and supporting assets.

## Core identity

- **Symbol:** a continuous folded S ribbon with restrained layered highlights.
- **App tile:** deep navy, with a fine quiet border.
- **Accent:** controlled cyan-to-blue-to-violet gradient.
- **Wordmark:** clear SHADECODE / STUDENT lockup. Keep the mark itself free of text.
- **Overall feel:** precise, calm, modern, premium. Avoid unnecessary glow, extra symbols, and clutter.

## Current palette

| Token | Value | Role |
| --- | --- | --- |
| Shadecode Ink | `#081827` | Current app-icon field |
| Deep border | `#1B354A` | Quiet icon edge |
| Ribbon cyan | `#54DDEB` | Fold highlight / gradient start |
| Ribbon blue | `#2588E8` | Main gradient transition |
| Ribbon royal blue | `#465BE5` | Ribbon body |
| Ribbon violet | `#7761D8` | Gradient end |
| Primary text | `#F8FAFC` | Text on dark surfaces |
| Secondary text | `#CBD5E1` | Supporting text on dark surfaces |
| CTA blue | `#3157D5` | Primary action background |
| CTA violet | `#6657D9` | Primary action gradient end |

Keep semantic UI colors separate from brand colors. Never rely on a gradient alone to communicate success, warning, error, or selection.

## Canonical assets

- `public/icons/shadecode-student.svg` — canonical app icon artwork and field.
- `public/brand/shadecode-app-icon.svg` — primary icon tile.
- `public/brand/shadecode-app-icon-dark.svg` — dark icon tile.
- `public/brand/shadecode-app-icon-light.svg` — light icon tile.
- `public/brand/shadecode-app-icon-maskable.svg` — adaptive icon with safe area.
- `public/brand/shadecode-mark.svg` — transparent gradient ribbon.
- `public/brand/shadecode-mark-white.svg` and `shadecode-mark-reversed.svg` — monochrome ribbon.
- `public/brand/shadecode-student-logo.svg` — product lockup.
- `src/components/brand/BrandMark.tsx` — shared in-product logo component.
- `src/components/brand/BrandLockup.tsx` — shared logo and wordmark component.
- `src/app/icon.svg` and `src/app/apple-icon.svg` — framework icon routes.
- `public/manifest.json` and `src/app/layout.tsx` — browser and install metadata.

## Button and contrast rules

1. Primary actions must be visually distinct from the surface behind them.
2. On dark surfaces, primary CTAs use the blue-violet action treatment with readable white text.
3. Do not style a primary action as a plain white rectangle unless the surrounding surface gives it strong contrast and clear affordance.
4. Keep hover and keyboard-focus states visible; focus must not depend on color alone.
5. Keep touch targets comfortably usable on mobile.
6. Secondary and destructive actions must not visually compete with the primary action.
7. Check contrast in both themes and at mobile and desktop widths.

## Engineering rules

1. The React `BrandMark`, standalone SVGs, app icon, favicon, maskable icon, and raster assets must depict the same folded-S identity.
2. Use the SVG artwork as the source of truth; generate raster sizes reproducibly.
3. Preserve the safe area for maskable icons.
4. Do not stretch, skew, bevel, or replace the ribbon with the legacy angular mark.
5. Avoid adding a book or other unrelated symbol to the standalone icon.
6. Check shared components before declaring a branding update complete: page-specific icon files alone do not update logos inside modules.
7. Do not claim the production site has changed until a successful deployment is confirmed.

The folded S is the recognition anchor. Consistency across every surface matters more than adding decorative effects.
