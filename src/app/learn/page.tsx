"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import LessonCard from "@/components/LessonCard";

export default function LearnPage() {
  const router = useRouter();

  const [lessons, setLessons] = useState<Lesson[]>([]);

  useEffect(() => {
    // Fetch lessons from your API or local data
    async function loadLessons() {
      try {
        const res = await fetch("/api/lessons");
        const data = await res.json();
        setLessons(data);
      } catch (err) {
        console.error("Failed to load lessons", err);
      }
    }
    loadLessons();
  }, []);

  return (
    <div className="learn-page-container">
      <h1>Learn</h1>
      <div className="lessons-grid">
        {lessons.length === 0 ? (
          <p>Loading lessons...</p>
        ) : (
          lessons.map((lesson) => (
            <LessonCard key={lesson.id} lesson={lesson} />
          ))
        )}
      </div>
    </div>
  );
}
