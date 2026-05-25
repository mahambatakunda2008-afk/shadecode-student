export class LocalModel {
  async ask(question: string): Promise<string> {
    return `Local Cortex fallback response: ${question}`;
  }
}
