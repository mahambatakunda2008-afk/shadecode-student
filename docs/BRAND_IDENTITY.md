# Shadecode Student Brand Identity

## Status

Canonical identity updated August 2026.

## Direction

Shadecode Student should look like a serious technology product that happens to be built for education, not a generic school application.

The identity therefore uses a simple geometric **S** as the primary brand mark. The mark is intentionally recognizable without relying on a graduation cap, book, brain, lightbulb, robot, or decorative education symbol.

## Design principles

1. **Recognition first** — the silhouette must remain identifiable at favicon and app-icon sizes.
2. **One mark, many surfaces** — the same S geometry is used for the app icon, standalone mark, and wordmark.
3. **No visual noise** — no twisted ribbons, unnecessary internal symbols, or ornamental stars.
4. **Vector-native** — the canonical source is SVG so it scales cleanly across web, PWA, desktop, and future native packaging.
5. **Strong contrast** — the app icon uses deep navy with a blue/cyan S; the standalone mark uses blue with a restrained cyan highlight.
6. **Technology-led** — geometry and typography should feel closer to a modern software company than a traditional school brand.

## Canonical assets

- `public/brand/shadecode-app-icon.svg` — primary app/PWA icon.
- `public/brand/shadecode-mark.svg` — standalone brand mark.
- `public/brand/shadecode-student-logo.svg` — full Shadecode Student wordmark.

The application metadata and PWA manifest reference these canonical SVG assets.

## Mark construction

The mark is a single rounded S-shaped path with consistent visual weight. The app icon uses a bold blue stroke with a narrower cyan highlight. The standalone mark uses the same geometry without a surrounding container.

The construction is deliberately simple enough to survive reduction to small sizes. At 16–32 px, the S should read as one solid symbol rather than a collection of details.

## Colour system

- Deep Navy: `#0B0D12`
- Mark gradient: Electric Cyan `#22D3EE` -> Indigo `#6366F1` -> Violet `#A855F7`
- Light wordmark: `#F8FAFC`

The app icon avoids gradients. This keeps the silhouette crisp and reduces visual clutter at small sizes.

## Usage rules

### Do

- Preserve the proportions of the canonical S.
- Keep adequate clear space around the mark.
- Use the app icon as the compact identity for installed apps and PWA surfaces.
- Use the full wordmark where the product name needs to be explicit.
- Prefer the SVG source assets for new interfaces and packaging.

### Do not

- Reintroduce the previous twisted/ribbon construction.
- Add a knowledge star or other decorative symbol inside the S.
- Stretch, rotate, skew, or independently reshape the mark.
- Mix unrelated icon styles into the primary brand identity.
- Treat emoji or generic education clip-art as brand assets.

## Small-size acceptance test

Before approving a future revision, inspect the mark at approximately:

- 16 px — favicon/browser tab
- 32 px — compact navigation
- 48 px — mobile shortcut
- 96 px — launcher preview
- 192 px — PWA icon
- 512 px — high-resolution app icon

A revision fails if the S loses its identity, develops awkward tangencies, becomes visually tangled, or needs the wordmark to be recognizable.

## Rationale

The previous identity attempted to combine an S/ribbon structure with a knowledge star. At small sizes that created a visually tangled silhouette and made the mark feel more like decorative education artwork than a technology brand.

The new system removes those competing signals and makes the **S itself the brand**. This gives Shadecode a stronger foundation for Student, SCS, Idea Vault, future university products, and the wider Shadecode ecosystem.
