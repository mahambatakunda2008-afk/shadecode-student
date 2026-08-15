# Shadecode Student Brand Identity 2026

## Status

Implemented in `shadecode-student` main on 15 August 2026.

## Canonical identity

Shadecode Student uses the shared Shadecode brand mark: the blue gradient S-form with the central knowledge star. The product descriptor is `Student` and is never represented by a separate competing logo.

## Design decisions

- One canonical mark across web, PWA metadata, navigation, landing page, and product UI.
- Vector SVG is the source of truth for scalable use.
- Real vector UI icons are used for feature and achievement iconography. Emoji are not used as brand or product icons.
- Primary brand color family is blue, with the mark using a cyan-to-blue gradient.
- The mark must remain recognizable at favicon, app-icon, navigation, and large hero sizes.
- The landing page uses the same mark as the application shell, creating continuity from acquisition to product.

## Current assets

- `public/brand/shadecode-mark.svg` - canonical transparent mark for navigation, favicon, hero, and general brand use.
- `public/brand/shadecode-app-icon.svg` - square dark-background app icon master for PWA/app surfaces and maskable use.
- PWA metadata references the canonical app icon and mark.
- Landing page references the canonical mark directly.
- Navigation/sidebar branding uses the canonical mark.

## Landing page optimization

The public landing page was updated to remove the old diamond/emoji visual language and use the canonical mark plus Lucide vector icons. The visual system now has a single brand language across:

1. Navbar
2. Hero
3. Cortex panel
4. Feature cards
5. Research/future section
6. Trust section
7. Final CTA
8. Footer

The landing page keeps the existing product positioning but improves brand recognition, hierarchy, consistency, and small-screen resilience.

## App/store packaging

The SVG masters are the source of truth. The square app-icon master has a dark background and generous safe area so the same mark remains legible on app surfaces and maskable PWA contexts.

The repository now uses the SVG app icon directly for PWA metadata rather than relying on an older unrelated raster icon. Platform-specific raster exports should still be generated from this master before final Microsoft Store, Android, or Apple package submission.

Recommended export set:

- 16x16, 32x32, 48x48 favicon sizes
- 180x180 Apple touch icon
- 192x192 PWA icon
- 512x512 PWA icon
- 1024x1024 high-resolution master
- Windows Store tile/icon sizes required by the current Partner Center package

## Do not regress

Do not reintroduce:

- generic `SC` boxes
- diamond glyphs as the logo
- emoji as brand marks
- unrelated icon families for primary product identity
- different logos for Shadecode and Shadecode Student
