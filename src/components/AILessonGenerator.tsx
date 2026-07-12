"use client";

import { useState } from "react";
import { useLessonGenerator } from "@/hooks/useLessonGenerator";
import {
  Sparkles, BookOpen, BrainCircuit, Clock, Loader2,
  ChevronDown, ChevronUp, CheckCircle, AlertCircle,
} from "lucide-react";

const SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Biology",
  "Geography", "History", "Economics", "Computer Science",
  "English Language", "English Literature", "Accounting",
  "Business Studies", "Sociology", "Psychology",
];

const TYPES = [
  { value: "explanation", label: "Explanation", color: "#6366f1" },
  { value: "example", label: "Examples", color: "#22c55e" },
  { value: "definition", label: "Definition", color: "#f59e0b" },
  { value: "tip", label: "Study Tips", color: "#8b5cf6" },
];

export function AILessonGenerator() {
  const { lesson, generating, error, generate } = useLessonGenerator();
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [expandedSection, setExpandedSection] = useState<number | null>(null);
  const [showAnswers, setShowAnswers] = useState<Record<string, boolean>>({});

  const handleGenerate = async () => {
    if (!subject || !topic.trim()) return;
    await generate(subject, topic.trim());
    setExpandedSection(null);
    setShowAnswers({});
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BrainCircuit className="w-6 h-6 text-indigo-400" />
          AI Lesson Generator
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Generate personalized lessons on any topic
        </p>
      </div>

      {/* Input Form */}
      <div className="bg-slate-800/40 rounded-xl p-5 border border-slate-700/50 space-y-4">
        <div>
          <label className="text-sm text-slate-400 mb-1.5 block">Subject</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
            {SUBJECTS.map((s) => (
              <button
                key={s}
                onClick={() => setSubject(s)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  subject === s
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                    : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm text-slate-400 mb-1.5 block">Topic</label>
          <div className="flex gap-2">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder="e.g., Photosynthesis, Calculus, World War II..."
              className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating || !subject || !topic.trim()}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-lg shadow-indigo-600/20"
        >
          {generating ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generating Lesson...</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Generate Lesson</>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-800/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Generated Lesson */}
      {lesson && (
        <div className="space-y-4">
          {/* Lesson Header */}
          <div className="bg-slate-800/40 rounded-xl p-5 border border-slate-700/50">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-indigo-400 bg-indigo-900/30 px-2 py-0.5 rounded-full">
                    {lesson.subject}
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    lesson.difficulty === "easy" ? "text-green-400 bg-green-900/30"
                    : lesson.difficulty === "medium" ? "text-blue-400 bg-blue-900/30"
                    : "text-purple-400 bg-purple-900/30"
                  }`}>
                    {lesson.difficulty}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white">{lesson.title}</h2>
                <p className="text-slate-400 text-sm mt-1">{lesson.summary}</p>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400 text-sm shrink-0">
                <Clock className="w-4 h-4" />
                <span>{lesson.estimatedMinutes} min</span>
              </div>
            </div>
          </div>

          {/* Lesson Sections */}
          <div className="space-y-2">
            {lesson.sections.map((section, i) => (
              <div key={i} className="bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden">
                <button
                  onClick={() => setExpandedSection(expandedSection === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-700/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      section.type === "explanation" ? "bg-indigo-400"
                      : section.type === "example" ? "bg-green-400"
                      : section.type === "definition" ? "bg-amber-400"
                      : "bg-purple-400"
                    }`} />
                    <span className={`text-xs font-medium ${
                      section.type === "explanation" ? "text-indigo-300"
                      : section.type === "example" ? "text-green-300"
                      : section.type === "definition" ? "text-amber-300"
                      : "text-purple-300"
                    }`}>
                      {section.type.charAt(0).toUpperCase() + section.type.slice(1)}
                    </span>
                    <span className="text-sm font-medium text-white">{section.heading}</span>
                  </div>
                  {expandedSection === i ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {expandedSection === i && (
                  <div className="px-4 pb-4">
                    <p className="text-slate-300 text-sm leading-relaxed">{section.content}</p>
                  </div>
                )}
              </div>
            )) ?? (
              <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50">
                <p className="text-slate-400 text-sm">No sections available. Try generating the lesson again.</p>
              </div>
            )}
          </div>

          {/* Practice Questions */}
          {lesson.practiceQuestions.length > 0 && (
            <div className="bg-slate-800/40 rounded-xl p-5 border border-slate-700/50">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                Practice Questions
              </h3>
              <div className="space-y-3">
                {lesson.practiceQuestions.map((q, i) => (
                  <div key={i} className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
                    <div className="flex items-start gap-3">
                      <span className="text-sm font-bold text-indigo-400 mt-0.5">{i + 1}.</span>
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">{q.question}</p>

                        {q.options && (
                          <div className="mt-2 space-y-1.5">
                            {q.options.map((opt, oi) => (
                              <div key={oi} className="flex items-center gap-2 text-sm text-slate-300">
                                <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-xs font-medium text-slate-400">
                                  {String.fromCharCode(65 + oi)}
                                </span>
                                {opt}
                              </div>
                            ))}
                          </div>
                        )}

                        <button
                          onClick={() => setShowAnswers(prev => ({ ...prev, [i]: !prev[i] }))}
                          className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                        >
                          {showAnswers[i] ? "Hide answer" : "Show answer"}
                        </button>

                        {showAnswers[i] && (
                          <div className="mt-2 bg-indigo-900/20 rounded-lg p-3 border border-indigo-800/30">
                            <p className="text-sm text-green-400 font-medium mb-1">
                              Correct Answer: {q.correctAnswer}
                            </p>
                            <p className="text-xs text-slate-400">{q.explanation}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
