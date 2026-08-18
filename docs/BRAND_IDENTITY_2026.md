# Shadecode Student Brand Identity 2026

## Status

This document records the current production identity. It supersedes earlier iterations that experimented with gradients, violet accents, and alternate geometric constructions.

## Canonical identity

Shadecode Student uses the **geometric S mark** as its primary identity. The standalone master is a flat, transparent **Shadecode Cyan `#22D3EE`** mark.

The symbol must work before any colour treatment is added. A cyan-blue-violet gradient may appear in campaign artwork or atmospheric product surfaces, but it is not part of the canonical mark.

## Canonical assets

- `public/brand/shadecode-app-icon.svg` — transparent cyan master.
- `public/brand/shadecode-mark-white.svg` — transparent reversed master.
- `public/brand/shadecode-app-icon-dark.svg` — cyan mark on deep-ink tile.
- `public/brand/shadecode-app-icon-light.svg` — dark-cyan mark on light tile.
- `public/brand/shadecode-app-icon-maskable.svg` — maskable safe-area tile.
- `public/brand/shadecode-student-logo.svg` — wordmark lockup.
- `src/components/brand/BrandMark.tsx` — canonical inline component.
- `src/components/brand/BrandLockup.tsx` — canonical product lockup.
- `src/app/icon.svg` — framework-managed favicon/application icon.
- `src/app/apple-icon.svg` — framework-managed Apple icon.

SVG is the source of truth. Platform raster assets should be generated from these masters rather than independently redrawn.

## Icon rules

1. No text inside the standalone icon.
2. Transparent cyan is the primary brand asset.
3. Deep Ink is a container/background, not part of the mark.
4. Preserve clear space and proportions.
5. The mark must remain recognizable at tiny sizes.
6. Never add bevels, outlines, shadows, 3D treatment, or gradients to the master mark.
7. For one-color physical production, use cyan, black, or white according to contrast and production constraints.
8. Use the maskable tile for adaptive platform surfaces.

## Colour system

- Shadecode Cyan: `#22D3EE`
- Shadecode Cyan Strong: `#0891B2`
- Shadecode Ink: `#06111C`
- Shadecode Surface: `#0B1724`

Semantic colours remain separate from brand recognition.

## Typography

- **Michroma**: wordmark and selected brand labels.
- **Space Grotesk**: product headings, navigation, controls and display UI.
- **Inter**: body copy, forms, tables and long-form reading.

The display system should feel technical and modern without making study content tiring to read.

## Quality gate

Every new export must be checked at 16px, 32px, 48px, 64px, 180px, 192px, 512px, and 1024px. Reject anything that makes the S ambiguous, noisy, thin, or dependent on a visual effect.

## Do not regress

Do not reintroduce:

- baked-in `SHADECODE` or `STUDENT` text inside the icon
- decorative education clichés as the primary mark
- arbitrary alternate icon families
- gradients as a requirement for recognition
- bevels, chrome, fake 3D depth, or glow baked into the mark
- competing Shadecode Student symbols

## Real-world applications

The identity is designed to survive digital and physical use: browsers, PWA installs, Android/iOS packaging, Windows packaging, clothing, embroidery, engraving, printed materials, school/university/polytechnic signage, laptops, phones, tablets, bags and accessories.
