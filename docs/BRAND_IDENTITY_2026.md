# Shadecode Student Brand Identity 2026

## Status

This document records the current production identity based on the supplied neon branding and design-system references. It supersedes the earlier monochrome-only master treatment.

## Canonical identity

Shadecode Student uses the **geometric interlocking S mark** as its primary identity. The standalone master is a transparent **cyan-to-blue-to-violet neon gradient** mark.

The geometry remains the constant recognition anchor. The gradient is part of the canonical visual identity and should be used wherever the medium supports colour. Approved white/monochrome variants remain available for constrained physical production.

### Primary gradient

`#00E5FF` → `#00A8FF` → `#245BFF` → `#7A3CFF` → `#C135FF`

## Canonical assets

- `public/brand/shadecode-icon-master.svg` — transparent neon master.
- `public/brand/shadecode-app-icon.svg` — transparent application mark.
- `public/brand/shadecode-mark.svg` — canonical transparent inline gradient mark.
- `public/brand/shadecode-mark-white.svg` — transparent reversed white mark.
- `public/brand/shadecode-app-icon-dark.svg` — neon mark on deep-ink tile.
- `public/brand/shadecode-app-icon-light.svg` — neon mark on light tile.
- `public/brand/shadecode-app-icon-maskable.svg` — maskable safe-area tile.
- `public/brand/shadecode-student-logo.svg` — wordmark lockup.
- `src/components/brand/BrandMark.tsx` — canonical inline component.
- `src/components/brand/BrandLockup.tsx` — canonical product lockup.
- `src/app/icon.svg` — framework-managed favicon/application icon.
- `src/app/apple-icon.svg` — framework-managed Apple icon.

SVG is the source of truth. Platform raster assets should be generated from these masters rather than independently redrawn.

## Icon rules

1. No text inside the standalone icon.
2. The supplied S geometry is canonical.
3. The neon gradient is the primary brand treatment.
4. Deep Ink is a container/background, not part of the transparent master mark.
5. Preserve clear space and proportions.
6. The mark must remain recognizable at tiny sizes.
7. Never add bevels, outlines, shadows, glow, or 3D treatment to the master vector.
8. For one-color physical production, use the approved white/monochrome variant according to contrast and production constraints.
9. Use the maskable tile for adaptive platform surfaces.

## Colour system

- Neon Cyan: `#00E5FF`
- Electric Blue: `#00A8FF`
- Royal Blue: `#245BFF`
- Shadecode Violet: `#7A3CFF`
- Shadecode Magenta: `#C135FF`
- Shadecode Ink: `#06111C`
- Shadecode Surface: `#0B1724`

Semantic colours remain separate from brand recognition.

## Typography

- **Michroma**: wordmark and selected brand labels.
- **Space Grotesk**: product headings, navigation, controls and display UI.
- **Inter**: body copy, forms, tables and long-form reading.

The display system should feel technical and modern without making study content tiring to read.

## Quality gate

Every new export must be checked at 16px, 32px, 48px, 64px, 120px, 180px, 192px, 512px, and 1024px. Reject anything that makes the S ambiguous, noisy, thin, distorted, or dependent on a visual effect.

## Do not regress

Do not reintroduce:

- baked-in `SHADECODE` or `STUDENT` text inside the standalone icon
- decorative education clichés as the primary mark
- arbitrary alternate icon families
- an unrelated gradient that changes the supplied identity
- bevels, chrome, fake 3D depth, or glow baked into the mark
- competing Shadecode Student symbols

## Real-world applications

The identity is designed to survive digital and physical use: browsers, PWA installs, Android/iOS packaging, Windows packaging, clothing, embroidery, engraving, printed materials, school/university/polytechnic signage, buildings, laptops, phones, tablets, bags and accessories.
