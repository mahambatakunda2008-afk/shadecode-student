"use client";
import { useState } from "react";

export default function CourseGenerator() {
  const [topic, setTopic] = useState("");
  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState("beginner");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function handleSubmit(e: any) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      // First request a preview (no persistence)
      const previewRes = await fetch('/api/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'course_preview', topic, goal, level }),
      });
      const previewData = await previewRes.json();
      if (previewData?.success && previewData.draft) {
        setResult({ preview: previewData.draft });
      } else {
        setResult({ error: 'Preview failed', raw: previewData });
      }
    } catch (err) {
      setResult({ error: 'Request failed' });
    } finally { setLoading(false); }
  }

  async function handleSave() {
    if (!confirm('Save generated course into your account?')) return;
    setLoading(true);
    try {
      // Send edited draft to save endpoint
      const res = await fetch('/api/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'course_save', topic, goal, level, draft: result.preview }),
      });
      const data = await res.json();
      setResult({ saved: data });
    } catch (err) {
      setResult({ error: 'Save failed' });
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white rounded shadow-sm max-w-lg mx-auto">
      <h3 className="text-lg font-semibold mb-2">Generate AI Course</h3>
      <label className="block mb-2">Topic
        <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g., Learn Python" className="w-full mt-1 p-2 border rounded" />
      </label>
      <label className="block mb-2">Goal
        <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g., Build web apps" className="w-full mt-1 p-2 border rounded" />
      </label>
      <label className="block mb-2">Current level
        <select value={level} onChange={(e) => setLevel(e.target.value)} className="w-full mt-1 p-2 border rounded">
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </label>
      <button disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">{loading ? 'Generating...' : 'Generate Course'}</button>

      {result?.preview && (
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Preview: {result.preview.title}</h4>
          <div className="space-y-3 max-h-96 overflow-auto">
            {result.preview.lessons.map((ls: any, idx: number) => (
              <div key={idx} className="p-2 border rounded">
                <div className="flex gap-2 items-center">
                  <div className="font-medium">Lesson {idx + 1}.</div>
                  <input className="flex-1 p-1 border rounded" value={ls.title} onChange={(e) => {
                    const copy = { ...result };
                    copy.preview.lessons[idx].title = e.target.value;
                    setResult(copy);
                  }} />
                  <div className="text-sm text-gray-500 px-2">{ls.difficulty}</div>
                </div>
                <div className="text-sm text-gray-700 mt-1">{ls.summary}</div>
                {ls.prerequisites && ls.prerequisites.length > 0 && (
                  <div className="text-xs text-gray-600 mt-1">Prerequisites: {ls.prerequisites.join(', ')}</div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={handleSave} disabled={loading} className="px-3 py-1 bg-green-600 text-white rounded">{loading ? 'Saving...' : 'Save to my account'}</button>
            <button onClick={() => setResult(null)} className="px-3 py-1 border rounded">Close</button>
          </div>
        </div>
      )}

      {result?.saved && (
        <div className="mt-4 text-sm text-green-700">Saved: {JSON.stringify(result.saved)}</div>
      )}

      {result && !result.preview && !result.saved && (
        <div className="mt-4 text-sm text-red-600">{JSON.stringify(result)}</div>
      )}
    </form>
  );
}
