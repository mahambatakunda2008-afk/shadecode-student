"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import LessonCard from "@/components/LessonCard";
import ProgressBar from "@/components/ProgressBar";
import SubjectDropdown from "@/components/SubjectDropdown";
import { getLessons, getSuggestedTopics, getUserStats } from "@/lib/api";
import { generateAILesson } from "@/lib/api/openai";
import { fetchRecommendations } from "@/lib/api/gemini";

interface Lesson {
  id: string;
  title: string;
  subject: string;
  type: string;
  xp: number;
  createdAt: string;
}

interface Topic {
  id: string;
  title: string;
  subject: string;
}

export default function LearnPage() {
  const router = useRouter();

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [suggestedTopics, setSuggestedTopics] = useState<Topic[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [aiTopic, setAITopic] = useState<string>("");
  const [xp, setXP] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [streak, setStreak] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Fetch user stats
  useEffect(() => {
    getUserStats()
      .then((stats) => {
        setXP(stats.currentXP);
        setLevel(stats.level);
        setStreak(stats.currentStreak);
      })
      .catch((err) => console.error("Failed to load stats:", err));
  }, []);

  // Fetch lessons and subjects
  useEffect(() => {
    setLoading(true);
    setError("");
    getLessons()
      .then((data) => {
        setLessons(data);
        const subjectsList = Array.from(new Set(data.map((l) => l.subject)));
        setSubjects(subjectsList);
        if (!selectedSubject && subjectsList.length) setSelectedSubject(subjectsList[0]);
      })
      .catch((err) => setError("Failed to fetch lessons"))
      .finally(() => setLoading(false));
  }, []);

  // Fetch suggested topics dynamically via Gemini API
  useEffect(() => {
    if (!selectedSubject) return;
    fetchRecommendations(selectedSubject)
      .then((topics) => setSuggestedTopics(topics))
      .catch((err) => console.error("Gemini suggestions failed:", err));
  }, [selectedSubject]);

  // Handle AI Lesson generation
  const handleGenerateLesson = async () => {
    if (!selectedSubject || !aiTopic) return;
    setLoading(true);
    try {
      const lesson = await generateAILesson(selectedSubject, aiTopic);
      router.push(`/learn/${lesson.id}`);
    } catch (err) {
      console.error("AI lesson generation failed:", err);
      setError("Failed to generate AI lesson. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const filteredLessons = lessons.filter((l) => l.subject === selectedSubject);

  return (
    <div className="flex flex-col md:flex-row bg-gray-900 text-white min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 p-4 flex flex-col">
        <div className="text-xl font-bold mb-6">Shadecode Student</div>
        <nav className="flex-1 space-y-2">
          {["Dashboard","AI Learn","Quizzes","Challenges","Progress","Notes","Subjects","Calendar","Bookmarks","Achievements","Cortex AI","Settings"].map((item) => (
            <button key={item} className={`w-full text-left py-2 px-3 rounded hover:bg-gray-700 ${item==="AI Learn"?"bg-gray-700":""}`}>{item}</button>
          ))}
        </nav>
        <div className="mt-6">
          <div className="text-sm">Level {level}</div>
          <ProgressBar value={xp} max={3000} />
          <div className="mt-2 text-sm">🔥 {streak}-day streak</div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6">
        <h1 className="text-3xl font-bold mb-2">✨ AI Learn</h1>
        <p className="text-gray-400 mb-6">Personalized lessons powered by AI</p>

        {/* AI Lesson generator */}
        <div className="bg-gray-800 rounded-lg p-6 flex flex-col md:flex-row items-center mb-8 space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1 w-full md:w-auto">
            <SubjectDropdown subjects={subjects} selected={selectedSubject} onSelect={setSelectedSubject} />
          </div>
          <input
            type="text"
            placeholder="Enter topic to learn..."
            className="flex-1 p-2 rounded bg-gray-700 placeholder-gray-400"
            value={aiTopic}
            onChange={(e) => setAITopic(e.target.value)}
          />
          <button
            className="bg-purple-600 px-6 py-2 rounded hover:bg-purple-500"
            onClick={handleGenerateLesson}
            disabled={loading}
          >
            ✨ Generate Lesson
          </button>
        </div>

        {/* Suggested topics */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">✨ Suggested topics for you</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {suggestedTopics.map((t) => (
              <div key={t.id} className="bg-gray-800 p-4 rounded hover:scale-105 transform transition">
                <div className="font-semibold">{t.title}</div>
                <div className="text-sm text-gray-400">{t.subject}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent lessons */}
        <section>
          <h2 className="text-xl font-semibold mb-4">🕒 Recent lessons</h2>
          {error && <div className="text-red-500 mb-4">{error}</div>}
          {loading ? (
            <div>Loading...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredLessons.map((l) => (
                <LessonCard
                  key={l.id}
                  lesson={l}
                  onClick={() => router.push(`/learn/${l.id}`)}
                />
              ))}
              {filteredLessons.length === 0 && <div className="text-gray-400">No lessons found</div>}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
