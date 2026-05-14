"use client";

import { useState, useEffect } from "react";
import LessonRenderer from "@/components/learn/LessonRenderer";

interface Block {
  type: string;
  content: string;
}

export default function LearnPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLesson() {
      try {
        const res = await fetch("/api/learn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "lesson", subject: "Math", topic: "Quadratic Equations" }),
        });
        const data = await res.json();
        if (data.blocks) setBlocks(data.blocks);
        else setError("No lesson content available.");
      } catch (err) {
        console.error(err);
        setError("Failed to load lesson.");
      } finally {
        setLoading(false);
      }
    }

    fetchLesson();
  }, []);

  if (loading) return <div>Loading lesson...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="learn-page">
      <h1>Learn: Quadratic Equations</h1>
      <LessonRenderer blocks={blocks} />
    </div>
  );
}
