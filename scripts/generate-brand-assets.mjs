import { existsSync, mkdirSync, rmSync, renameSync } from "node:fs";
import { join, dirname } from "node:path"; import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const brandDir = join(root, "public", "brand");
const outputDir = join(root, "public", "icons");
const tempDir = join(outputDir, ".generated");

const sources = {
  master: "shadecode-app-icon.svg",
  dark: "shadecode-app-icon-dark.svg",
  light: "shadecode-app-icon-light.svg",
  maskable: "shadecode-app-icon-maskable.svg",
};

const sizes = [16, 32, 48, 72, 96, 120, 144, 152, 180, 192, 256, 384, 512, 1024];

function ensureDirs() {
  mkdirSync(outputDir, { recursive: true });
  rmSync(tempDir, { recursive: true, force: true });
  mkdirSync(tempDir, { recursive: true });
}

async function render(sourcePath, size) {
  const outputFileName = sourcePath.split(/[\\/]/).pop().replace(/\.svg$/i, `-${size}.png`);
  const destination = join(tempDir, outputFileName);
  await sharp(sourcePath).resize(size, size).png().toFile(destination);
  return destination;
}

async function writeAsset(sourceName, size, outputName) {
  const sourcePath = join(brandDir, sourceName);
  if (!existsSync(sourcePath)) throw new Error(`Missing brand source: ${sourcePath}`);
  const rendered = await render(sourcePath, size);
  const destination = join(outputDir, outputName);
  mkdirSync(dirname(destination), { recursive: true });
  rmSync(destination, { force: true });
  renameSync(rendered, destination);
}

(async () => {
  ensureDirs();

  for (const size of sizes) {
    await writeAsset(sources.master, size, `shadecode-student-${size}.png`);
  }

  for (const size of [192, 512]) {
    await writeAsset(sources.dark, size, `shadecode-student-dark-${size}.png`);
  }

  for (const size of [180, 512]) {
    await writeAsset(sources.light, size, `shadecode-student-light-${size}.png`);
  }

  for (const size of [192, 512, 1024]) {
    await writeAsset(sources.maskable, size, `shadecode-student-maskable-${size}.png`);
  }

  await writeAsset(sources.dark, 32, "favicon.png");
  await writeAsset(sources.light, 180, "apple-touch-icon.png");

  rmSync(tempDir, { recursive: true, force: true });
  console.log(`Generated Shadecode Student raster brand assets in ${outputDir}`);
})();
