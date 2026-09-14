"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Play, RotateCcw, Save } from "lucide-react";
import { CodeLabEditor } from "@/components/code-lab/CodeLabEditor";

type WebFile = { path: "index.html" | "styles.css" | "script.js"; content: string; language: string };

const START: WebFile[] = [
  { path: "index.html", language: "html", content: `<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1" />\n    <title>Comp Lab Web Project</title>\n    <link rel="stylesheet" href="styles.css" />\n  </head>\n  <body>\n    <main class="card">\n      <h1>Hello, Shadecode</h1>\n      <p>Edit the files and preview the result.</p>\n      <button id="demo">Click me</button>\n    </main>\n    <script src="script.js"></script>\n  </body>\n</html>\n` },
  { path: "styles.css", language: "css", content: `body {\n  min-height: 100vh;\n  margin: 0;\n  display: grid;\n  place-items: center;\n  font-family: system-ui, sans-serif;\n  background: #0b0f17;\n  color: #e5e7eb;\n}\n.card { padding: 2rem; border: 1px solid #334155; border-radius: 1rem; max-width: 32rem; }\nbutton { padding: .65rem 1rem; cursor: pointer; }\n` },
  { path: "script.js", language: "javascript", content: `document.querySelector("#demo")?.addEventListener("click", () => {\n  document.querySelector("p").textContent = "JavaScript is running in the preview.";\n});\n` },
];

const STORAGE = "shadecode:comp-lab:web:";

function buildDocument(files: WebFile[]) {
  const html = files.find((file) => file.path === "index.html")?.content ?? "";
  const css = files.find((file) => file.path === "styles.css")?.content ?? "";
  const js = files.find((file) => file.path === "script.js")?.content ?? "";
  const withCss = html.includes("</head>") ? html.replace("</head>", `<style>${css}</style></head>`) : `${html}<style>${css}</style>`;
  return withCss.replace("</body>", `<script>${js.replace(/<\/script>/gi, "<\\/script>")}</script></body>`);
}

export default function WebCompLabWorkspace() {
  const [files, setFiles] = useState<WebFile[]>(START);
  const [active, setActive] = useState<WebFile["path"]>("index.html");
  const [preview, setPreview] = useState("");
  const [saved, setSaved] = useState(false);

  const current = useMemo(() => files.find((file) => file.path === active) ?? files[0], [active, files]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { files?: WebFile[]; active?: WebFile["path"] };
      if (Array.isArray(parsed.files) && parsed.files.length) setFiles(parsed.files);
      if (parsed.active) setActive(parsed.active);
    } catch { /* ignore corrupt local state */ }
  }, []);

  function update(value: string) {
    setFiles((currentFiles) => currentFiles.map((file) => file.path === active ? { ...file, content: value } : file));
  }

  function runPreview() {
    setPreview(buildDocument(files));
  }

  function save() {
    localStorage.setItem(STORAGE, JSON.stringify({ files, active }));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1200);
  }

  function reset() {
    setFiles(START);
    setActive("index.html");
    setPreview("");
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0f17]">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-[#0d121b] p-2">
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
          {files.map((file) => <button key={file.path} type="button" onClick={() => setActive(file.path)} className={`rounded-lg px-3 py-2 text-xs ${active === file.path ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5"}`}>{file.path}</button>)}
        </div>
        <button type="button" onClick={runPreview} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white"><Play className="h-3.5 w-3.5" />Preview</button>
        <button type="button" onClick={save} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-slate-300 hover:bg-white/5"><Save className="h-3.5 w-3.5" />{saved ? "Saved" : "Save"}</button>
        <button type="button" onClick={reset} title="Reset project" className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><RotateCcw className="h-3.5 w-3.5" /></button>
      </div>
      <div className="grid min-h-[620px] lg:grid-cols-2">
        <div className="min-h-[430px] border-b border-white/10 lg:border-b-0 lg:border-r">
          <CodeLabEditor value={current.content} language={current.language} onChange={update} onRun={runPreview} onSave={save} />
        </div>
        <div className="min-h-[320px] bg-white">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600"><Eye className="h-3.5 w-3.5" />Live web preview</div>
          {preview ? <iframe title="Comp Lab web preview" sandbox="allow-scripts" srcDoc={preview} className="h-[calc(100%-33px)] min-h-[287px] w-full border-0" /> : <div className="grid h-[calc(100%-33px)] min-h-[287px] place-items-center p-8 text-center text-sm text-slate-500">Run Preview to render this project here. The preview is sandboxed and is not a production deployment.</div>}
        </div>
      </div>
    </div>
  );
}
