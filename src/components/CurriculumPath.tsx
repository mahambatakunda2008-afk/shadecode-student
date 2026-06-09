"use client";

import { useEffect, useState } from "react";

type Lesson = {
  id: string;
  title: string;
  subject_id: string;
  difficulty?: string | null;
  progress: number;
  updated_at?: string | null;
};

export default function CurriculumPath() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<any>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/curriculum");
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error || "Failed to load");
        setState(j.state);
      } catch (err: any) {
        setError(err.message || "Error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div>Loading curriculum…</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;
  if (!state) return <div>No curriculum data</div>;

  const { currentLesson, recommendedNextLesson, completedLessons, lockedLessons, completionPercent } = state;

  return (
    <div style={{ padding: 12, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }}>
      <h3 style={{ marginTop: 0 }}>Curriculum Path</h3>
      <p>Completion: {completionPercent}%</p>

      <div style={{ marginTop: 12 }}>
        <strong>Current lesson</strong>
        {currentLesson ? (
          <div style={{ marginTop: 6 }}>{currentLesson.title} — {currentLesson.progress}%</div>
        ) : (
          <div style={{ marginTop: 6, color: 'rgba(255,255,255,0.45)' }}>No active lesson — try the recommended next lesson.</div>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <strong>Recommended next</strong>
        {recommendedNextLesson ? (
          <div style={{ marginTop: 6 }}>{recommendedNextLesson.title} — {recommendedNextLesson.progress}%</div>
        ) : (
          <div style={{ marginTop: 6, color: 'rgba(255,255,255,0.45)' }}>No recommended lesson</div>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <strong>Completed lessons</strong>
        {completedLessons.length ? (
          <ul style={{ margin: 6 }}>
            {completedLessons.map((l: Lesson) => <li key={l.id}>{l.title}</li>)}
          </ul>
        ) : (
          <div style={{ marginTop: 6, color: 'rgba(255,255,255,0.45)' }}>None</div>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <strong>Locked lessons</strong>
        {lockedLessons.length ? (
          <ul style={{ margin: 6 }}>
            {lockedLessons.map((l: Lesson) => <li key={l.id}>{l.title}</li>)}
          </ul>
        ) : (
          <div style={{ marginTop: 6, color: 'rgba(255,255,255,0.45)' }}>None</div>
        )}
      </div>
    </div>
  );
}
