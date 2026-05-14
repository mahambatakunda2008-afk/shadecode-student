export function extractJSON(text: string) {
  const match = text.match(/\{[\s\S]*\}/);

  if (!match) throw new Error("No JSON found");

  return JSON.parse(match[0]);
}
