const FABRICATION_PATTERNS = [
  /i (interviewed|surveyed|asked|observed|measured|tested|built|conducted|visited)/i,
  /we (interviewed|surveyed|asked|observed|measured|tested|built|conducted|visited)/i,
  /\b\d+\s+(people|students|participants|respondents)\b/i,
  /the (interview|survey|experiment|test) (showed|found|revealed)/i,
];

export type IntegrityResult = { safe: boolean; reasons: string[] };

export function checkGeneratedProjectText(text: string): IntegrityResult {
  const reasons = FABRICATION_PATTERNS.filter((pattern) => pattern.test(text)).map(() => "Generated text appears to state unverified fieldwork or project evidence as fact.");
  return { safe: reasons.length === 0, reasons: [...new Set(reasons)] };
}

export function evidenceIntegrityInstruction(): string {
  return "Never invent or imply that a learner conducted an interview, survey, observation, experiment, measurement, prototype test or other fieldwork. If evidence is missing, ask the learner to collect it or clearly label any example as hypothetical.";
}
