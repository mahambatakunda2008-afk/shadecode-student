const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export async function getLessons() {
  const res = await fetch(`${API_BASE}/lessons`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch lessons");
  }

  return res.json();
}

export async function getSuggestedTopics(subject: string) {
  const res = await fetch(
    `${API_BASE}/topics?subject=${encodeURIComponent(subject)}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch suggested topics");
  }

  return res.json();
}
