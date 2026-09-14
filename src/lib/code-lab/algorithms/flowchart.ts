export type FlowchartNodeType = "start" | "end" | "process" | "input" | "output" | "decision" | "loop" | "call";
export type FlowchartNode = { id: string; type: FlowchartNodeType; label: string; line?: number };
export type FlowchartEdge = { from: string; to: string; label?: string };
export type FlowchartGraph = { nodes: FlowchartNode[]; edges: FlowchartEdge[] };

/** Converts common structured pseudocode into a deterministic flow graph for the Comp Lab visualizer. */
export function pseudocodeToFlowchart(source: string): FlowchartGraph {
  const lines = source.split(/\r?\n/).map((raw, index) => ({ raw, line: index + 1, text: raw.replace(/\/\/.*$/, "").trim() })).filter(item => item.text);
  const nodes: FlowchartNode[] = [{ id: "start", type: "start", label: "START" }];
  const edges: FlowchartEdge[] = [];
  let previous = "start";
  let counter = 0;
  const stack: Array<{ id: string; type: "decision" | "loop"; exit: string }> = [];
  const add = (type: FlowchartNodeType, label: string, line?: number) => {
    const id = `n${++counter}`;
    nodes.push({ id, type, label, line });
    if (previous) edges.push({ from: previous, to: id });
    previous = id;
    return id;
  };

  for (const item of lines) {
    const text = item.text;
    if (/^(BEGIN|END|ENDIF|END\s+IF|ENDWHILE|END\s+WHILE|ENDFOR|END\s+FOR|ENDCASE|END\s+CASE|UNTIL\b|ELSE)$/i.test(text)) continue;
    if (/^(PROCEDURE|FUNCTION)\b/i.test(text)) { add("call", text, item.line); continue; }
    if (/^INPUT\b/i.test(text)) { add("input", text.replace(/^INPUT\s+/i, ""), item.line); continue; }
    if (/^(OUTPUT|PRINT)\b/i.test(text)) { add("output", text.replace(/^(OUTPUT|PRINT)\s+/i, ""), item.line); continue; }
    if (/^IF\b/i.test(text)) {
      const id = add("decision", text.replace(/^IF\s+/i, "").replace(/\s+THEN$/i, ""), item.line);
      const exit = `exit-${id}`; stack.push({ id, type: "decision", exit }); continue;
    }
    if (/^(WHILE|FOR|REPEAT)\b/i.test(text)) {
      const id = add("loop", text, item.line);
      stack.push({ id, type: "loop", exit: `exit-${id}` }); continue;
    }
    if (/^CALL\b/i.test(text)) { add("call", text.replace(/^CALL\s+/i, ""), item.line); continue; }
    if (/^(SET\s+)?[A-Za-z_]\w*\s*(←|<-|=)/.test(text) || /^DECLARE\b/i.test(text)) { add("process", text, item.line); continue; }
    add("process", text, item.line);
  }

  while (stack.length) {
    const block = stack.pop()!;
    const exitId = block.exit;
    nodes.push({ id: exitId, type: "process", label: "Continue" });
    edges.push({ from: block.id, to: exitId, label: block.type === "decision" ? "No / ELSE" : "Exit" });
    if (block.type === "loop") edges.push({ from: exitId, to: block.id, label: "repeat" });
  }
  const endId = `n${++counter}`;
  nodes.push({ id: endId, type: "end", label: "END" });
  if (previous !== "start") edges.push({ from: previous, to: endId }); else edges.push({ from: "start", to: endId });
  return { nodes, edges };
}
