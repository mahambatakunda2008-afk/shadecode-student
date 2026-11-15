"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, ExternalLink, Loader2, Play, Search, Video } from "lucide-react";
import TeacherVerifiedBadge from "@/components/learn/TeacherVerifiedBadge";
import type { TutorialSummary } from "@/components/learn/TeacherTutorials";

type VideoResult = { id: string; title: string; description: string; channel: string; publishedAt: string | null; thumbnail: string | null; url: string };

export default function LearningResourcesPage() {
  const [tutorials, setTutorials] = useState<TutorialSummary[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("");
  const [videos, setVideos] = useState<VideoResult[]>([]);
  const [searchUrl, setSearchUrl] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/learn/tutorials/browse", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "Your learning resources could not be loaded.");
        return body;
      })
      .then((body) => {
        if (!active) return;
        const available = Array.isArray(body.subjects) ? body.subjects as string[] : [];
        setSubjects(available);
        setSubject(available[0] ?? "");
        setTutorials(Array.isArray(body.tutorials) ? body.tutorials : []);
      })
      .catch((reason) => active && setError(reason instanceof Error ? reason.message : "Your learning resources could not be loaded."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const matchedTutorials = useMemo(() => tutorials.filter((item) => {
    if (subject && item.subject !== subject) return false;
    if (!topic.trim()) return true;
    const needle = topic.toLowerCase();
    return [item.topic, item.title, item.summary].some((value) => value?.toLowerCase().includes(needle));
  }), [tutorials, subject, topic]);

  async function searchVideos(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!subject) return;
    setSearching(true);
    setMessage("");
    setError("");
    setVideos([]);
    try {
      const params = new URLSearchParams({ subject, topic, level });
      const response = await fetch(`/api/learn/resources/youtube?${params.toString()}`, { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Video search failed.");
      setVideos(Array.isArray(body.videos) ? body.videos : []);
      setSearchUrl(typeof body.searchUrl === "string" ? body.searchUrl : "");
      setMessage(typeof body.message === "string" ? body.message : "");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Video search failed.");
    } finally {
      setSearching(false);
    }
  }

  return <div className="mx-auto w-full max-w-5xl space-y-7 px-4 py-6 sm:px-6">
    <header className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--primary)]">Your learning library</p>
      <h1 className="text-2xl font-bold sm:text-3xl">Find something that actually teaches you.</h1>
      <p className="max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">Discover reviewed tutorials from Shadecode educators and search YouTube using your subject, exact topic and level. No generic video firehose.</p>
    </header>

    <form onSubmit={searchVideos} className="space-y-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 sm:p-5">
      <div className="flex items-center gap-2 font-semibold"><Search size={18} />Find a learning resource</div>
      {loading ? <p className="text-sm text-[var(--muted-foreground)]">Loading your subjects…</p> : <>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1 text-xs font-medium"><span>Subject</span>
            <select value={subject} onChange={(event) => setSubject(event.target.value)} required className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-3 text-sm">
              {subjects.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium sm:col-span-2"><span>Topic or concept</span>
            <input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. Kirchhoff's laws, differentiation, data structures" maxLength={180} className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-3 text-sm" />
          </label>
          <label className="space-y-1 text-xs font-medium sm:col-span-3"><span>Level / syllabus context (optional)</span>
            <input value={level} onChange={(event) => setLevel(event.target.value)} placeholder="e.g. Cambridge AS 9702, ZIMSEC A Level" maxLength={80} className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-3 text-sm" />
          </label>
        </div>
        <button disabled={!subject || searching} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-[var(--primary-foreground)] disabled:opacity-50">
          {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}Search learning videos
        </button>
      </>}
      {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
      {message && <p role="status" className="text-sm text-[var(--muted-foreground)]">{message}</p>}
      {searchUrl && <a href={searchUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)]">Open targeted YouTube search <ExternalLink size={14} /></a>}
    </form>

    <section className="space-y-3">
      <div className="flex items-center gap-2"><Video size={18} /><h2 className="text-lg font-bold">YouTube learning videos</h2></div>
      {videos.length === 0 && !searching && <p className="rounded-xl border border-dashed border-[var(--card-border)] p-4 text-sm text-[var(--muted-foreground)]">Search for a subject and topic to find relevant videos. Video playback is always click-to-load to protect data.</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {videos.map((video) => <article key={video.id} className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card)]">
          <a href={video.url} target="_blank" rel="noopener noreferrer" className="group relative block aspect-video bg-[var(--surface-2)]">
            {video.thumbnail && <img src={video.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" />}
            <span className="absolute inset-0 flex items-center justify-center bg-black/10 transition group-hover:bg-black/25"><span className="rounded-full bg-black/75 p-3 text-white"><Play size={22} fill="currentColor" /></span></span>
          </a>
          <div className="space-y-1 p-3">
            <h3 className="line-clamp-2 text-sm font-semibold">{video.title}</h3>
            <p className="text-xs text-[var(--muted-foreground)]">{video.channel}</p>
            {video.description && <p className="line-clamp-2 text-xs leading-5 text-[var(--muted-foreground)]">{video.description}</p>}
          </div>
        </article>)}
      </div>
    </section>

    <section className="space-y-3">
      <div className="flex items-center gap-2"><BookOpen size={18} /><h2 className="text-lg font-bold">Shadecode educator tutorials</h2></div>
      {matchedTutorials.length === 0 ? <p className="rounded-xl border border-dashed border-[var(--card-border)] p-4 text-sm text-[var(--muted-foreground)]">No published educator tutorials match this subject and topic yet. You can still use the video search above.</p> :
        <div className="grid gap-3 sm:grid-cols-2">{matchedTutorials.map((item) => <Link key={item.id} href={`/learn/tutorials/${item.id}`} className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 transition hover:border-[var(--primary)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">{item.subject}{item.topic ? ` · ${item.topic}` : ""}</p>
          <h3 className="mt-1 text-sm font-semibold">{item.title}</h3>
          {item.summary && <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">{item.summary}</p>}
          <div className="mt-2"><TeacherVerifiedBadge compact verifiedAt={item.verified_at} /></div>
        </Link>)}</div>}
    </section>
    <p className="text-xs leading-5 text-[var(--muted-foreground)]">External videos are hosted by YouTube. Check the creator, syllabus coverage and explanation quality before relying on a video for exam preparation.</p>
  </div>;
}
