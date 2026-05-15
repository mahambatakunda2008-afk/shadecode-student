export async function generateAILesson(subject: string, topic: string) {
  const res = await fetch("/api/openai/generate-lesson", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ subject, topic }),
  });

  if (!res.ok) {
    throw new Error("Failed to generate AI lesson (OpenAI)");
  }

  return res.json();
}
