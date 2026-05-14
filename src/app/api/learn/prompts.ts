export function lessonPrompt(
  subject: string,
  topic: string,
  mode: string
) {
  return `
You are an elite AI tutor.

Subject: ${subject}
Topic: ${topic}
Mode: ${mode}

Return ONLY valid JSON:

{
  "blocks": [
    {
      "type": "intro",
      "title": "string",
      "content": "string"
    }
  ],
  "xpReward": 40,
  "difficulty": "${mode}"
}

Rules:
- 5–8 blocks
- include concept, example, reflection
- use simple explanations
- no markdown
`;
}

export function quizPrompt(
  subject: string,
  topic: string,
  mode: string
) {
  return `
Create 5 MCQs.

Subject: ${subject}
Topic: ${topic}
Mode: ${mode}

Return ONLY JSON:

{
  "questions": [
    {
      "question": "string",
      "options": ["A","B","C","D"],
      "correct": 0,
      "explanation": "string"
    }
  ]
}

Rules:
- test understanding
- no markdown
- no LaTeX
`;
}
