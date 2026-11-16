import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveLearnerSubject } from "@/lib/academic/subjectAccess";
import { applyRateLimit, generalApiLimiter } from "@/lib/rate-limit/limiter";

export const dynamic = "force-dynamic";

function clean(value: string | null, max: number) {
  return (value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request, generalApiLimiter);
  if (limited) return limited;

  const subjectInput = clean(request.nextUrl.searchParams.get("subject"), 120);
  const topic = clean(request.nextUrl.searchParams.get("topic"), 180);
  const level = clean(request.nextUrl.searchParams.get("level"), 80);
  const syllabus = clean(request.nextUrl.searchParams.get("syllabus"), 100);
  if (!subjectInput) return NextResponse.json({ error: "Choose a subject.", videos: [] }, { status: 400 });

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to discover learning resources.", videos: [] }, { status: 401 });

    const access = await resolveLearnerSubject(supabase, user.id, subjectInput);
    if (!access.ok) return NextResponse.json({ error: access.error, videos: [] }, { status: access.status });

    const query = [access.subject, topic, level, syllabus, "lesson tutorial explanation"].filter(Boolean).join(" ");
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const key = process.env.YOUTUBE_DATA_API_KEY;
    if (!key) {
      return NextResponse.json({
        videos: [],
        searchUrl,
        configured: false,
        message: "Live video results are not configured yet. You can still open this exact subject and topic search on YouTube.",
      }, { headers: { "Cache-Control": "private, no-store" } });
    }

    const params = new URLSearchParams({
      part: "snippet",
      type: "video",
      maxResults: "12",
      order: "relevance",
      safeSearch: "strict",
      videoEmbeddable: "true",
      q: query,
      key,
    });
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      console.error("[learn/resources/youtube] YouTube API returned", response.status);
      return NextResponse.json({
        videos: [], searchUrl, configured: true,
        message: "Video search is temporarily unavailable. Open the targeted YouTube search instead.",
      }, { headers: { "Cache-Control": "private, no-store" } });
    }
    const payload = await response.json() as {
      items?: Array<{ id?: { videoId?: string }; snippet?: { title?: string; description?: string; channelTitle?: string; publishedAt?: string; thumbnails?: { medium?: { url?: string }; high?: { url?: string } } } }>;
    };
    const videos = (payload.items ?? []).flatMap((item) => {
      const id = item.id?.videoId;
      const snippet = item.snippet;
      if (!id || !/^[\w-]{11}$/.test(id) || !snippet) return [];
      return [{
        id,
        title: (snippet.title ?? "Learning video").replace(/<[^>]*>/g, "").slice(0, 240),
        description: (snippet.description ?? "").replace(/<[^>]*>/g, "").slice(0, 500),
        channel: (snippet.channelTitle ?? "YouTube creator").slice(0, 120),
        publishedAt: snippet.publishedAt ?? null,
        thumbnail: snippet.thumbnails?.high?.url ?? snippet.thumbnails?.medium?.url ?? null,
        url: `https://www.youtube.com/watch?v=${id}`,
      }];
    });
    return NextResponse.json({ videos, searchUrl, configured: true, query }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("[learn/resources/youtube]", error);
    return NextResponse.json({ error: "Could not search learning videos right now.", videos: [] }, { status: 503 });
  }
}
