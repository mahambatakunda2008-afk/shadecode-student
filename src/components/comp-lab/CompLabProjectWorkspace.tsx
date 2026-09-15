"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileCode2, FolderOpen, Play, RotateCcw, Save, Terminal } from "lucide-react";
import { CodeLabEditor } from "@/components/code-lab/CodeLabEditor";
import type { CompLabEnvironment } from "@/lib/comp-lab/environments";
import { getCapability } from "@/lib/platform/capabilities";

type ProjectFile = { path: string; language: string; content: string };

const STARTERS: Record<string, ProjectFile[]> = {
  "java-console": [
    { path: "Main.java", language: "java", content: "public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Hello from Comp Lab\");\n    }\n}\n" },
  ],
  "c-console": [
    { path: "main.c", language: "c", content: "#include <stdio.h>\n\nint main(void) {\n    printf(\"Hello from Comp Lab\\n\");\n    return 0;\n}\n" },
  ],
  "cpp-console": [
    { path: "main.cpp", language: "cpp", content: "#include <iostream>\n\nint main() {\n    std::cout << \"Hello from Comp Lab\\n\";\n    return 0;\n}\n" },
  ],
  "csharp-console": [
    { path: "Program.cs", language: "csharp", content: "using System;\n\nConsole.WriteLine(\"Hello from Comp Lab\");\n" },
  ],
  "vbnet-console": [
    { path: "Program.vb", language: "vbnet", content: "Imports System\n\nModule Program\n    Sub Main()\n        Console.WriteLine(\"Hello from Comp Lab\")\n    End Sub\nEnd Module\n" },
  ],
  "csharp-windows-forms": [
    { path: "Program.cs", language: "csharp", content: "using System;\nusing System.Windows.Forms;\n\nApplicationConfiguration.Initialize();\nApplication.Run(new Form { Text = \"Comp Lab\" });\n" },
    { path: "CompLab.csproj", language: "xml", content: "<Project Sdk=\"Microsoft.NET.Sdk\">\n  <PropertyGroup>\n    <OutputType>WinExe</OutputType>\n    <TargetFramework>net8.0-windows</TargetFramework>\n    <UseWindowsForms>true</UseWindowsForms>\n  </PropertyGroup>\n</Project>\n" },
  ],
  "vbnet-windows-forms": [
    { path: "Program.vb", language: "vbnet", content: "Imports System.Windows.Forms\n\nPublic Class MainForm\n    Inherits Form\n\n    Public Sub New()\n        Text = \"Comp Lab\"\n    End Sub\nEnd Class\n" },
    { path: "CompLab.vbproj", language: "xml", content: "<Project Sdk=\"Microsoft.NET.Sdk\">\n  <PropertyGroup>\n    <OutputType>WinExe</OutputType>\n    <TargetFramework>net8.0-windows</TargetFramework>\n    <UseWindowsForms>true</UseWindowsForms>\n  </PropertyGroup>\n</Project>\n" },
  ],
  "access-database": [
    { path: "schema.sql", language: "sql", content: "CREATE TABLE Students (\n    StudentID INTEGER PRIMARY KEY,\n    Name TEXT NOT NULL,\n    Level TEXT\n);\n" },
    { path: "README.md", language: "markdown", content: "# Access database project\n\nDesign the tables, relationships, queries and forms here. Export the schema and move the project to an Office-capable runtime when an .accdb file is required.\n" },
  ],
  "excel-workbook": [
    { path: "workbook.json", language: "json", content: "{\n  \"sheets\": [{\n    \"name\": \"Sheet1\",\n    \"cells\": [[\"Name\", \"Score\"], [\"Student\", 0]]\n  }]\n}\n" },
    { path: "README.md", language: "markdown", content: "# Spreadsheet project\n\nUse the workbook model for formulas, tables and data analysis. Export the artifact when you are ready to continue in a full spreadsheet runtime.\n" },
  ],
};

const FALLBACK_EXTENSION: Record<string, [string, string]> = {
  kotlin: ["Main.kt", "kotlin"],
  php: ["index.php", "php"],
  rust: ["main.rs", "rust"],
  go: ["main.go", "go"],
};

function starterFiles(environment: CompLabEnvironment): ProjectFile[] {
  const exact = STARTERS[environment.id];
  if (exact) return exact;
  const language = environment.languages[0] ?? "markdown";
  const fallback = FALLBACK_EXTENSION[language];
  if (fallback) return [{ path: fallback[0], language: fallback[1], content: `// ${environment.label} project\n\n` }];
  if (environment.projectType === "mobile") return [{ path: "README.md", language: "markdown", content: `# ${environment.label}\n\nPlan screens, state, data and device capabilities here.\n` }];
  if (environment.projectType === "systems") return [{ path: "README.md", language: "markdown", content: `# ${environment.label}\n\nDesign the system, interfaces, data flow and native dependencies here.\n` }];
  return [{ path: "README.md", language: "markdown", content: `# ${environment.label}\n\nComp Lab project workspace.\n` }];
}

export default function CompLabProjectWorkspace({ environment }: { environment: CompLabEnvironment }) {
  const storageKey = `shadecode:comp-lab:project:${environment.id}`;
  const [files, setFiles] = useState<ProjectFile[]>(() => starterFiles(environment));
  const [active, setActive] = useState(0);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const current = files[active] ?? files[0];
  const capability = useMemo(() => {
    if (environment.id.includes("java")) return getCapability("runtime.java");
    if (environment.id.includes("csharp") || environment.id.includes("vbnet")) return getCapability("runtime.dotnet");
    if (environment.id.includes("sql") || environment.id.includes("access")) return getCapability("runtime.sql");
    if (environment.languages.includes("cpp")) return getCapability("runtime.cpp");
    if (environment.languages.includes("c")) return getCapability("runtime.c");
    return null;
  }, [environment]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { files?: ProjectFile[]; active?: number };
      if (Array.isArray(parsed.files) && parsed.files.length) setFiles(parsed.files);
      if (typeof parsed.active === "number") setActive(Math.max(0, parsed.active));
    } catch {}
  }, [storageKey]);

  function update(value: string) {
    setFiles((items) => items.map((file, index) => index === active ? { ...file, content: value } : file));
    setSaved(false);
  }

  function save() {
    localStorage.setItem(storageKey, JSON.stringify({ files, active }));
    setSaved(true);
    setMessage("Project saved on this device.");
    window.setTimeout(() => setMessage(""), 1600);
  }

  function reset() {
    setFiles(starterFiles(environment));
    setActive(0);
    setSaved(false);
    setMessage("Starter project restored.");
  }

  function downloadCurrent() {
    const blob = new Blob([current?.content ?? ""], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = current?.path ?? "project.txt";
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage(`Downloaded ${current?.path ?? "file"}.`);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[#0b0f17] text-slate-200 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-[#0d121b] p-2">
        <div className="inline-flex items-center gap-2 px-2 text-xs font-semibold"><FolderOpen className="h-3.5 w-3.5" />Project</div>
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
          {files.map((file, index) => <button key={file.path} type="button" onClick={() => { setActive(index); setMessage(""); }} className={`rounded-lg px-3 py-2 text-xs whitespace-nowrap ${active === index ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5"}`}><FileCode2 className="mr-1.5 inline h-3 w-3" />{file.path}</button>)}
        </div>
        <button type="button" onClick={save} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs text-slate-300 hover:bg-white/5"><Save className="h-3.5 w-3.5" />{saved ? "Saved" : "Save"}</button>
        <button type="button" onClick={downloadCurrent} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs text-slate-300 hover:bg-white/5"><Download className="h-3.5 w-3.5" />Export</button>
        <button type="button" onClick={reset} className="rounded-lg p-2 text-slate-400 hover:bg-white/5" title="Reset starter"><RotateCcw className="h-3.5 w-3.5" /></button>
      </div>
      <div className="grid min-h-[560px] lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-h-[480px] border-b border-white/10 lg:border-b-0 lg:border-r">
          <CodeLabEditor value={current?.content ?? ""} language={current?.language ?? "plaintext"} entryFile={current?.path} onChange={update} onSave={save} />
        </div>
        <aside className="bg-[#0d121b] p-4">
          <div className="flex items-center gap-2 text-xs font-semibold"><Terminal className="h-3.5 w-3.5" />Project status</div>
          <div className="mt-3 rounded-xl border border-white/10 bg-black/10 p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Runtime</p>
            <p className="mt-1 text-sm font-medium text-slate-200">{capability?.availability ?? "native / artifact"}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{capability?.description ?? "This environment has a complete project surface, but execution requires the appropriate native or artifact capability."}</p>
          </div>
          <button type="button" onClick={() => setMessage("Build request recorded. A real native toolchain is required before Comp Lab can execute this project.")} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/5"><Play className="h-3.5 w-3.5" />Build / Run</button>
          {message && <p className="mt-3 rounded-xl bg-white/5 p-3 text-xs leading-5 text-slate-400">{message}</p>}
          <div className="mt-5 space-y-2 text-xs text-slate-500">
            <p><span className="text-slate-300">Files:</span> {files.length}</p>
            <p><span className="text-slate-300">Languages:</span> {environment.languages.join(", ")}</p>
            <p><span className="text-slate-300">Project type:</span> {environment.projectType}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
