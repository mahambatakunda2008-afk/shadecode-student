import fs from "fs";
import path from "path";

function toSafeName(name: string) {
  return name.replace(/[^a-zA-Z0-9_]/g, "_");
}

export function runCodex(spec: any) {
  console.log("🧠 Spec →", spec.feature);

  // Simulated Codex output (we’ll swap to real Codex later)
  const fnName = toSafeName(spec.feature);
  const code = `
// Auto-generated feature
export function ${fnName}() {
  console.log("🚀 Running ${fnName}");
  return {
    feature: "${spec.feature}",
    target: "${spec.target_module}",
    createdAt: "${new Date().toISOString()}"
  };
}
`;

  const filePath = path.join(process.cwd(), "features", `${fnName}.ts`);
  fs.writeFileSync(filePath, code);

  console.log("✨ Feature created →", filePath);
}