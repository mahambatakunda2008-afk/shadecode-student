if (process.env.VERCEL !== "1" || process.env.VERCEL_GIT_COMMIT_REF !== "curriculum/biology-9700-foundation-and-verifier") {
  console.log("Biology preview seed skipped outside the dedicated Biology verification branch.");
  process.exit(0);
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Biology preview seed requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
}

console.log("Biology 9700: generating the official dataset...");
await import("./generate-cambridge-biology-9700-dataset.mjs");

console.log("Biology 9700: seeding objectives and learning outcomes...");
await import("./seed-cambridge-biology-9700.mjs");

console.log("Biology 9700: reconciling the live database...");
await import("./verify-cambridge-biology-9700-db.mjs");

console.log("Biology 9700: database verification complete.");
