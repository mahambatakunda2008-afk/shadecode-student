"use client";

import { useState } from "react";

export default function LearnPage() {
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(false);

  const handleExplain = async () => {
    if (!subject || !topic) return;

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
      setExplanation(data.result || "No explanation returned.");
    } catch (err) {
      setExplanation("Something went wrong.");
    }

    setLoading(false);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* 🔝 HEADER */}
      <h1 className="text-2xl font-semibold mb-6">Learn</h1>

      {/* 🎯 CONTROLS */}
      <div className="flex flex-wrap gap-4 items-center">

        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Select subject"
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm outline-none focus:border-white"
        />

        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Topic"
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm outline-none focus:border-white"
        />

        <button
          onClick={handleExplain}
          className="bg-white text-black px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90"
        >
          Explain
        </button>
      </div>

      {/* 🧠 OUTPUT */}
      <div className="mt-8">

        {!subject || !topic ? (
          <div className="text-zinc-500 text-sm">
            Select a subject and topic to start learning.
          </div>
        ) : loading ? (
          <div className="text-zinc-400 text-sm animate-pulse">
            Generating explanation...
          </div>
        ) : explanation ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-3">
              {subject} • {topic}
            </h2>
            <p className="text-zinc-300 whitespace-pre-line leading-relaxed">
              {explanation}
            </p>
          </div>
        ) : (
          <div className="text-zinc-500 text-sm">
            Click "Explain" to generate content.
          </div>
        )}

      </div>
    </div>
  );
}
