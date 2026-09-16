import type { ShadeProject } from "./project";

export type ShadeWorkspaceFile = { path: string; source: string };
export type ShadeWorkspace = {
  version: "0.1";
  entryFile: string;
  files: ShadeWorkspaceFile[];
};

export function createShadeWorkspace(files: ShadeWorkspaceFile[], entryFile = "main.shade"): ShadeWorkspace {
  const normalized = files.map((file) => ({ path: file.path.replace(/^\.\//, ""), source: file.source }));
  const entry = normalized.some((file) => file.path === entryFile) ? entryFile : normalized[0]?.path ?? entryFile;
  return { version: "0.1", entryFile: entry, files: normalized };
}

export function getShadeWorkspaceFile(workspace: ShadeWorkspace, path: string): ShadeWorkspaceFile | undefined {
  return workspace.files.find((file) => file.path === path);
}

export function updateShadeWorkspaceFile(workspace: ShadeWorkspace, path: string, source: string): ShadeWorkspace {
  const files = workspace.files.some((file) => file.path === path)
    ? workspace.files.map((file) => file.path === path ? { ...file, source } : file)
    : [...workspace.files, { path, source }];
  return { ...workspace, files };
}

export function removeShadeWorkspaceFile(workspace: ShadeWorkspace, path: string): ShadeWorkspace {
  if (path === workspace.entryFile) return workspace;
  return { ...workspace, files: workspace.files.filter((file) => file.path !== path) };
}

export function toShadeProject(workspace: ShadeWorkspace): ShadeProject {
  return {
    id: "shade-workspace",
    name: "Shade Workspace",
    entryFile: workspace.entryFile,
    artifacts: workspace.files.map((file) => ({ id: `artifact:${file.path}`, type: "code-project", path: file.path, source: file.source })),
  } as ShadeProject;
}
