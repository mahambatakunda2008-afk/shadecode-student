"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { emitCortexEvent } from "@/lib/cortex/events/emit";

interface Subject {
  id: string;
  name: string;
}

interface Task {
  id: string;
  subject_id: string;
  title: string;
  completed: boolean;
}

export default function Tasks() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newSubject, setNewSubject] = useState("");
  const [newTasks, setNewTasks] = useState<{ [key: string]: string }>({});
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setUserId(user.id);

      const [{ data: subjectsData }, { data: tasksData }, { data: profileData }] = await Promise.all([
        supabase.from("subjects").select("*").eq("user_id", user.id),
        supabase.from("tasks").select("*").eq("user_id", user.id),
        supabase.from("profiles").select("xp, level").eq("id", user.id).single(),
      ]);

      setSubjects(subjectsData || []);
      setTasks(tasksData || []);
      setXp(profileData?.xp || 0);
      setLevel(profileData?.level || 1);
      setLoading(false);
    };
    fetchData();
  }, [router, supabase]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const addSubject = async () => {
    if (!newSubject.trim() || !userId) return;
    const { data } = await supabase
      .from("subjects")
      .insert({ user_id: userId, name: newSubject.trim() })
      .select()
      .single();
    if (data) {
      setSubjects([...subjects, data]);
      setNewSubject("");
      emitCortexEvent({
        userId,
        type: "subject.created",
        source: "tasks",
        data: { subjectName: data.name },
      });
    }
  };

  const addTask = async (subjectId: string) => {
    const title = newTasks[subjectId]?.trim();
    if (!title || !userId) return;
    const { data } = await supabase
      .from("tasks")
      .insert({ user_id: userId, subject_id: subjectId, title, completed: false })
      .select()
      .single();
    if (data) {
      setTasks([...tasks, data]);
      setNewTasks({ ...newTasks, [subjectId]: "" });
      emitCortexEvent({
        userId,
        type: "task.created",
        source: "tasks",
        data: { subjectId, title: data.title },
      });
    }
  };

  const completeTask = async (task: Task) => {
    if (task.completed || !userId) return;
    await supabase.from("tasks").update({ completed: true }).eq("id", task.id);

    const newXp = xp + 10;
    const newLevel = Math.floor(newXp / 100) + 1;
    await supabase.from("profiles").update({ xp: newXp, level: newLevel }).eq("id", userId);

    setTasks(tasks.map(t => t.id === task.id ? { ...t, completed: true } : t));
    setXp(newXp);
    setLevel(newLevel);
    showToast("+10 XP 🔥");

    // Check achievements
    const completedCount = tasks.filter(t => t.completed).length + 1;
    if (completedCount === 1) {
      await supabase.from("achievements").insert({ user_id: userId, title: "First Completion 🎯" });
    }
    if (completedCount === 5) {
      await supabase.from("achievements").insert({ user_id: userId, title: "On A Roll 🔥" });
    }
    if (completedCount === 10) {
      await supabase.from("achievements").insert({ user_id: userId, title: "Study Machine ⚡" });
    }
    emitCortexEvent({
      userId,
      type: "task.completed",
      source: "tasks",
      data: { taskId: task.id, subjectId: task.subject_id, title: task.title },
    });
  };

  const deleteTask = async (taskId: string) => {
    const deletedTask = tasks.find((task) => task.id === taskId);
    await supabase.from("tasks").delete().eq("id", taskId);
    setTasks(tasks.filter(t => t.id !== taskId));

    if (userId && deletedTask) {
      emitCortexEvent({
        userId,
        type: "task.deleted",
        source: "tasks",
        data: { taskId, subjectId: deletedTask.subject_id, title: deletedTask.title },
      });
    }
  };

  const deleteSubject = async (subjectId: string) => {
    const deletedSubject = subjects.find((subject) => subject.id === subjectId);
    await supabase.from("tasks").delete().eq("subject_id", subjectId);
    await supabase.from("subjects").delete().eq("id", subjectId);
    setSubjects(subjects.filter(s => s.id !== subjectId));
    setTasks(tasks.filter(t => t.subject_id !== subjectId));

    if (userId && deletedSubject) {
      emitCortexEvent({
        userId,
        type: "subject.deleted",
        source: "tasks",
        data: { subjectId, subjectName: deletedSubject.name },
      });
    }
  };

  if (loading) return (
    <div style={{ padding: "60px 24px", textAlign: "center", color: "var(--muted-foreground)" }}>
      Loading...
    </div>
  );

  const xpToNextLevel = level * 100;
  const cardStyle = {
    background: "var(--card)",
    border: "1px solid var(--card-border)",
    borderRadius: "12px",
    padding: "16px",
  };
  const inputStyle = {
    flex: 1,
    background: "var(--muted)",
    border: "1px solid var(--card-border)",
    borderRadius: "8px",
    padding: "10px 14px",
    color: "var(--foreground)",
    fontSize: "14px",
    outline: "none",
  };

  return (
    <div style={{ padding: "60px 24px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed",
          top: "24px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "var(--primary)",
          color: "white",
          padding: "10px 20px",
          borderRadius: "99px",
          fontWeight: 700,
          fontSize: "14px",
          zIndex: 100,
          boxShadow: "0 0 20px var(--primary-glow)",
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 style={{ fontSize: "28px", fontWeight: 800 }}>Tasks</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: "14px", marginTop: "4px" }}>
          Level {level} • {xp} XP
        </p>
      </div>

      {/* XP Bar */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <p style={{ fontSize: "13px", fontWeight: 600 }}>XP Progress</p>
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>{xp} / {xpToNextLevel}</p>
        </div>
        <div style={{ background: "var(--muted)", borderRadius: "99px", height: "8px" }}>
          <div style={{
            background: "var(--primary)",
            borderRadius: "99px",
            height: "8px",
            width: `${Math.min((xp / xpToNextLevel) * 100, 100)}%`,
            boxShadow: "0 0 8px var(--primary-glow)",
            transition: "width 0.5s ease",
          }} />
        </div>
      </div>

      {/* Add Subject */}
      <div style={cardStyle}>
        <p style={{ fontWeight: 700, marginBottom: "12px" }}>Add Subject</p>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            placeholder="e.g. Mathematics"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSubject()}
            style={inputStyle}
          />
          <button
            onClick={addSubject}
            style={{
              background: "var(--primary)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "10px 16px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Add
          </button>
        </div>
      </div>

      {/* Subjects + Tasks */}
      {subjects.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: "center", padding: "32px" }}>
          <p style={{ fontSize: "32px" }}>📚</p>
          <p style={{ color: "var(--muted-foreground)", marginTop: "8px" }}>No subjects yet. Add one above.</p>
        </div>
      ) : (
        subjects.map((subject) => {
          const subjectTasks = tasks.filter(t => t.subject_id === subject.id);
          const completed = subjectTasks.filter(t => t.completed).length;
          const progress = subjectTasks.length > 0 ? Math.round((completed / subjectTasks.length) * 100) : 0;

          return (
            <div key={subject.id} style={cardStyle}>
              {/* Subject Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <p style={{ fontWeight: 700, fontSize: "16px" }}>{subject.name}</p>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>{completed}/{subjectTasks.length}</p>
                  <button
                    onClick={() => deleteSubject(subject.id)}
                    style={{ background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer", fontSize: "16px" }}
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ background: "var(--muted)", borderRadius: "99px", height: "4px", marginBottom: "12px" }}>
                <div style={{
                  background: progress === 100 ? "var(--success)" : "var(--primary)",
                  borderRadius: "99px",
                  height: "4px",
                  width: `${progress}%`,
                  transition: "width 0.5s ease",
                }} />
              </div>

              {/* Tasks */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
                {subjectTasks.map((task) => (
                  <div key={task.id} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    background: task.completed ? "rgba(34,197,94,0.1)" : "var(--muted)",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    border: task.completed ? "1px solid rgba(34,197,94,0.2)" : "1px solid transparent",
                  }}>
                    <button
                      onClick={() => completeTask(task)}
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        border: task.completed ? "none" : "2px solid var(--muted-foreground)",
                        background: task.completed ? "var(--success)" : "transparent",
                        cursor: task.completed ? "default" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {task.completed && <span style={{ color: "white", fontSize: "11px" }}>✓</span>}
                    </button>
                    <p style={{
                      fontSize: "14px",
                      flex: 1,
                      textDecoration: task.completed ? "line-through" : "none",
                      color: task.completed ? "var(--muted-foreground)" : "var(--foreground)",
                    }}>
                      {task.title}
                    </p>
                    {!task.completed && (
                      <button
                        onClick={() => deleteTask(task.id)}
                        style={{ background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer", fontSize: "14px" }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Task */}
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  placeholder="Add a task..."
                  value={newTasks[subject.id] || ""}
                  onChange={(e) => setNewTasks({ ...newTasks, [subject.id]: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && addTask(subject.id)}
                  style={inputStyle}
                />
                <button
                  onClick={() => addTask(subject.id)}
                  style={{
                    background: "var(--primary)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    padding: "10px 16px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Add
                </button>
              </div>
            </div>
          );
        })
      )}

      {/* Overview */}
      {subjects.length > 0 && (
        <div style={cardStyle}>
          <p style={{ fontWeight: 700, marginBottom: "8px" }}>Overview</p>
          <p style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>Total tasks: {tasks.length}</p>
          <p style={{ color: "var(--muted-foreground)", fontSize: "14px", marginTop: "4px" }}>
            Completed: {tasks.filter(t => t.completed).length}
          </p>
        </div>
      )}
    </div>
  );
}
