# Shadecode Student Brand Identity

## Status

Canonical identity updated August 2026 from the supplied Shadecode Student neon reference system.

## Direction

Shadecode Student should feel like a serious technology product that happens to be built for education, not a generic school application.

The identity therefore uses a simple geometric **S** as the primary mark. The symbol is recognizable without relying on graduation caps, books, brains, robots, stars, or other education clichés.

## Design principles

1. **Recognition first** — the silhouette must remain identifiable at favicon and app-icon sizes.
2. **One mark, many surfaces** — the same S geometry is used across web, PWA, desktop, Android and future native packaging.
3. **Neon identity, robust construction** — the supplied cyan-to-blue-to-violet treatment is the primary digital expression, while a flat one-color master remains available for constrained physical production.
4. **Vector-native** — SVG is the source of truth; raster exports are generated from it.
5. **Strong contrast** — Deep Ink and the neon gradient form the core product pairing.
6. **Technology-led** — geometry, spacing and typography should feel like modern software rather than school stationery.

## Canonical assets

- `public/brand/shadecode-app-icon.svg` — transparent neon gradient master.
- `public/brand/shadecode-mark-white.svg` — reversed one-color production master.
- `public/brand/shadecode-app-icon-dark.svg` — neon mark on the deep-ink platform tile.
- `public/brand/shadecode-app-icon-light.svg` — neon mark on the light platform tile.
- `public/brand/shadecode-app-icon-maskable.svg` — adaptive/maskable tile.
- `public/brand/shadecode-student-logo.svg` — full product lockup.
- `src/components/brand/BrandMark.tsx` — inline UI mark.
- `src/components/brand/BrandLockup.tsx` — reusable product lockup.
- `scripts/generate-brand-assets.mjs` — native PNG distribution generator.

## Colour system

- Shadecode Cyan: `#22D3EE`
- Shadecode Cyan Strong: `#0891B2`
- Shadecode Ink: `#06111C`
- Shadecode Surface: `#0B1724`
- Neon Gradient: `#00E5FF → #00A8FF → #245BFF → #7A3CFF → #C135FF`

The gradient is the canonical digital identity treatment. The flat cyan/white masters remain available for one-color production, engraving, embroidery, vinyl and other constrained processes.

## Typography

- **Michroma** for the wordmark and selected brand labels.
- **Space Grotesk** for headings, navigation, controls and display UI.
- **Inter** for reading, forms, tables and dense study content.

## Usage rules

### Do

- Preserve the proportions and negative space of the canonical S.
- Keep clear space around the mark.
- Use the transparent neon master on compatible digital surfaces.
- Use the dark tile when a platform expects a complete app container.
- Use the maskable tile for adaptive Android/PWA surfaces.
- Use the full wordmark when the product name needs to be explicit.
- Prefer SVG source assets for new interfaces and packaging.
- Generate native PNGs from the vector masters instead of redrawing them.

### Do not

- Put text inside the standalone icon.
- Replace the supplied S geometry with another symbol.
- Stretch, rotate, skew or independently reshape the symbol.
- Add bevels, chrome, fake 3D depth or decorative education symbols.
- Mix unrelated icon families into the primary identity.
- Use semantic colors as replacements for brand recognition.

## Small-size acceptance test

Inspect generated exports at 16px, 32px, 48px, 96px, 180px, 192px, 512px and 1024px. Reject a revision if the S becomes tangled, thin, noisy, or dependent on the wordmark.

## Rationale

The S is deliberately doing less so it can mean more. A single memorable silhouette gives Shadecode Student a durable identity across software, education environments and physical products. The neon gradient supplies the digital signature, typography supplies personality, and restrained effects supply atmosphere without altering the underlying symbol.
