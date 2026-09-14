"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bug, Eye, Maximize2, Monitor, Play, RotateCcw, Save, Smartphone, Tablet, Terminal } from "lucide-react";
import { CodeLabEditor } from "@/components/code-lab/CodeLabEditor";

type WebPath = "index.html" | "styles.css" | "script.js";
type WebFile = { path: WebPath; content: string; language: string };
type Viewport = "desktop" | "tablet" | "mobile";

type PreviewMessage = { source?: string; type?: string; level?: string; message?: string };

const START: WebFile[] = [
  { path: "index.html", language: "html", content: `<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1" />\n    <title>Comp Lab Web Project</title>\n    <link rel="stylesheet" href="styles.css" />\n  </head>\n  <body>\n    <main class="card">\n      <h1>Hello, Shadecode</h1>\n      <p>Edit the files and preview the result.</p>\n      <button id="demo">Click me</button>\n    </main>\n    <script src="script.js"></script>\n  </body>\n</html>\n` },
  { path: "styles.css", language: "css", content: `body {\n  min-height: 100vh;\n  margin: 0;\n  display: grid;\n  place-items: center;\n  font-family: system-ui, sans-serif;\n  background: #0b0f17;\n  color: #e5e7eb;\n}\n.card { padding: 2rem; border: 1px solid #334155; border-radius: 1rem; max-width: 32rem; }\nbutton { padding: .65rem 1rem; cursor: pointer; }\n` },
  { path: "script.js", language: "javascript", content: `document.querySelector("#demo")?.addEventListener("click", () => {\n  console.log("Demo button clicked");\n  document.querySelector("p").textContent = "JavaScript is running in the preview.";\n});\n` },
];

const STORAGE = "shadecode:comp-lab:web:";
const VIEWPORTS: Record<Viewport, { label: string; width: number; icon: typeof Monitor }> = {
  desktop: { label: "Desktop", width: 0, icon: Monitor },
  tablet: { label: "Tablet", width: 768, icon: Tablet },
  mobile: { label: "Mobile", width: 390, icon: Smartphone },
};

function buildDocument(files: WebFile[]) {
  const html = files.find((file) => file.path === "index.html")?.content ?? "";
  const css = files.find((file) => file.path === "styles.css")?.content ?? "";
  const js = files.find((file) => file.path === "script.js")?.content ?? "";
  const bridge = `<script>\n(() => {\n  const send = (level, args) => { try { parent.postMessage({ source: "shadecode-comp-lab-preview", type: "console", level, message: args.map(String).join(" ") }, "*"); } catch {} };\n  ["log", "info", "warn", "error"].forEach((level) => { const original = console[level]; console[level] = (...args) => { original(...args); send(level, args); }; });\n  window.addEventListener("error", (event) => send("error", [event.message || "Preview error"]));\n  window.addEventListener("unhandledrejection", (event) => send("error", [event.reason || "Unhandled promise rejection"]));\n})();\n</script>`;
  const withCss = html.includes("</head>") ? html.replace("</head>", `<style>${css}</style>${bridge}</head>`) : `${html}<style>${css}</style>${bridge}`;
  return withCss.replace("</body>", `<script>${js.replace(/<\/script>/gi, "<\\/script>")}</script></body>`);
}

export default function WebCompLabWorkspace() {
  const [files, setFiles] = useState<WebFile[]>(START);
  const [active, setActive] = useState<WebPath>("index.html");
  const [preview, setPreview] = useState("");
  const [saved, setSaved] = useState(false);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleLines, setConsoleLines] = useState<string[]>([]);
  const [autoPreview, setAutoPreview] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const current = useMemo(() => files.find((file) => file.path === active) ?? files[0], [active, files]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { files?: WebFile[]; active?: WebPath; viewport?: Viewport; autoPreview?: boolean };
      if (Array.isArray(parsed.files) && parsed.files.length) setFiles(parsed.files);
      if (parsed.active) setActive(parsed.active);
      if (parsed.viewport && parsed.viewport in VIEWPORTS) setViewport(parsed.viewport);
      if (typeof parsed.autoPreview === "boolean") setAutoPreview(parsed.autoPreview);
    } catch { /* ignore corrupt local state */ }
  }, []);

  useEffect(() => {
    const handler = (event: MessageEvent<PreviewMessage>) => {
      if (event.source !== iframeRef.current?.contentWindow || event.data?.source !== "shadecode-comp-lab-preview") return;
      if (event.data.type !== "console") return;
      const level = event.data.level ?? "log";
      const message = event.data.message ?? "";
      setConsoleLines((lines) => [...lines.slice(-99), `[${level}] ${message}`]);
      setConsoleOpen(true);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  useEffect(() => {
    if (autoPreview) setPreview(buildDocument(files));
  }, [autoPreview, files]);

  function update(value: string) {
    setFiles((currentFiles) => currentFiles.map((file) => file.path === active ? { ...file, content: value } : file));
  }

  function runPreview() {
    setConsoleLines([]);
    setPreview(buildDocument(files));
  }

  function save() {
    localStorage.setItem(STORAGE, JSON.stringify({ files, active, viewport, autoPreview }));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1200);
  }

  function reset() {
    setFiles(START);
    setActive("index.html");
    setPreview("");
    setConsoleLines([]);
    setViewport("desktop");
  }

  const viewportWidth = VIEWPORTS[viewport].width;
  const ViewportIcon = VIEWPORTS[viewport].icon;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0f17]">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-[#0d121b] p-2">
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
          {files.map((file) => <button key={file.path} type="button" onClick={() => setActive(file.path)} className={`rounded-lg px-3 py-2 text-xs ${active === file.path ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5"}`}>{file.path}</button>)}
        </div>
        <button type="button" onClick={runPreview} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white"><Play className="h-3.5 w-3.5" />Preview</button>
        <button type="button" onClick={() => setAutoPreview((value) => !value)} className={`rounded-lg px-2.5 py-2 text-[10px] ${autoPreview ? "bg-emerald-500/10 text-emerald-300" : "text-slate-400 hover:bg-white/5"}`}>{autoPreview ? "Auto" : "Manual"}</button>
        <button type="button" onClick={() => setConsoleOpen((value) => !value)} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs ${consoleOpen ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5"}`}><Terminal className="h-3.5 w-3.5" />Console</button>
        <button type="button" onClick={save} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-slate-300 hover:bg-white/5"><Save className="h-3.5 w-3.5" />{saved ? "Saved" : "Save"}</button>
        <button type="button" onClick={reset} title="Reset project" className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><RotateCcw className="h-3.5 w-3.5" /></button>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto border-b border-white/10 bg-[#0a0e15] px-2 py-1.5">
        <span className="mr-1 text-[10px] uppercase tracking-wider text-slate-600">Viewport</span>
        {(Object.keys(VIEWPORTS) as Viewport[]).map((key) => { const item = VIEWPORTS[key]; const Icon = item.icon; return <button key={key} type="button" onClick={() => setViewport(key)} className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] ${viewport === key ? "bg-white/10 text-slate-200" : "text-slate-500 hover:bg-white/5"}`}><Icon className="h-3 w-3" />{item.label}{item.width ? ` ${item.width}px` : ""}</button>; })}
        <span className="ml-auto hidden items-center gap-1 text-[10px] text-slate-600 sm:flex"><ViewportIcon className="h-3 w-3" />Sandboxed preview</span>
      </div>

      <div className="grid min-h-[620px] lg:grid-cols-2">
        <div className="min-h-[430px] border-b border-white/10 lg:border-b-0 lg:border-r">
          <CodeLabEditor value={current.content} language={current.language} onChange={update} onRun={runPreview} onSave={save} />
        </div>
        <div className="min-h-[320px] bg-slate-100">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600"><Eye className="h-3.5 w-3.5" />Preview</div>
          <div className="flex min-h-[520px] justify-center overflow-auto bg-slate-200/80 p-3 sm:p-5">
            {preview ? <div className="w-full transition-[width]" style={{ maxWidth: viewportWidth ? `${viewportWidth}px` : "100%" }}><iframe ref={iframeRef} title="Comp Lab web preview" sandbox="allow-scripts" srcDoc={preview} className="h-[480px] w-full border border-slate-300 bg-white shadow-sm" /></div> : <div className="m-auto max-w-sm p-8 text-center text-sm text-slate-500"><Maximize2 className="mx-auto mb-3 h-5 w-5" />Run Preview to render this project. The iframe is sandboxed and is not a production deployment.</div>}
          </div>
          {consoleOpen && <div className="border-t border-slate-200 bg-[#080b11] text-slate-200"><div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-[10px] uppercase tracking-wider text-slate-500"><span className="inline-flex items-center gap-1.5"><Bug className="h-3.5 w-3.5" />Preview console</span><button type="button" onClick={() => setConsoleLines([])} className="text-slate-500 hover:text-slate-300">Clear</button></div><div className="max-h-36 overflow-auto p-3 font-mono text-[11px]">{consoleLines.length ? consoleLines.map((line, index) => <div key={`${line}-${index}`} className="border-b border-white/5 py-1 last:border-0">{line}</div>) : <span className="text-slate-600">Console output will appear here when the preview logs or throws.</span>}</div></div>}
        </div>
      </div>
    </div>
  );
}
