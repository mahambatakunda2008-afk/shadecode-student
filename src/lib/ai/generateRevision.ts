export async function generateRevision(content: string, topic: string) {
  const res = await fetch("/api/generate-revision", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content, topic }),
  });

  if (!res.ok) throw new Error("Failed to generate revision");

  return res.json();
}
