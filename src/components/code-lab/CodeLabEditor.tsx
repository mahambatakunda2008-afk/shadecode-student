"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Settings2 } from "lucide-react";
import type { RuntimeDiagnostic } from "@/lib/code-lab/runtime";

type MonacoDisposable = { dispose: () => void };
type MonacoModel = { getLineCount: () => number; getLineMaxColumn: (lineNumber: number) => number };
type MonacoEditor = { getValue: () => string; setValue: (value: string) => void; dispose: () => void; addCommand: (keybinding: number, handler: () => void) => void; onDidChangeModelContent: (callback: () => void) => MonacoDisposable; getModel: () => MonacoModel | null };
type MonacoNamespace = { editor: { create: (element: HTMLElement, options: Record<string, unknown>) => MonacoEditor; defineTheme: (name: string, theme: Record<string, unknown>) => void; setModelMarkers: (model: MonacoModel, owner: string, markers: MonacoMarker[]) => void; MarkerSeverity: { Error: number; Warning: number; Info: number } }; languages: { typescript: { javascriptDefaults: { setDiagnosticsOptions: (options: Record<string, unknown>) => void; setCompilerOptions: (options: Record<string, unknown>) => void } } }; KeyMod: { CtrlCmd: number }; KeyCode: { Enter: number; KeyS: number } };
type MonacoMarker = { severity: number; message: string; startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number };
type LoaderRequire = ((deps: string[], callback: () => void) => void) & { config: (options: Record<string, unknown>) => void };

declare global { interface Window { require?: LoaderRequire; monaco?: MonacoNamespace } }

let loaderPromise: Promise<MonacoNamespace> | null = null;
const SETTINGS_KEY = "shadecode:comp-lab:editor-settings";
type EditorSettings = { fontSize: number; tabSize: number; wordWrap: "off" | "on"; minimap: boolean };
const DEFAULT_SETTINGS: EditorSettings = { fontSize: 14, tabSize: 2, wordWrap: "off", minimap: true };

function loadMonaco() {
  if (typeof window === "undefined") return Promise.reject(new Error("Monaco requires a browser."));
  if (window.monaco) return Promise.resolve(window.monaco);
  if (loaderPromise) return loaderPromise;
  loaderPromise = new Promise((resolve, reject) => {
    const boot = () => { const loader = window.require; if (typeof loader !== "function") return reject(new Error("Monaco loader did not initialise.")); loader.config({ paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs" } }); loader(["vs/editor/editor.main"], () => window.monaco ? resolve(window.monaco) : reject(new Error("Monaco editor failed to initialise."))); };
    const existing = document.querySelector<HTMLScriptElement>('script[data-monaco-loader="true"]');
    if (existing) { existing.addEventListener("load", boot, { once: true }); if (typeof window.require === "function") boot(); return; }
    const script = document.createElement("script"); script.src = "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/loader.js"; script.async = true; script.dataset.monacoLoader = "true"; script.onload = boot; script.onerror = () => reject(new Error("Could not load the Code Lab editor engine.")); document.head.appendChild(script);
  });
  return loaderPromise;
}

function toMarker(monaco: MonacoNamespace, diagnostic: RuntimeDiagnostic, model: MonacoModel): MonacoMarker {
  const line = Math.max(1, Math.min(diagnostic.line ?? 1, model.getLineCount()));
  const column = Math.max(1, diagnostic.column ?? 1);
  const maxColumn = model.getLineMaxColumn(line);
  return { severity: diagnostic.severity === "error" ? monaco.editor.MarkerSeverity.Error : diagnostic.severity === "warning" ? monaco.editor.MarkerSeverity.Warning : monaco.editor.MarkerSeverity.Info, message: diagnostic.message, startLineNumber: line, startColumn: Math.min(column, maxColumn), endLineNumber: line, endColumn: Math.min(Math.max(column + 1, 2), maxColumn) };
}

export function CodeLabEditor({ value, language, onChange, onRun, onSave }: { value: string; language: string; onChange: (value: string) => void; onRun?: () => void; onSave?: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<MonacoEditor | null>(null);
  const latestValue = useRef(value);
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);
  const onSaveRef = useRef(onSave);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<EditorSettings>(DEFAULT_SETTINGS);

  latestValue.current = value; onChangeRef.current = onChange; onRunRef.current = onRun; onSaveRef.current = onSave;

  useEffect(() => { try { const raw = localStorage.getItem(SETTINGS_KEY); if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) }); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch {} const editor = editorRef.current as (MonacoEditor & { updateOptions?: (options: Record<string, unknown>) => void }) | null; editor?.updateOptions?.({ fontSize: settings.fontSize, tabSize: settings.tabSize, wordWrap: settings.wordWrap, minimap: { enabled: settings.minimap } }); }, [settings]);

  useEffect(() => {
    let alive = true; let disposable: MonacoDisposable | undefined;
    void loadMonaco().then((monaco) => {
      if (!alive || !hostRef.current) return;
      monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({ noSemanticValidation: false, noSyntaxValidation: false });
      monaco.languages.typescript.javascriptDefaults.setCompilerOptions({ allowJs: true, allowNonTsExtensions: true, target: 99, module: 99 });
      monaco.editor.defineTheme("shadecode-dark", { base: "vs-dark", inherit: true, rules: [{ token: "comment", foreground: "6B7280" }, { token: "keyword", foreground: "C4B5FD" }, { token: "string", foreground: "86EFAC" }, { token: "number", foreground: "FDE68A" }], colors: { "editor.background": "#0b0f17", "editor.foreground": "#e5e7eb", "editorLineNumber.foreground": "#475569", "editorLineNumber.activeForeground": "#cbd5e1", "editorCursor.foreground": "#f8fafc", "editor.selectionBackground": "#334155", "editor.inactiveSelectionBackground": "#1e293b", "editor.lineHighlightBackground": "#111827", "editorIndentGuide.background1": "#1e293b", "editorIndentGuide.activeBackground1": "#334155", "editorBracketMatch.background": "#1e293b", "editorBracketMatch.border": "#475569" } });
      const editor = monaco.editor.create(hostRef.current, { value: latestValue.current, language, theme: "shadecode-dark", automaticLayout: true, minimap: { enabled: settings.minimap, scale: 1 }, fontSize: settings.fontSize, lineHeight: 22, fontFamily: "JetBrains Mono, Fira Code, Consolas, monospace", fontLigatures: true, padding: { top: 16, bottom: 24 }, scrollBeyondLastLine: false, smoothScrolling: true, stickyScroll: { enabled: true, maxLineCount: 3 }, bracketPairColorization: { enabled: true }, guides: { bracketPairs: true, indentation: true }, folding: true, foldingHighlight: true, showFoldingControls: "mouseover", renderWhitespace: "selection", renderValidationDecorations: "on", unicodeHighlight: { ambiguousCharacters: false, invisibleCharacters: true }, autoIndent: "full", formatOnPaste: true, formatOnType: true, tabSize: settings.tabSize, insertSpaces: true, detectIndentation: true, wordWrap: settings.wordWrap, cursorSmoothCaretAnimation: "on", mouseWheelZoom: true, suggest: { showMethods: true, showFunctions: true, showVariables: true, showClasses: true, showKeywords: true }, quickSuggestions: true, suggestSelection: "first", tabCompletion: "on", parameterHints: { enabled: true }, occurrencesHighlight: "singleFile", selectionHighlight: true });
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRunRef.current?.()); editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => onSaveRef.current?.()); disposable = editor.onDidChangeModelContent(() => onChangeRef.current(editor.getValue())); editorRef.current = editor; setState("ready");
    }).catch(() => { if (alive) setState("error"); });
    return () => { alive = false; disposable?.dispose(); editorRef.current?.dispose(); editorRef.current = null; };
  }, [language]);

  useEffect(() => { const editor = editorRef.current; if (editor && editor.getValue() !== value) editor.setValue(value); }, [value]);
  useEffect(() => { const handler = (event: Event) => { const detail = (event as CustomEvent<{ entryFile?: string; diagnostics?: RuntimeDiagnostic[] }>).detail; const editor = editorRef.current; const model = editor?.getModel(); if (!editor || !model) return; const diagnostics = Array.isArray(detail?.diagnostics) ? detail.diagnostics : []; const relevant = diagnostics.filter((d) => !d.file || !detail?.entryFile || d.file === detail.entryFile); const monaco = window.monaco; if (monaco) monaco.editor.setModelMarkers(model, "shadecode-runtime", relevant.map((d) => toMarker(monaco, d, model))); }; window.addEventListener("shadecode:comp-lab:runtime", handler); return () => window.removeEventListener("shadecode:comp-lab:runtime", handler); }, []);

  return <div className="relative h-full min-h-[430px] overflow-hidden bg-[#0b0f17]"><div ref={hostRef} className="absolute inset-0" />
    {state === "loading" && <div className="absolute inset-0 grid place-items-center bg-[#0b0f17] text-slate-400"><div className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Loading editor engine…</div></div>}
    {state === "error" && <div className="absolute inset-0 grid place-items-center bg-[#0b0f17] p-6 text-center text-slate-400"><div><p className="font-medium text-slate-200">Editor engine unavailable</p><p className="mt-1 text-sm">The workspace remains available, but the advanced editor could not load.</p></div></div>}
    {state === "ready" && <><button type="button" onClick={() => setSettingsOpen((v) => !v)} title="Editor settings" className="absolute right-3 top-3 z-10 rounded-lg border border-white/10 bg-[#0d121b]/90 p-2 text-slate-400 shadow-sm hover:text-slate-200"><Settings2 className="h-3.5 w-3.5" /></button>{settingsOpen && <div className="absolute right-3 top-12 z-20 w-56 rounded-xl border border-white/10 bg-[#0d121b] p-3 text-xs text-slate-300 shadow-2xl"><div className="mb-3 font-semibold text-slate-100">Editor settings</div><label className="mb-3 block">Font size <span className="float-right text-slate-500">{settings.fontSize}px</span><input type="range" min="12" max="20" value={settings.fontSize} onChange={(e) => setSettings((s) => ({ ...s, fontSize: Number(e.target.value) }))} className="mt-2 w-full" /></label><label className="mb-3 block">Tab size<select value={settings.tabSize} onChange={(e) => setSettings((s) => ({ ...s, tabSize: Number(e.target.value) }))} className="mt-1 w-full rounded-md border border-white/10 bg-[#080b11] p-1.5"><option value={2}>2 spaces</option><option value={4}>4 spaces</option><option value={8}>8 spaces</option></select></label><label className="mb-3 flex items-center justify-between">Word wrap<input type="checkbox" checked={settings.wordWrap === "on"} onChange={(e) => setSettings((s) => ({ ...s, wordWrap: e.target.checked ? "on" : "off" }))} /></label><label className="flex items-center justify-between">Minimap<input type="checkbox" checked={settings.minimap} onChange={(e) => setSettings((s) => ({ ...s, minimap: e.target.checked }))} /></label></div>}<div className="pointer-events-none absolute bottom-2 right-3 rounded bg-black/30 px-2 py-1 font-mono text-[9px] text-slate-600">Ctrl/Cmd+Enter Run · Ctrl/Cmd+S Save · wheel+Ctrl Zoom</div></>}
  </div>;
}
