# Shadecode Student Brand System

## Master decision

The Shadecode Student symbol is a **single-color, transparent-background mark**. The primary brand color is Shadecode Cyan `#22D3EE`.

The previous cyan-to-purple/blue gradient is not part of the core identity. It may be used only as optional campaign artwork when a richer visual treatment is useful. It must never replace the master mark.

## Core assets

- `public/brand/shadecode-mark.svg` — transparent master mark.
- `public/brand/shadecode-app-icon.svg` — transparent cyan app mark.
- `public/brand/shadecode-app-icon-maskable.svg` — deep-navy platform tile for maskable contexts.
- `public/brand/shadecode-mark-reversed.svg` — white mark for dark/physical applications.
- `public/brand/shadecode-student-logo.svg` — mark + wordmark lockup.
- `src/components/brand/BrandMark.tsx` — canonical React mark component.
- `src/components/brand/BrandLockup.tsx` — canonical product lockup.

## Color

### Brand

| Token | Value | Use |
| --- | --- | --- |
| Shadecode Cyan | `#22D3EE` | Master mark, primary brand accent, interactive emphasis |
| Shadecode Cyan Strong | `#0891B2` | Light-theme buttons and text where contrast is required |
| Shadecode Ink | `#06111C` | Dark surfaces, platform icon background |
| Shadecode Surface | `#0B1724` | Dark cards and navigation surfaces |

Semantic colors such as warning and error remain separate. Brand cyan is not used to communicate semantic danger or success.

## Typography

- **Michroma** is the display/brand typeface. Use it for headings, navigation labels, product labels, major numbers, and brand-adjacent UI.
- **Inter** remains the body/UI reading typeface for paragraphs, forms, tables, dense data, and long content.
- Do not use the old heavy Arial/Helvetica logo treatment as the system wordmark.

## Mark rules

1. The icon is the symbol alone. Never put `SHADECODE` or `STUDENT` inside the icon.
2. Keep the master mark transparent whenever the surface provides its own background.
3. Use the maskable dark-background asset where a platform expects a complete square icon.
4. Use the reversed white mark on dark physical or monochrome surfaces.
5. Do not recolor the master mark with arbitrary gradients.
6. Do not add shadows, glows, bevels, outlines, perspective, or 3D effects to the master asset.
7. Maintain clear space around the symbol. At minimum, preserve the visual height of one outer ribbon as the breathing room on all sides.
8. Never stretch the mark non-proportionally.
9. At tiny sizes, prefer the flat cyan mark over detailed effects.

## Where the mark belongs

The canonical mark should be used consistently in:

- browser favicon and tab identity
- PWA manifest icons
- install prompts
- Android adaptive launcher icons
- older Android launcher fallback
- navigation/sidebar branding
- loading and offline surfaces
- empty states when the product identity is useful
- result/exam sharing cards
- notifications and install surfaces
- documentation and product screenshots
- social/profile avatars
- merchandise, embroidery, signage, and device branding

## Platform strategy

### Web / PWA

Use `shadecode-app-icon.svg` for transparent icon contexts and `shadecode-app-icon-maskable.svg` for maskable contexts. The manifest deliberately avoids stale legacy PNG icon references.

### Android

Android 8+ uses the adaptive icon resources. Older Android versions use the vector fallback in `mipmap-anydpi`, so the launcher does not depend on obsolete raster artwork.

### Physical applications

Use the flat cyan mark on light surfaces, white on dark surfaces, or a single-color production ink. For embroidery, engraving, screen printing, and laser cutting, the mark must remain a single solid shape with no gradient.

## Brand lockup

The preferred product lockup is:

**SHADECODE**

**STUDENT**

The symbol may sit to the left or above the wordmark. The symbol remains independent and must also work without the wordmark.

## Accessibility

- Do not rely on cyan alone to communicate a state.
- Use text, icons, borders, or shape changes for status information.
- Use `#0891B2` or darker for cyan text on light backgrounds when needed for readable contrast.
- The symbol should have meaningful accessible text when it conveys identity and `aria-hidden="true"` when it is decorative beside an already-labelled brand lockup.
