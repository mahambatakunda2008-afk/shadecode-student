# Shadecode Student Brand System

This document describes the restored original Shadecode Student identity.

## Core identity

- **Symbol:** the original three-part abstract geometric mark, with softened joins and the original silhouette.
- **App tile:** deep navy, with a quiet border.
- **Accent:** cyan-to-blue-to-violet gradient, preserving the product's current colour identity.
- **Wordmark:** clear SHADECODE / STUDENT lockup. Keep the mark itself free of text.
- **Overall feel:** precise, calm, modern, premium. No book/pages or unrelated replacement symbols.

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

- `public/brand/shadecode-icon-master.svg` — canonical original abstract mark.
- `public/brand/shadecode-app-icon.svg` — primary icon tile.
- `public/brand/shadecode-app-icon-dark.svg` — dark icon tile.
- `public/brand/shadecode-app-icon-light.svg` — light icon tile.
- `public/brand/shadecode-app-icon-maskable.svg` — adaptive icon with safe area.
- `public/brand/shadecode-mark.svg` — transparent gradient mark.
- `public/brand/shadecode-mark-white.svg` and `shadecode-mark-reversed.svg` — monochrome mark.
- `public/brand/shadecode-student-logo.svg` — product lockup.
- `src/components/brand/BrandMark.tsx` — shared in-product logo component.
- `src/app/icon.svg` and `src/app/apple-icon.svg` — framework icon routes.
- `public/manifest.json` and `src/app/layout.tsx` — browser and install metadata.

## Button and contrast rules

1. Primary actions must be visually distinct from the surface behind them.
2. On dark surfaces, primary CTAs use the blue-violet action treatment with readable white text.
3. Keep hover and keyboard-focus states visible; focus must not depend on colour alone.
4. Keep touch targets comfortably usable on mobile.
5. Secondary and destructive actions must not visually compete with the primary action.
6. Check contrast in both themes and at mobile and desktop widths.

## Engineering rules

1. The React `BrandMark`, standalone SVGs, app icon, favicon, maskable icon, and raster assets must depict the same original abstract identity.
2. The original three-part geometry is the source of truth. Preserve its silhouette and proportions; use rounded joins only to soften overly sharp edges.
3. Preserve the safe area for maskable icons.
4. Do not replace the original mark with a folded-S redesign, a book, or another unrelated symbol.
5. Check shared components before declaring a branding update complete: page-specific icon files alone do not update logos inside modules.
6. Do not claim the production site has changed until a successful deployment is confirmed.
