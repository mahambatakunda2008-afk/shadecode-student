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
      const res = await fetch('/api/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'course', topic, goal, level }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ error: 'Request failed' });
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

      {result && (
        <div className="mt-4">
          <pre className="text-sm bg-gray-50 p-3 rounded overflow-auto">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </form>
  );
}
