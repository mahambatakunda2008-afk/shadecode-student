import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const source = resolve("node_modules/sql.js/dist/sql-wasm.wasm");
const target = resolve("public/runtimes/sql-wasm.wasm");

if (!existsSync(source)) {
  throw new Error("sql.js WASM asset is missing. Run npm install before preparing offline runtimes.");
}

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
console.log("Prepared local SQL.js WASM runtime at public/runtimes/sql-wasm.wasm");
