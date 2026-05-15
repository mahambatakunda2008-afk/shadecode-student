export async function fetchRecommendations(subject: string) {
  const res = await fetch(
    `/api/gemini/recommendations?subject=${encodeURIComponent(subject)}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch Gemini recommendations");
  }

  return res.json();
}
