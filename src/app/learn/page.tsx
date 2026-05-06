"use client";

import { useState } from "react";

export default function LearnPage() {
  const [subject, setSubject] = useState("Math");
  const [topic, setTopic] = useState("");
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(false);

  const handleExplain = async () => {
    if (!topic) return;

    setLoading(true);
    setExplanation("");

    try {
      const res = await fetch("/api/learn", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subject, topic }),
      });

      const data = await res.json();
      setExplanation(data.result);
    } catch (err) {
      setExplanation("Failed to generate explanation.");
    }

    setLoading(false);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-semibold">Learn</h1>
        <p className="text-zinc-500 text-sm">
          Generate explanations instantly with AI
        </p>
      </div>

      {/* CONTROLS */}
      <div className="flex gap-4 flex-wrap">

        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm"
        >
          <option>Math</option>
          <option>Science</option>
          <option>History</option>
          <option>Geography</option>
        </select>

        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter topic (e.g. Quadratic Equations)"
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm w-64"
        />

        <button
          onClick={handleExplain}
          className="bg-white text-black px-5 py-2 rounded-lg text-sm font-medium"
        >
          Explain
        </button>

      </div>

      {/* OUTPUT */}
      <div className="min-h-[200px]">

        {!topic ? (
          <p className="text-zinc-500 text-sm">
            Enter a topic to begin learning.
          </p>
        ) : loading ? (
          <p className="text-zinc-400 text-sm animate-pulse">
            Thinking...
          </p>
        ) : explanation ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-3">
              {subject} • {topic}
            </h2>
            <p className="text-zinc-300 whitespace-pre-line leading-relaxed">
              {explanation}
            </p>
          </div>
        ) : null}

      </div>

    </div>
  );
}
