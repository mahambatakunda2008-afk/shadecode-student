"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

type MonacoEditor = {
  getValue: () => string;
  setValue: (value: string) => void;
  layout: () => void;
  dispose: () => void;
  focus: () => void;
  addCommand: (keybinding: number, handler: () => void) => void;
};

type MonacoNamespace = {
  editor: {
    create: (element: HTMLElement, options: Record<string, unknown>) => MonacoEditor;
    defineTheme: (name: string, theme: Record<string, unknown>) => void;
  };
  KeyMod: { CtrlCmd: number };
  KeyCode: { Enter: number };
};

type LoaderRequire = ((deps: string[], callback: () => void) => void) & {
  config: (options: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    require?: LoaderRequire;
    monaco?: MonacoNamespace;
  }
}

let loaderPromise: Promise<MonacoNamespace> | null = null;

function loadMonaco() {
  if (typeof window === "undefined") return Promise.reject(new Error("Monaco requires a browser."));
  if (window.monaco) return Promise.resolve(window.monaco);
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    const boot = () => {
      if (!window.require) {
        reject(new Error("Monaco loader did not initialise."));
        return;
      }
      window.require.config({ paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs" } });
      window.require(["vs/editor/editor.main"], () => {
        if (window.monaco) resolve(window.monaco);
        else reject(new Error("Monaco editor failed to initialise."));
      });
    };

    const existing = document.querySelector<HTMLScriptElement>('script[data-monaco-loader="true"]');
    if (existing) {
      existing.addEventListener("load", boot, { once: true });
      if (window.require) boot();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/loader.js";
    script.async = true;
    script.dataset.monacoLoader = "true";
    script.onload = boot;
    script.onerror = () => reject(new Error("Could not load the Code Lab editor engine."));
    document.head.appendChild(script);
  });

  return loaderPromise;
}

export function CodeLabEditor({
  value,
  language,
  onChange,
  onRun,
}: {
  value: string;
  language: string;
  onChange: (value: string) => void;
  onRun: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<MonacoEditor | null>(null);
  const latestValue = useRef(value);
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  latestValue.current = value;
  onChangeRef.current = onChange;
  onRunRef.current = onRun;

  useEffect(() => {
    let alive = true;
    void loadMonaco().then((monaco) => {
      if (!alive || !hostRef.current) return;
      monaco.editor.defineTheme("shadecode-dark", {
        base: "vs-dark",
        inherit: true,
        rules: [
          { token: "comment", foreground: "6B7280" },
          { token: "keyword", foreground: "C4B5FD" },
          { token: "string", foreground: "86EFAC" },
          { token: "number", foreground: "FDE68A" },
        ],
        colors: {
          "editor.background": "#0b0f17",
          "editor.foreground": "#e5e7eb",
          "editorLineNumber.foreground": "#475569",
          "editorLineNumber.activeForeground": "#cbd5e1",
          "editorCursor.foreground": "#f8fafc",
          "editor.selectionBackground": "#334155",
          "editor.lineHighlightBackground": "#111827",
          "editorIndentGuide.background1": "#1e293b",
          "editorIndentGuide.activeBackground1": "#334155",
        },
      });

      const editor = monaco.editor.create(hostRef.current, {
        value: latestValue.current,
        language,
        theme: "shadecode-dark",
        automaticLayout: true,
        minimap: { enabled: true, scale: 1 },
        fontSize: 14,
        lineHeight: 22,
        fontFamily: "JetBrains Mono, Fira Code, Consolas, monospace",
        fontLigatures: true,
        padding: { top: 16, bottom: 24 },
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        cursorSmoothCaretAnimation: "on",
        bracketPairColorization: { enabled: true },
        guides: { bracketPairs: true, indentation: true },
        suggest: { showMethods: true, showFunctions: true },
        quickSuggestions: true,
        tabSize: 2,
      });

      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRunRef.current());
      const originalGetValue = editor.getValue.bind(editor);
      const originalSetValue = editor.setValue.bind(editor);
      editor.getValue = originalGetValue;
      editor.setValue = originalSetValue;

      // Monaco's model listener is intentionally accessed through the editor instance API at runtime.
      const model = (editor as unknown as { onDidChangeModelContent?: (cb: () => void) => { dispose: () => void } });
      const disposable = model.onDidChangeModelContent?.(() => onChangeRef.current(editor.getValue()));
      editorRef.current = editor;
      setState("ready");

      return () => {
        disposable?.dispose();
        editor.dispose();
      };
    }).catch(() => {
      if (alive) setState("error");
    });

    return () => {
      alive = false;
      editorRef.current?.dispose();
      editorRef.current = null;
    };
  }, [language]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (editor.getValue() !== value) editor.setValue(value);
  }, [value]);

  return (
    <div className="relative h-full min-h-[430px] overflow-hidden bg-[#0b0f17]">
      <div ref={hostRef} className="absolute inset-0" />
      {state === "loading" && (
        <div className="absolute inset-0 grid place-items-center bg-[#0b0f17] text-slate-400">
          <div className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading editor engine…</div>
        </div>
      )}
      {state === "error" && (
        <div className="absolute inset-0 grid place-items-center bg-[#0b0f17] p-6 text-center text-slate-400">
          <div><p className="font-medium text-slate-200">Editor engine unavailable</p><p className="mt-1 text-sm">The workspace remains available, but the advanced editor could not load.</p></div>
        </div>
      )}
    </div>
  );
}
