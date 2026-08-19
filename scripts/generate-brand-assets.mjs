import { existsSync, mkdirSync, readdirSync, rmSync, renameSync } from "node:fs";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const brandDir = join(root, "public", "brand");
const outputDir = join(root, "public", "icons");
const tempDir = join(outputDir, ".generated");

const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const sharpCli = "sharp-cli@5.2.0";

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

function render(sourcePath, size) {
  execFileSync(
    npx,
    ["--yes", sharpCli, "-i", sourcePath, "-o", tempDir, "-f", "png", "resize", String(size), String(size)],
    { cwd: root, stdio: "inherit" },
  );

  const expected = join(tempDir, sourcePath.split(/[\\/]/).pop().replace(/\.svg$/i, ".png"));
  if (!existsSync(expected)) {
    throw new Error(`sharp-cli did not produce ${expected}`);
  }
  return expected;
}

function writeAsset(sourceName, size, outputName) {
  const sourcePath = join(brandDir, sourceName);
  if (!existsSync(sourcePath)) throw new Error(`Missing brand source: ${sourcePath}`);
  const rendered = render(sourcePath, size);
  const destination = join(outputDir, outputName);
  mkdirSync(dirname(destination), { recursive: true });
  rmSync(destination, { force: true });
  renameSync(rendered, destination);
}

ensureDirs();

for (const size of sizes) {
  writeAsset(sources.master, size, `shadecode-student-${size}.png`);
}

for (const size of [192, 512]) {
  writeAsset(sources.dark, size, `shadecode-student-dark-${size}.png`);
}

for (const size of [180, 512]) {
  writeAsset(sources.light, size, `shadecode-student-light-${size}.png`);
}

for (const size of [192, 512, 1024]) {
  writeAsset(sources.maskable, size, `shadecode-student-maskable-${size}.png`);
}

writeAsset(sources.dark, 32, "favicon.png");
writeAsset(sources.light, 180, "apple-touch-icon.png");

rmSync(tempDir, { recursive: true, force: true });
console.log(`Generated Shadecode Student raster brand assets in ${outputDir}`);
