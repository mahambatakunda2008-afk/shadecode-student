# Shadecode Student Brand System v3

`docs/SHADECODE_STUDENT_BRAND.md` is the detailed source of truth. This file is the concise engineering reference.

## Core identity

The Shadecode Student symbol is the **S-shaped interlocking mark shown in the supplied neon branding references**. The primary master treatment is a transparent cyan-to-blue-to-violet gradient. The symbol itself is the recognition anchor; the gradient is part of the product identity, not a decorative afterthought.

### Primary gradient

- Cyan: `#00E5FF`
- Electric blue: `#00A8FF`
- Royal blue: `#245BFF`
- Violet: `#7A3CFF`
- Magenta violet: `#C135FF`

The gradient should read cyan-first and violet-last, matching the supplied references. Do not add glow, bevels, shadows, outlines, perspective, or 3D effects to the master vector.

## Assets

- `public/brand/shadecode-icon-master.svg` — canonical transparent neon master mark.
- `public/brand/shadecode-app-icon.svg` — transparent application mark.
- `public/brand/shadecode-app-icon-dark.svg` — neon mark on Shadecode Ink.
- `public/brand/shadecode-app-icon-light.svg` — neon mark on a light tile.
- `public/brand/shadecode-app-icon-maskable.svg` — adaptive/maskable safe-area icon.
- `public/brand/shadecode-mark.svg` — canonical transparent inline mark.
- `public/brand/shadecode-mark-white.svg` — white one-color production mark.
- `public/brand/shadecode-mark-reversed.svg` — white reversed mark.
- `public/brand/shadecode-student-logo.svg` — product lockup with gradient S/CODE treatment.
- `src/components/brand/BrandMark.tsx` — canonical inline gradient mark.
- `src/components/brand/BrandLockup.tsx` — canonical product lockup.
- `src/app/icon.svg` — framework favicon/application icon.
- `src/app/apple-icon.svg` — framework Apple icon.

## Color tokens

| Token | Value | Role |
| --- | --- | --- |
| Neon Cyan | `#00E5FF` | gradient start, primary recognition |
| Electric Blue | `#00A8FF` | gradient transition |
| Royal Blue | `#245BFF` | gradient body |
| Shadecode Violet | `#7A3CFF` | gradient transition |
| Shadecode Magenta | `#C135FF` | gradient end |
| Shadecode Ink | `#06111C` | dark background and app-icon tile |
| Shadecode Surface | `#0B1724` | dark cards/navigation |
| Text | `#F8FAFC` | primary light text |

Semantic colors remain separate from brand recognition.

## Typography

- **Michroma**: brand wordmark and selected brand labels only.
- **Space Grotesk**: headings, navigation, controls, data/UI display.
- **Inter**: body copy, forms, tables, long-form reading.

## Engineering rules

1. The standalone icon contains no text.
2. The supplied S geometry is the canonical geometry.
3. The transparent neon gradient is the primary brand treatment.
4. Use the dark tile when a platform requires a complete icon container.
5. Use the maskable asset for adaptive PWA/Android contexts and preserve its safe area.
6. Use the white mark for dark one-color physical production and constrained monochrome contexts.
7. Never stretch, skew, bevel, outline, shadow, or perspective-transform the master mark.
8. Do not add effects that change the silhouette of the supplied S.
9. Preserve clear space around the symbol.
10. At tiny sizes, use the symbol alone and retain strong cyan-led contrast.
11. Never use the brand gradient as the only indicator of success, warning, error, or other semantic state.
12. Keep semantic UI colors independent from the identity gradient.

## Placement

Use the canonical identity consistently across favicon, PWA/install surfaces, navigation, loading/offline states, empty states, results, exam sharing, notifications, onboarding, social cards, documentation, merchandise, signage, clothing, buildings, laptops, phones, and device branding.

**The S is the identity. The neon gradient is the recognition treatment. Typography carries the product personality.**
