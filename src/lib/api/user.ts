const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export async function getUserStats() {
  const res = await fetch(`${API_BASE}/user/stats`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch user stats");
  }

  return res.json();
}
