"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CATALOG, type Course, type CourseCategory } from "@/lib/catalog";
import ProgressBar from "@/components/ProgressBar";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function CourseCatalog() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | CourseCategory | "all">("all");
  const [enrolled, setEnrolled] = useState<Record<string, boolean>>({});
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [loadingProgress, setLoadingProgress] = useState(false);

  // Load enrolled set from localStorage (fallback) and from server when authenticated
  useEffect(() => {
    try {
      const raw = localStorage.getItem("catalog.enrolled");
      if (raw) setEnrolled(JSON.parse(raw));
    } catch {}
  }, []);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("catalog.enrolled", JSON.stringify(enrolled));
    } catch {}
  }, [enrolled]);

  // Load server enrollments if authenticated and also fetch learn progress
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoadingProgress(true);
      try {
        const sb = createClient();
        const { data: { session } } = await sb.auth.getSession();
        if (!session) {
          setProgressMap({});
          setLoadingProgress(false);
          return;
        }
        const token = session.access_token;

        // Fetch enrollments from server
        try {
          const er = await fetch('/api/catalog/enroll');
          if (er.ok) {
            const ed = await er.json();
            if (mounted && ed?.enrolled) setEnrolled((prev) => ({ ...prev, ...Object.fromEntries(ed.enrolled.map((id: string) => [id, true])) }));
          }
        } catch (e) { /* ignore */ }

        // Fetch lessons/progress
        const r = await fetch("/api/learn", { headers: { Authorization: `Bearer ${token}` } });
        if (!r.ok) { setProgressMap({}); setLoadingProgress(false); return; }
        const d = await r.json();
        const lessons = d.lessons ?? [];
        // compute avg progress per subject title
        const bySubject: Record<string, { sum: number; count: number }> = {};
        for (const l of lessons) {
          const subj = l.subject ?? l.subjectId ?? "Unknown";
          bySubject[subj] = bySubject[subj] ?? { sum: 0, count: 0 };
          bySubject[subj].sum += (l.progress ?? 0);
          bySubject[subj].count += 1;
        }
        const map: Record<string, number> = {};
        for (const c of CATALOG) {
          // match by exact title ↔ subject name (best-effort)
          const s = Object.keys(bySubject).find((k) => k.toLowerCase() === c.title.toLowerCase());
          if (s) {
            map[c.id] = Math.round(bySubject[s].sum / Math.max(1, bySubject[s].count));
          }
        }
        if (mounted) setProgressMap(map);
      } catch (e) {
        console.error("Failed to load progress:", e);
      } finally { if (mounted) setLoadingProgress(false); }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const categories = useMemo(() => {
    const set = new Set<CourseCategory>(CATALOG.map(c => c.category));
    return ["all", ...Array.from(set)] as ("all" | CourseCategory)[];
  }, []);

  const filtered = useMemo(() => {
    return CATALOG.filter((c) => {
      if (category !== "all" && c.category !== category) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return c.title.toLowerCase().includes(q) || c.shortDescription.toLowerCase().includes(q);
    });
  }, [query, category]);

  async function toggleEnroll(id: string) {
    // optimistic local update
    setEnrolled((prev) => ({ ...prev, [id]: !prev[id] }));

    // if authenticated, persist to server
    try {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return;

      const token = session.access_token;
      const res = await fetch('/api/catalog/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ courseId: id }),
      });
      if (res.ok) {
        const j = await res.json();
        const setObj = Object.fromEntries((j.enrolled ?? []).map((c: string) => [c, true]));
        setEnrolled((prev) => ({ ...prev, ...setObj }));
      }
    } catch (e) {
      // ignore server errors, keep local state
    }
  }

  const [previewCourse, setPreviewCourse] = useState<Course | null>(null);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex gap-3 mb-4">
        <input aria-label="Search courses" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search courses" className="flex-1 px-3 py-2 rounded border bg-background" />
        <select value={category} onChange={(e) => setCategory(e.target.value as any)} className="px-3 py-2 rounded border bg-background">
          {categories.map((cat) => (
            <option key={String(cat)} value={String(cat)}>{String(cat)}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filtered.map((course) => (
          <div key={course.id} className="p-3 bg-card rounded-lg border border-card-border">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">{course.title}</h4>
                  <span className="text-xs text-muted-foreground">{course.category}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{course.shortDescription}</p>

                <div className="mt-3">
                  <div className="text-xs text-muted-foreground">Progress</div>
                  <div className="mt-1">
                    <ProgressBar value={progressMap[course.id] ?? 0} max={100} />
                    <div className="text-xs mt-1">{loadingProgress ? "Loading..." : `${progressMap[course.id] ?? 0}%`}</div>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant={enrolled[course.id] ? "outline" : "default"} onClick={() => toggleEnroll(course.id)}>
                    {enrolled[course.id] ? "Enrolled" : "Enroll"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setPreviewCourse(course)}>
                    Preview
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Preview modal */}
      {previewCourse && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} onClick={() => setPreviewCourse(null)} />
          <div style={{ background: 'var(--background)', padding: 16, borderRadius: 8, width: '90%', maxWidth: 640, zIndex: 70 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>{previewCourse.title}</h3>
              <button onClick={() => setPreviewCourse(null)} style={{ border: 'none', background: 'none', color: 'var(--muted-foreground)' }}>Close</button>
            </div>
            <p style={{ color: 'var(--muted-foreground)' }}>{previewCourse.shortDescription}</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <div>Lessons: {previewCourse.lessons}</div>
              <div>XP est: {previewCourse.xpEstimate ?? 0}</div>
              <div>Category: {previewCourse.category}</div>
            </div>
            <div style={{ marginTop: 12 }}>
              <Button size="sm" variant={enrolled[previewCourse.id] ? 'outline' : 'default'} onClick={() => toggleEnroll(previewCourse.id)}>
                {enrolled[previewCourse.id] ? 'Enrolled' : 'Enroll'}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
