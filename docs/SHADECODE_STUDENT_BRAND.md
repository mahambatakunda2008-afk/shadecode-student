# Shadecode Student Brand System

## Decision

The **Shadecode Student symbol is now a monochrome mark**. The master brand color is cyan, with a deep navy field used for dark surfaces and app-icon containers.

This is deliberate: a single-color mark survives far more real-world uses than a gradient. It can be printed, embroidered, laser-engraved, embossed, painted on a building, etched onto a device, rendered at favicon size, or reproduced in black and white without losing its identity.

## Master assets

- `public/brand/shadecode-mark.svg` — transparent primary mark; use `currentColor` so it can inherit the correct brand color.
- `public/brand/shadecode-mark-reversed.svg` — white mark for dark/photographic surfaces.
- `public/brand/shadecode-app-icon.svg` — cyan mark on the deep-navy rounded tile used for app/product surfaces.
- `src/components/brand/BrandMark.tsx` — reusable React mark for navigation, cards, results, loading states, achievements, and other UI surfaces.
- `src/components/brand/BrandLockup.tsx` — mark + Shadecode Student wordmark lockup.
- `src/app/icon.svg` — Next.js automatic application/browser icon.

## Color

### Primary brand

- Brand Cyan: `#22D3EE`
- Deep Navy: `#06111C`

### Accessible UI mapping

On light backgrounds, interactive controls use a darker cyan family value (`#0891B2`) so text and controls remain readable. On dark backgrounds, the brand cyan (`#22D3EE`) is used directly.

The product does **not** depend on purple or a cyan-purple gradient for recognition. Gradients may appear in external campaign artwork only when they do not replace the master mark.

## Typography

The geometric display character from the logo is carried into the interface through **Michroma** for headings, labels, navigation labels, buttons, and brand elements. Inter remains the body/UI reading font where long-form readability matters.

This creates a simple hierarchy:

- Brand/UI display: Michroma
- Body and dense information: Inter

## Usage rules

1. Never place `SHADECODE STUDENT` text inside the standalone icon.
2. Use the mark alone where the surrounding context already identifies the product.
3. Use the lockup for marketing, onboarding, splash screens, official documents, and presentations.
4. Keep clear space around the mark at least equal to the visual height of its smallest internal band.
5. Do not stretch, skew, rotate, outline, bevel, or add a drop shadow to the master mark.
6. Do not recolor the mark with arbitrary colors.
7. For one-color physical production, use Brand Cyan, black, or white according to the surface and production method.
8. For tiny UI sizes, prefer the simple mark without the wordmark.
9. For dark surfaces, the cyan mark on Deep Navy is the preferred app/product treatment.
10. The icon must remain recognizable at 16px and below, so unnecessary detail must never be added to the core mark.

## Product-wide placement

The mark is intended to appear consistently in:

- browser/app icons
- PWA install surfaces
- navigation and headers
- loading states
- empty states
- result and score pages
- achievement/badge surfaces
- notifications and completion states
- onboarding
- social/profile surfaces
- documentation
- presentations
- clothing
- signage and buildings
- computers, phones, tablets, and accessories

The symbol is the identity. The wordmark is supporting typography.
