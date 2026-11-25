import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const assets = [
  ["node_modules/sql.js/dist/sql-wasm.js", "public/runtimes/sql-wasm.js"],
  ["node_modules/sql.js/dist/sql-wasm.wasm", "public/runtimes/sql-wasm.wasm"],
];

for (const [sourcePath, targetPath] of assets) {
  const source = resolve(sourcePath);
  const target = resolve(targetPath);
  if (!existsSync(source)) {
    throw new Error(`SQL.js runtime asset is missing: ${sourcePath}. Run npm install before preparing offline runtimes.`);
  }
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
}

console.log("Prepared local SQL.js JavaScript and WASM runtime assets.");
