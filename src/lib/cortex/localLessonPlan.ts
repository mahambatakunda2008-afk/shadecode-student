export function buildLocalSectionRequirements(index: number, sectionCount: number, opts: { formula?: boolean } = {}): string {
  const count = Math.max(1, Math.floor(sectionCount));
  const position = Math.max(0, Math.min(count - 1, Math.floor(index)));
  if (count === 1) {
    return "Include a clear learner target, foundational concepts, at least one worked example, a thinking checkpoint, exam transfer, one likely misconception, a concrete application, synthesis, and a summary.";
  }

  const required: string[] = [];
  if (position === 0) required.push("objective", "map");
  if (position >= 1 && position <= count - 2) required.push("example", "checkpoint");
  if (position === 1) required.push("structure");
  if (count > 2 && position === Math.min(2, count - 2)) required.push("mechanism", ...(opts.formula ? ["formula"] : []));
  if (count > 2 && position === count - 2) required.push("synthesis");
  if (position === count - 1) required.push("curiosity", "practice", "mistake", "summary", "application", "checkpoint");

  const guidance: Record<string, string> = {
    objective: "state concrete learner outcomes",
    map: "show the big picture and how its parts connect",
    example: "include a fully worked example with intermediate reasoning",
    checkpoint: "include a learner thinking checkpoint",
    structure: "explain the topic's structure, components or classification",
    mechanism: "explain the causal process or step-by-step reasoning",
    formula: "state relevant equations, define symbols and units, and explain conditions",
    synthesis: "connect multiple ideas in a larger chain of reasoning",
    curiosity: "open a grounded next question or consequence",
    practice: "set progressively harder questions with useful answer guidance",
    mistake: "explain a realistic common mistake and why it fails",
    summary: "give a concise mental model of the lesson",
    application: "show a concrete real-world or cross-topic application",
  };
  const instructions = required.map(type => `${type}: ${guidance[type]}.`);
  if (position === count - 1) instructions.push("This is the FINAL section. Do not refer to a nonexistent later section.");
  return `Include these required block types in this section: ${instructions.join(" ")}`;
}
