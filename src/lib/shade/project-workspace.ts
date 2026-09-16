import type { ShadeProjectModel, ShadeArtifact } from "./project";
import { createShadeArtifact, createShadeProjectModel } from "./project";
import type { ShadeSemanticModel } from "./semantic";

export type ShadeWorkspaceFile = {
  path: string;
  source: string;
  type?: ShadeArtifact["type"];
};

export type ShadeWorkspace = {
  version: "0.1";
  name: string;
  entryFile: string;
  languageVersion: string;
  files: ShadeWorkspaceFile[];
};

export function createShadeWorkspace(files: ShadeWorkspaceFile[], entryFile = "main.shade", options: { name?: string; languageVersion?: string } = {}): ShadeWorkspace {
  const normalized = files.map((file) => ({ path: normalizePath(file.path), source: file.source, ...(file.type ? { type: file.type } : {}) }));
  const requestedEntry = normalizePath(entryFile);
  const entry = normalized.some((file) => file.path === requestedEntry) ? requestedEntry : normalized[0]?.path ?? requestedEntry;
  return { version: "0.1", name: options.name ?? "Shade Workspace", entryFile: entry, languageVersion: options.languageVersion ?? "0.1.0-design-core", files: normalized };
}

export function getShadeWorkspaceFile(workspace: ShadeWorkspace, path: string): ShadeWorkspaceFile | undefined {
  return workspace.files.find((file) => file.path === normalizePath(path));
}

export function updateShadeWorkspaceFile(workspace: ShadeWorkspace, path: string, source: string): ShadeWorkspace {
  const normalizedPath = normalizePath(path);
  const files = workspace.files.some((file) => file.path === normalizedPath)
    ? workspace.files.map((file) => file.path === normalizedPath ? { ...file, source } : file)
    : [...workspace.files, { path: normalizedPath, source }];
  return { ...workspace, files };
}

export function removeShadeWorkspaceFile(workspace: ShadeWorkspace, path: string): ShadeWorkspace {
  const normalizedPath = normalizePath(path);
  if (normalizedPath === workspace.entryFile) return workspace;
  return { ...workspace, files: workspace.files.filter((file) => file.path !== normalizedPath) };
}

export function toShadeProjectModel(workspace: ShadeWorkspace, semantic: ShadeSemanticModel): ShadeProjectModel {
  const artifacts = workspace.files.map((file) => createShadeArtifact({ path: file.path, type: file.type ?? "source", language: "shade" }));
  return createShadeProjectModel({ name: workspace.name, entry: workspace.entryFile, semantic, artifacts, languageVersion: workspace.languageVersion });
}

function normalizePath(path: string): string {
  return path.trim().replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+/g, "/");
}
