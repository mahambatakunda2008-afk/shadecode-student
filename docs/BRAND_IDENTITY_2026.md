# Shadecode Student Brand Identity 2026

## Status

Implemented in `shadecode-student` main on 15 August 2026.

## Canonical assets

- `public/brand/shadecode-mark.svg` — master app symbol.
- `public/brand/shadecode-student-logo.svg` — primary product wordmark.

The Student product inherits the Shadecode symbol rather than using a separate unrelated icon. This creates a visible family relationship between the studio and its learning product.

## Symbol

The mark is a geometric `S` with a central four-point knowledge star. The `S` identifies Shadecode and the star represents knowledge, clarity and achievement.

The symbol is designed to remain recognizable without the word `Student`, which is important for mobile launchers, favicons, PWA install surfaces and compact navigation.

## Product wordmark

`SHADECODE` is the parent name. `STUDENT` is the product descriptor and uses the same blue family with increased tracking so it reads as a product line rather than a second company.

## Palette

- Bright blue: `#38BDF8`
- Primary blue: `#2563EB`
- Deep blue: `#1D4ED8`
- App background: `#06111F`
- Light text: `#F8FAFC`

## Applied surfaces

The canonical mark is now wired into:

- Sidebar brand area
- Next.js metadata/favicon surface
- PWA manifest as the canonical SVG icon
- App theme color

The existing PNG icon entries remain as fallback compatibility assets. They should be regenerated from the canonical SVG before store submission so Android, Microsoft Store and other raster-only surfaces use the new mark as well.

## Design principles

1. One recognizable symbol across Shadecode products.
2. Vector-first source of truth.
3. Strong silhouette at small sizes.
4. No emoji, generic `SC` badge or unrelated stock icon as a brand mark.
5. Blue is the primary brand signal; do not introduce arbitrary per-product colors.
6. Keep generous clear space around the symbol.

## Benchmarking rationale

The identity was optimized against recognizable education products and modern technology brands. The goal is not to imitate them, but to satisfy the same practical requirements: distinct silhouette, instant recognition, strong small-size performance, restrained geometry and easy reproduction across web, mobile and stores.

## Store-ready export rule

Treat `public/brand/shadecode-mark.svg` as the master. Generate official PNG/ICO exports from it at 1024, 512, 192, 180 and 32px when preparing store packages. Do not manually redraw or modify the icon for individual platforms.
