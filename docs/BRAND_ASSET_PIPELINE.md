# Shadecode Student Brand Asset Pipeline

## Source of truth

The supplied Shadecode Student neon reference is the visual source of truth.

The canonical vector masters live under `public/brand/`:

- `shadecode-app-icon.svg` - transparent neon gradient master
- `shadecode-app-icon-dark.svg` - deep-ink platform tile
- `shadecode-app-icon-light.svg` - light platform tile
- `shadecode-app-icon-maskable.svg` - adaptive safe-area tile
- `shadecode-mark-white.svg` - one-color reversed production mark

The S geometry must remain identical across variants. Only treatment and container may change.

## Raster distribution

`npm run generate:brand` generates the native PNG distribution under `public/icons/`.

Generated families include:

- 16, 32, 48, 72, 96, 120, 144, 152, 180, 192, 256, 384, 512 and 1024px master icons
- 192px and 512px dark platform icons
- 180px and 512px light platform icons
- 192px, 512px and 1024px maskable icons
- 32px browser favicon
- 180px Apple touch icon

The generator uses `sharp-cli` through `npx` so the repository does not carry a native image-processing dependency in the application lockfile. CI/deployment environments must have network access to npm when the generation step runs.

## Build integration

`predev` and `prebuild` invoke `generate:brand`, so local development and production builds regenerate the raster distribution from the vector masters.

The PWA manifest consumes PNG assets for install surfaces. SVG remains available for browser metadata and vector-first contexts.

## Quality gates

Every master must remain recognizable at:

- 16px
- 32px
- 48px
- 64px
- 96px
- 120px
- 144px
- 152px
- 180px
- 192px
- 256px
- 384px
- 512px
- 1024px

At tiny sizes, the symbol is used without wordmark text.

## Platform rules

### Web

Use `favicon.png`, the SVG icon, and the PNG Apple touch icon together. Keep the mask icon as a monochrome/reversed mark where the platform requires it.

### PWA

Use the 192px and 512px PNG assets for normal installation and the dedicated maskable PNG assets for adaptive icon surfaces.

### Android

The adaptive launcher uses the Shadecode deep-ink background and the neon gradient S foreground. The vector foreground is kept in source control so Android builds remain resolution-independent.

### Physical production

Use the transparent cyan/white one-color masters when the production method cannot reproduce the gradient. Do not invent a different symbol.

## Do not regress

Do not replace the supplied S with another geometric construction. Do not bake `SHADECODE` or `STUDENT` into the standalone icon. Do not add bevels, fake 3D depth, outlines, or decorative education symbols.
