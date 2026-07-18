"use client";

import { useState } from "react";
import { Target, Calendar, Clock, BookOpen, Plus, X } from "lucide-react";
import { StudyGoals } from "@/lib/studyPlan/types";

interface StudyGoalInputProps {
  onSubmit: (goals: StudyGoals) => void;
  onCancel?: () => void;
  initialGoals?: Partial<StudyGoals>;
}

export default function StudyGoalInput({ onSubmit, onCancel, initialGoals }: StudyGoalInputProps) {
  const [targetGrade, setTargetGrade] = useState<"A*" | "A" | "B" | "C" | "D" | "E" | "U">(initialGoals?.targetGrade || "A");
  const [examDate, setExamDate] = useState(initialGoals?.examDate || "");
  const [availableHours, setAvailableHours] = useState(initialGoals?.availableHoursPerWeek || 10);
  const [subjects, setSubjects] = useState<string[]>(initialGoals?.subjects || []);
  const [prioritySubjects, setPrioritySubjects] = useState<string[]>(initialGoals?.prioritySubjects || []);
  const [newSubject, setNewSubject] = useState("");

  const grades: Array<"A*" | "A" | "B" | "C" | "D" | "E" | "U"> = ["A*", "A", "B", "C", "D", "E", "U"];

  const handleAddSubject = () => {
    if (newSubject.trim() && !subjects.includes(newSubject.trim())) {
      setSubjects([...subjects, newSubject.trim()]);
      setNewSubject("");
    }
  };

  const handleRemoveSubject = (subject: string) => {
    setSubjects(subjects.filter(s => s !== subject));
    setPrioritySubjects(prioritySubjects.filter(s => s !== subject));
  };

  const togglePriority = (subject: string) => {
    if (prioritySubjects.includes(subject)) {
      setPrioritySubjects(prioritySubjects.filter(s => s !== subject));
    } else {
      setPrioritySubjects([...prioritySubjects, subject]);
    }
  };

  const handleSubmit = () => {
    if (subjects.length === 0) return;
    if (!examDate) return;

    onSubmit({
      targetGrade,
      examDate,
      availableHoursPerWeek: availableHours,
      subjects,
      prioritySubjects,
    });
  };

  const isFormValid = subjects.length > 0 && examDate && availableHours > 0;

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: "12px", padding: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Target size={18} color="#6366f1" />
        </div>
        <div>
          <p style={{ fontSize: "14px", fontWeight: 700, margin: 0 }}>Study Goals</p>
          <p style={{ fontSize: "12px", color: "var(--muted-foreground)", margin: 0 }}>Set your targets for AI planning</p>
        </div>
      </div>

      {/* Target Grade */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: 8 }}>
          Target Grade
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {grades.map(grade => (
            <button
              key={grade}
              onClick={() => setTargetGrade(grade)}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: targetGrade === grade ? "2px solid #6366f1" : "1px solid var(--card-border)",
                background: targetGrade === grade ? "rgba(99,102,241,0.1)" : "var(--muted)",
                color: targetGrade === grade ? "#6366f1" : "var(--foreground)",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {grade}
            </button>
          ))}
        </div>
      </div>

      {/* Exam Date */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Calendar size={14} />
            Exam Date
          </div>
        </label>
        <input
          type="date"
          value={examDate}
          onChange={(e) => setExamDate(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: "8px",
            border: "1px solid var(--card-border)",
            background: "var(--muted)",
            color: "var(--foreground)",
            fontSize: "13px",
          }}
        />
      </div>

      {/* Available Hours */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Clock size={14} />
            Available Study Hours per Week
          </div>
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input
            type="range"
            min="1"
            max="40"
            value={availableHours}
            onChange={(e) => setAvailableHours(parseInt(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={{ fontSize: "16px", fontWeight: 700, color: "#6366f1", minWidth: "60px", textAlign: "right" }}>
            {availableHours}h
          </span>
        </div>
      </div>

      {/* Subjects */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <BookOpen size={14} />
            Subjects
          </div>
        </label>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Add subject (e.g., Math, Physics)"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddSubject()}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid var(--card-border)",
              background: "var(--muted)",
              color: "var(--foreground)",
              fontSize: "13px",
            }}
          />
          <button
            onClick={handleAddSubject}
            aria-label="Add subject"
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              background: "var(--primary)",
              color: "white",
              border: "none",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Subject List */}
        {subjects.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {subjects.map(subject => (
              <div
                key={subject}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 12px",
                  borderRadius: "8px",
                  background: prioritySubjects.includes(subject) ? "rgba(99,102,241,0.1)" : "var(--muted)",
                  border: prioritySubjects.includes(subject) ? "1px solid rgba(99,102,241,0.3)" : "1px solid var(--card-border)",
                }}
              >
                <span style={{ flex: 1, fontSize: "13px", fontWeight: 500 }}>{subject}</span>
                <button
                  onClick={() => togglePriority(subject)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    background: prioritySubjects.includes(subject) ? "#6366f1" : "var(--surface-2)",
                    color: prioritySubjects.includes(subject) ? "white" : "var(--muted-foreground)",
                    border: "none",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {prioritySubjects.includes(subject) ? "Priority" : "Set Priority"}
                </button>
                <button
                  onClick={() => handleRemoveSubject(subject)}
                  style={{
                    padding: "4px",
                    borderRadius: "6px",
                    background: "transparent",
                    color: "var(--danger)",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
        {onCancel && (
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "8px",
              background: "var(--muted)",
              color: "var(--foreground)",
              border: "1px solid var(--card-border)",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={!isFormValid}
          style={{
            flex: 2,
            padding: "12px",
            borderRadius: "8px",
            background: isFormValid ? "var(--primary)" : "var(--muted)",
            color: isFormValid ? "white" : "var(--muted-foreground)",
            border: "none",
            fontWeight: 700,
            fontSize: "13px",
            cursor: isFormValid ? "pointer" : "not-allowed",
            opacity: isFormValid ? 1 : 0.5,
          }}
        >
          Generate Study Plan
        </button>
      </div>
    </div>
  );
}
