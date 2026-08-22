"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import ExportMenu from "@/components/exports/ExportMenu";
import { emitCortexEvent } from "@/lib/cortex/events/emit";
import { emitStudySessionFinished } from "@/lib/events";
import { awardXPClient } from "@/lib/xp/manager";
import { useAchievementsContext } from "@/contexts/AchievementsContext";
import { withTimeout, TimeoutError } from "@/lib/async/withTimeout";
import { offlineSync } from "@/lib/offline/sync";
import PageSkeleton from "@/components/ui/PageSkeleton";

const FETCH_TIMEOUT_MS = 15000;
interface Subject { id: string; name: string; }
interface Task { id: string; subject_id: string; title: string; completed: boolean; }

export default function Tasks() {
  const { checkNewAchievements } = useAchievementsContext();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newSubject, setNewSubject] = useState("");
  const [newTasks, setNewTasks] = useState<Record<string, string>>({});
  const [xp, setXp] = useState(0); const [level, setLevel] = useState(1);
  const [loading, setLoading] = useState(true); const [loadError, setLoadError] = useState<string | null>(null); const [toast, setToast] = useState("");
  const router = useRouter(); const [supabase] = useState(() => createClient()); const [userId, setUserId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true); setLoadError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setUserId(user.id);

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        const [localSubjects, localTasks] = await Promise.all([
          offlineSync.getSubjects(user.id),
          offlineSync.getTasks(user.id),
        ]);
        setSubjects(localSubjects.map(({ id, name }) => ({ id, name })));
        setTasks(localTasks.map(({ id, subject_id, title, completed }) => ({ id, subject_id, title, completed })));
        const { data: profile } = await supabase.from("profiles").select("xp,level").eq("id", user.id).single();
        setXp(profile?.xp || 0); setLevel(profile?.level || 1);
        return;
      }

      const [{ data: subjectsData }, { data: tasksData }, { data: profileData }] = await withTimeout(Promise.all([
        supabase.from("subjects").select("id,name").eq("user_id", user.id),
        supabase.from("tasks").select("id,subject_id,title,completed").eq("user_id", user.id),
        supabase.from("profiles").select("xp,level").eq("id", user.id).single(),
      ]), FETCH_TIMEOUT_MS, "Loading your tasks timed out");
      setSubjects(subjectsData || []); setTasks(tasksData || []); setXp(profileData?.xp || 0); setLevel(profileData?.level || 1);
    } catch (err) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const [localSubjects, localTasks] = await Promise.all([offlineSync.getSubjects(user.id), offlineSync.getTasks(user.id)]);
          if (localSubjects.length || localTasks.length) {
            setSubjects(localSubjects.map(({ id, name }) => ({ id, name })));
            setTasks(localTasks.map(({ id, subject_id, title, completed }) => ({ id, subject_id, title, completed })));
            showToast("Showing your saved offline tasks.");
            return;
          }
        }
      } catch (offlineError) {
        console.error("[Tasks] Offline fallback failed:", offlineError);
      }
      setLoadError(err instanceof TimeoutError ? "This is taking longer than expected. Please try again." : "Could not load your tasks. Please try again.");
    } finally { setLoading(false); }
  };

  useEffect(() => { void fetchData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [router, supabase]);
  const showToast = (msg: string) => { setToast(msg); window.setTimeout(() => setToast(""), 2500); };
  const isOffline = () => typeof navigator !== "undefined" && !navigator.onLine;

  const addSubject = async () => {
    const name = newSubject.trim(); if (!name || !userId) return;
    if (isOffline()) {
      const id = crypto.randomUUID();
      await offlineSync.queueMutation({ operation: "create", store: "subjects", payload: { id, user_id: userId, name } });
      setSubjects(prev => [...prev, { id, name }]); setNewSubject(""); showToast("Subject saved offline. It will sync when you're online."); return;
    }
    const { data, error } = await supabase.from("subjects").insert({ user_id: userId, name }).select("id,name").single();
    if (error) { showToast("Couldn't add that subject."); return; }
    if (data) { setSubjects(prev => [...prev, data]); setNewSubject(""); emitCortexEvent({ userId, type: "subject.created", source: "tasks", data: { subjectName: data.name } }); }
  };

  const addTask = async (subjectId: string) => {
    const title = newTasks[subjectId]?.trim(); if (!title || !userId) return;
    if (isOffline()) {
      const id = crypto.randomUUID();
      await offlineSync.queueMutation({ operation: "create", store: "tasks", payload: { id, user_id: userId, subject_id: subjectId, title, completed: false } });
      setTasks(prev => [...prev, { id, subject_id: subjectId, title, completed: false }]); setNewTasks(prev => ({ ...prev, [subjectId]: "" })); showToast("Task saved offline. It will sync when you're online."); return;
    }
    const { data, error } = await supabase.from("tasks").insert({ user_id: userId, subject_id: subjectId, title, completed: false }).select("id,subject_id,title,completed").single();
    if (error) { showToast("Couldn't add that task."); return; }
    if (data) { setTasks(prev => [...prev, data]); setNewTasks(prev => ({ ...prev, [subjectId]: "" })); emitCortexEvent({ userId, type: "task.created", source: "tasks", data: { subjectId, title: data.title } }); }
  };

  const completeTask = async (task: Task) => {
    if (task.completed || !userId) return;
    if (isOffline()) {
      await offlineSync.queueMutation({ operation: "update", store: "tasks", payload: { id: task.id, user_id: userId, completed: true } });
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: true } : t));
      showToast("Completed offline. XP will sync when you're online.");
      return;
    }
    const { error } = await supabase.from("tasks").update({ completed: true }).eq("id", task.id).eq("user_id", userId);
    if (error) { console.error("[Tasks] complete failed:", error.message); showToast("Couldn't mark that task complete. Please try again."); return; }
    const result = await awardXPClient(userId, { amount: 10 });
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: true } : t));
    if (result.success) { setXp(result.xp); setLevel(result.level); showToast("+10 XP 🔥"); }
    const subject = subjects.find(s => s.id === task.subject_id);
    await emitStudySessionFinished(userId, { sessionId: crypto.randomUUID(), subject: subject?.name || "Unknown", activityType: "revision", duration: 10, xpEarned: 10, activities: [{ type: "task", itemId: task.id, startTime: new Date().toISOString(), endTime: new Date().toISOString(), duration: 10 }] }, "tasks");
    emitCortexEvent({ userId, type: "task.completed", source: "tasks", data: { taskId: task.id, subjectId: task.subject_id, title: task.title } });
    checkNewAchievements();
  };

  const deleteTask = async (taskId: string) => {
    const deletedTask = tasks.find(task => task.id === taskId); if (!userId) return;
    if (isOffline()) {
      await offlineSync.queueMutation({ operation: "delete", store: "tasks", payload: { id: taskId, user_id: userId } });
      setTasks(prev => prev.filter(t => t.id !== taskId)); showToast("Task deleted offline. It will sync when you're online."); return;
    }
    const { error } = await supabase.from("tasks").delete().eq("id", taskId).eq("user_id", userId);
    if (error) { console.error("[Tasks] delete failed:", error.message); showToast("Couldn't delete that task. Please try again."); return; }
    setTasks(prev => prev.filter(t => t.id !== taskId));
    if (deletedTask) emitCortexEvent({ userId, type: "task.deleted", source: "tasks", data: { taskId, subjectId: deletedTask.subject_id, title: deletedTask.title } });
  };

  const deleteSubject = async (subjectId: string) => {
    if (!userId) return;
    const deletedSubject = subjects.find(subject => subject.id === subjectId);
    if (isOffline()) {
      const subjectTaskIds = tasks.filter(task => task.subject_id === subjectId).map(task => task.id);
      for (const taskId of subjectTaskIds) await offlineSync.queueMutation({ operation: "delete", store: "tasks", payload: { id: taskId, user_id: userId } });
      await offlineSync.queueMutation({ operation: "delete", store: "subjects", payload: { id: subjectId, user_id: userId } });
      setSubjects(prev => prev.filter(s => s.id !== subjectId)); setTasks(prev => prev.filter(t => t.subject_id !== subjectId)); showToast("Subject deleted offline. It will sync when you're online."); return;
    }
    const { error } = await supabase.from("subjects").delete().eq("id", subjectId).eq("user_id", userId);
    if (error) { console.error("[Tasks] delete subject failed:", error.message); showToast("Couldn't delete that subject. Please try again."); return; }
    setSubjects(prev => prev.filter(s => s.id !== subjectId)); setTasks(prev => prev.filter(t => t.subject_id !== subjectId));
    if (deletedSubject) emitCortexEvent({ userId, type: "subject.deleted", source: "tasks", data: { subjectId, subjectName: deletedSubject.name } });
  };

  if (loading) return <PageSkeleton variant="list" />;
  if (loadError) return <div style={{ padding: "32px 24px", textAlign: "center" }}><p style={{ color: "#ef4444", fontSize: 14, marginBottom: 12 }}>{loadError}</p><button onClick={() => void fetchData()} style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid var(--card-border)", background: "var(--card)", color: "inherit", fontSize: 13, cursor: "pointer" }}>Retry</button></div>;

  const xpToNextLevel = Math.max(level * 100, 1);
  const cardStyle: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 12, padding: 16 };
  const inputStyle: React.CSSProperties = { flex: 1, background: "var(--muted)", border: "1px solid var(--card-border)", borderRadius: 8, padding: "10px 14px", color: "var(--foreground)", fontSize: 14, outline: "none" };
  const exportData = tasks.map(task => ({ id: task.id, subject: subjects.find(s => s.id === task.subject_id)?.name ?? "Unknown", task: task.title, completed: task.completed }));

  return <div style={{ padding: "32px 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
    {toast && <div role="status" style={{ position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)", background: "var(--primary)", color: "white", padding: "10px 20px", borderRadius: 99, fontWeight: 700, fontSize: 14, zIndex: 100 }}>{toast}</div>}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}><div><h1 style={{ fontSize: 28, fontWeight: 800 }}>Tasks</h1><p style={{ color: "var(--muted-foreground)", fontSize: 14, marginTop: 4 }}>Level {level} • {xp} XP</p></div><ExportMenu filename="shadecode-study-plan" data={exportData} label="Export plan" exportType="study_plan" sourceType="tasks" /></div>
    <div style={cardStyle}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><p style={{ fontSize: 13, fontWeight: 600 }}>XP Progress</p><p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{xp} / {xpToNextLevel}</p></div><div style={{ background: "var(--muted)", borderRadius: 99, height: 8 }}><div style={{ background: "var(--primary)", borderRadius: 99, height: 8, width: `${Math.min((xp / xpToNextLevel) * 100, 100)}%`, transition: "width .5s ease" }} /></div></div>
    <div style={cardStyle}><p style={{ fontWeight: 700, marginBottom: 12 }}>Add Subject</p><div style={{ display: "flex", gap: 8 }}><input placeholder="e.g. Mathematics" value={newSubject} onChange={e => setNewSubject(e.target.value)} onKeyDown={e => e.key === "Enter" && void addSubject()} style={inputStyle} /><button onClick={() => void addSubject()} style={{ background: "var(--primary)", color: "white", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 700, cursor: "pointer" }}>Add</button></div></div>
    {subjects.length === 0 ? <div style={{ ...cardStyle, textAlign: "center", padding: 32 }}><p style={{ fontSize: 32 }}>📚</p><p style={{ color: "var(--muted-foreground)", marginTop: 8 }}>No subjects yet. Add one above.</p></div> : subjects.map(subject => { const subjectTasks = tasks.filter(t => t.subject_id === subject.id); const completed = subjectTasks.filter(t => t.completed).length; const progress = subjectTasks.length ? Math.round(completed / subjectTasks.length * 100) : 0; return <div key={subject.id} style={cardStyle}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><p style={{ fontWeight: 700, fontSize: 16 }}>{subject.name}</p><div style={{ display: "flex", alignItems: "center", gap: 8 }}><p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{completed}/{subjectTasks.length}</p><button aria-label={`Delete ${subject.name}`} onClick={() => void deleteSubject(subject.id)} style={{ background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer", fontSize: 16 }}>🗑️</button></div></div><div style={{ background: "var(--muted)", borderRadius: 99, height: 4, marginBottom: 12 }}><div style={{ background: progress === 100 ? "var(--success)" : "var(--primary)", borderRadius: 99, height: 4, width: `${progress}%` }} /></div><div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>{subjectTasks.map(task => <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 10, background: task.completed ? "rgba(34,197,94,.1)" : "var(--muted)", borderRadius: 8, padding: "10px 12px" }}><button aria-label={task.completed ? `${task.title} completed` : `Complete ${task.title}`} onClick={() => void completeTask(task)} disabled={task.completed} style={{ width: 20, height: 20, borderRadius: "50%", border: task.completed ? "none" : "2px solid var(--muted-foreground)", background: task.completed ? "var(--success)" : "transparent", cursor: task.completed ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{task.completed && <span style={{ color: "white", fontSize: 11 }}>✓</span>}</button><p style={{ fontSize: 14, flex: 1, textDecoration: task.completed ? "line-through" : "none", color: task.completed ? "var(--muted-foreground)" : "var(--foreground)" }}>{task.title}</p>{!task.completed && <button aria-label={`Delete ${task.title}`} onClick={() => void deleteTask(task.id)} style={{ background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer", fontSize: 14 }}>✕</button>}</div>)}</div><div style={{ display: "flex", gap: 8 }}><input placeholder="Add a task..." value={newTasks[subject.id] || ""} onChange={e => setNewTasks(prev => ({ ...prev, [subject.id]: e.target.value }))} onKeyDown={e => e.key === "Enter" && void addTask(subject.id)} style={inputStyle} /><button onClick={() => void addTask(subject.id)} style={{ background: "var(--primary)", color: "white", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 700, cursor: "pointer" }}>Add</button></div></div>; })}
    {subjects.length > 0 && <div style={cardStyle}><p style={{ fontWeight: 700, marginBottom: 8 }}>Overview</p><p style={{ color: "var(--muted-foreground)", fontSize: 14 }}>Total tasks: {tasks.length}</p><p style={{ color: "var(--muted-foreground)", fontSize: 14, marginTop: 4 }}>Completed: {tasks.filter(t => t.completed).length}</p></div>}
  </div>;
}
