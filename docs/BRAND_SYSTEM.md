# Shadecode Student Brand System v2

`docs/SHADECODE_STUDENT_BRAND.md` is the detailed source of truth. This file is the concise engineering reference.

## Core identity

The Shadecode Student symbol is a **single-color transparent mark**. The master recognition color is Shadecode Cyan `#22D3EE`.

The cyan-blue-violet gradient from the visual references is an optional campaign/atmosphere treatment only. It is never required for recognition and is never applied to the master icon.

## Assets

- `public/brand/shadecode-app-icon.svg` — transparent cyan master mark.
- `public/brand/shadecode-mark-white.svg` — transparent white/reversed mark.
- `public/brand/shadecode-app-icon-dark.svg` — cyan mark on deep-ink tile.
- `public/brand/shadecode-app-icon-light.svg` — dark-cyan mark on white tile.
- `public/brand/shadecode-app-icon-maskable.svg` — maskable safe-area icon.
- `public/brand/shadecode-student-logo.svg` — product lockup.
- `src/components/brand/BrandMark.tsx` — canonical inline mark.
- `src/components/brand/BrandLockup.tsx` — canonical product lockup.
- `src/app/icon.svg` — framework favicon/application icon.
- `src/app/apple-icon.svg` — framework Apple icon.

## Color tokens

| Token | Value | Role |
| --- | --- | --- |
| Shadecode Cyan | `#22D3EE` | master identity and dark-theme primary |
| Shadecode Cyan Strong | `#0891B2` | light-theme primary where contrast requires it |
| Shadecode Ink | `#06111C` | dark background and platform tile |
| Shadecode Surface | `#0B1724` | dark cards/navigation |

Semantic colors stay separate from brand recognition.

## Typography

- **Michroma**: brand wordmark and selected brand labels only.
- **Space Grotesk**: headings, navigation, controls, data/UI display.
- **Inter**: body copy, forms, tables, long-form reading.

This hierarchy keeps the futuristic character without forcing a display font onto dense study content.

## Engineering rules

1. The standalone icon contains no text.
2. Transparent cyan is the master asset.
3. Use the dark tile when a platform requires a complete icon container.
4. Use the maskable asset for adaptive PWA/Android contexts.
5. Use the white mark for dark one-color physical production.
6. Never stretch, skew, bevel, outline, shadow, or perspective-transform the master mark.
7. Do not apply gradients directly to the master mark.
8. Preserve clear space around the symbol.
9. At tiny sizes, use the symbol alone.
10. Never use cyan as the only indicator of success, warning, error, or other semantic state.

## Placement

Use the canonical identity consistently across favicon, PWA/install surfaces, navigation, loading/offline states, empty states, results, exam sharing, notifications, onboarding, social cards, documentation, merchandise, signage, and device branding.

**The S is the identity. Cyan is the recognition color. Typography carries the personality. Effects create atmosphere.**
