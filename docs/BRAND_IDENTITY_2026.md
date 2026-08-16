# Shadecode Student Brand Identity 2026

## Status

Implemented in `shadecode-student` main on 15 August 2026. Mark geometry redrawn 15 August 2026 (Claude, direct owner request): the previous "ribbon S" (a flowing organic shape with a two-tone accent bar) is exactly the "twisted/ribbon-like S geometry" this doc's own "Do not regress" section already warned against -- it read as an unintentional artifact rather than a designed accent, especially at small size and at a distance. Replaced with a single-stroke, mathematically symmetric geometric S (one weight, one colour, round joins), verified against the W3C maskable-icon safe zone and at both 40px and 512px render sizes before shipping. No other change to the identity direction -- same S concept, same colour family, executed with tighter geometric discipline.

Redrawn again 15 August 2026, same day (Claude, direct owner request, working from a reference image the owner supplied): faceted hexagonal S, cyan-to-violet gradient, no baked-in text, no bevel/glow/chrome effects (those were tested and rejected -- see "Do not regress" below, they don't survive at building-signage distance or small icon size). Verified the shape holds up as a single flat colour with no gradient at all (the mark carries the identity, not the colour treatment) and re-checked against the maskable safe zone. This supersedes the single-stroke version two paragraphs up -- the gradient identity was a deliberate, informed choice from a direct reference, not a reversion to the earlier "twisted" mistake, which specifically involved fake 3D bevels and baked-in text, neither of which this version has.

## Canonical identity

Shadecode Student uses a simple geometric Shadecode S mark. The mark is the identity. It does not depend on a graduation cap, book, brain, lightbulb, star, ribbon, or other education cliché.

The product descriptor is `Student` and is never represented by a competing symbol.

## Design direction

The mark follows the same principles used by strong software and consumer app identities:

- one memorable silhouette
- simple geometry
- strong negative space
- recognizable at very small sizes
- works in one color before colour is added
- no decorative detail that disappears at favicon size
- square app icon and transparent brand mark share exactly the same core geometry

The goal is to make Shadecode recognizable before the user reads the name.

## Canonical assets

- `public/brand/shadecode-mark.svg` - transparent master for navbar, favicon, footer, hero, and general brand use.
- `public/brand/shadecode-icon-master.svg` - full-bleed square master used to generate all PWA/platform/maskable icon raster exports.
- `public/brand/shadecode-app-icon.svg` - rounded-tile square version of the same mark, for marketing/docs/store-listing contexts that want the icon already on its own tile.
- `public/brand/shadecode-student-logo.svg` - full wordmark lockup.

SVG is the source of truth. Raster exports must be generated from these masters rather than independently redrawn.

## App icon rules

The app icon must:

1. preserve the S silhouette at 16px, 32px, 48px, 180px, 192px, 512px, and 1024px;
2. retain generous clear space around the mark;
3. use a simple background with high contrast;
4. avoid tiny internal details;
5. remain identifiable when cropped into a circle or rounded-square platform shape;
6. work in monochrome as a secondary fallback.

## Brand colours

- Deep navy: `#0B0D12`
- Mark gradient: `#22D3EE` (cyan) -> `#6366F1` (indigo) -> `#A855F7` (violet), diagonal
- Single-colour fallback / UI accent: `#6366F1`

The colour treatment is secondary to the silhouette. The mark must remain strong without the gradient.

## Typography

Use the product's existing clean sans-serif typography. The wordmark should be compact, modern, and neutral. Do not add playful display fonts or excessive letter effects.

## Usage

Use the canonical mark consistently across:

1. browser favicon
2. PWA manifest
3. Android/app icon exports
4. Microsoft Store package assets
5. Apple touch icon
6. navbar/sidebar
7. landing page
8. social/profile identity
9. product splash/loading surfaces
10. future Shadecode Student desktop/mobile packages

## Quality gate

Before shipping any new logo export, check it at 16px, 32px, 64px, 180px, 512px, and 1024px. Reject an export if the S becomes ambiguous, thin, tangled, or visually noisy.

## Do not regress

Do not reintroduce:

- twisted/ribbon-like S geometry
- generic `SC` boxes
- diamond glyphs as the logo
- graduation caps, books, brains, lightbulbs, or robots as the primary mark
- stars or decorative symbols competing with the S
- emoji as brand marks
- unrelated icon families for primary product identity
- different logos for Shadecode and Shadecode Student

## Store packaging

Generate platform-specific raster assets from the canonical SVG master immediately before release. Required outputs should include at minimum:

- 16x16 favicon
- 32x32 favicon
- 48x48 favicon
- 180x180 Apple touch icon
- 192x192 PWA icon
- 512x512 PWA icon
- 1024x1024 master
- Windows Store tile/icon sizes required by the current Partner Center package
- Android adaptive icon foreground/background assets when packaging APK/AAB
