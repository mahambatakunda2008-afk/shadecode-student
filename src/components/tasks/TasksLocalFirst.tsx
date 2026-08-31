"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import ExportMenu from "@/components/exports/ExportMenu";
import PageSkeleton from "@/components/ui/PageSkeleton";
import { localTasks } from "@/lib/local-first/tasks";
import { localSubjects } from "@/lib/local-first/subjects";
import { awardXp, getXp, recordStudyDay } from "@/lib/local-first/gamification";
import { offlineSync } from "@/lib/offline/sync";

type Subject = { id: string; name: string };
type Task = { id: string; subject_id: string; title: string; completed: boolean };

const toSubjects = (items: Awaited<ReturnType<typeof localSubjects.list>>): Subject[] => items.map(({ id, name }) => ({ id, name }));
const toTasks = (items: Awaited<ReturnType<typeof localTasks.list>>): Task[] => items.map(({ id, subject_id, title, completed }) => ({ id, subject_id, title, completed }));

export default function TasksLocalFirst() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [newSubject, setNewSubject] = useState("");
  const [newTasks, setNewTasks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState("");

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  }, []);

  const loadLocal = useCallback(async (id: string) => {
    const [localSubjectRows, localTaskRows, localXp] = await Promise.all([
      localSubjects.list(id),
      localTasks.list(id),
      getXp(id),
    ]);
    setSubjects(toSubjects(localSubjectRows));
    setTasks(toTasks(localTaskRows));
    if (localXp) { setXp(localXp.totalXp); setLevel(localXp.level); }
    return { subjects: localSubjectRows, tasks: localTaskRows };
  }, []);

  const refreshFromServer = useCallback(async (id: string) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    setRefreshing(true);
    try {
      const [{ data: subjectRows, error: subjectError }, { data: taskRows, error: taskError }, { data: profile }] = await Promise.all([
        supabase.from("subjects").select("id,name").eq("user_id", id),
        supabase.from("tasks").select("id,subject_id,title,completed").eq("user_id", id),
        supabase.from("profiles").select("xp,level").eq("id", id).single(),
      ]);
      if (subjectError || taskError) throw subjectError ?? taskError;
      for (const subject of subjectRows ?? []) await localSubjects.save({ id: subject.id, userId: id, name: subject.name });
      for (const task of taskRows ?? []) await localTasks.create({ id: task.id, userId: id, subject_id: task.subject_id, title: task.title, completed: task.completed });
      await loadLocal(id);
      if (profile) { setXp(profile.xp ?? 0); setLevel(profile.level ?? 1); }
    } catch (error) {
      console.error("[TasksLocalFirst] background refresh failed", error);
      if (subjects.length === 0 && tasks.length === 0) notify("You're offline. Add subjects or tasks and they'll stay on this device.");
    } finally { setRefreshing(false); }
  }, [loadLocal, notify, subjects.length, supabase, tasks.length]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      if (cancelled) return;
      setUserId(user.id);
      await loadLocal(user.id);
      if (!cancelled) setLoading(false);
      void refreshFromServer(user.id);
    })().catch(error => {
      console.error("[TasksLocalFirst] load failed", error);
      if (!cancelled) { setLoading(false); notify("Your local workspace could not be opened."); }
    });
    return () => { cancelled = true; };
  }, [loadLocal, notify, refreshFromServer, router, supabase]);

  useEffect(() => {
    if (!userId) return;
    const onOnline = () => { void offlineSync.syncAll(); void refreshFromServer(userId); };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [refreshFromServer, userId]);

  const addSubject = async () => {
    const name = newSubject.trim(); if (!name || !userId) return;
    const id = crypto.randomUUID();
    try {
      const subject = await localSubjects.save({ id, userId, name });
      setSubjects(prev => [...prev, { id: subject.id, name: subject.name }]);
      setNewSubject(""); notify("Subject saved on this device.");
      if (navigator.onLine) void offlineSync.syncAll();
    } catch (error) { console.error(error); notify("Couldn't save that subject."); }
  };

  const addTask = async (subjectId: string) => {
    const title = newTasks[subjectId]?.trim(); if (!title || !userId) return;
    const id = crypto.randomUUID();
    try {
      const task = await localTasks.create({ id, userId, subject_id: subjectId, title, completed: false });
      setTasks(prev => [...prev, { id: task.id, subject_id: task.subject_id, title: task.title, completed: false }]);
      setNewTasks(prev => ({ ...prev, [subjectId]: "" })); notify("Task saved on this device.");
      if (navigator.onLine) void offlineSync.syncAll();
    } catch (error) { console.error(error); notify("Couldn't save that task."); }
  };

  const completeTask = async (task: Task) => {
    if (task.completed || !userId) return;
    try {
      const updated = await localTasks.complete(task.id, userId);
      if (!updated) return;
      setTasks(prev => prev.map(item => item.id === task.id ? { ...item, completed: true } : item));
      const [xpState] = await Promise.all([awardXp(userId, 10), recordStudyDay(userId)]);
      setXp(xpState.payload.totalXp); setLevel(xpState.payload.level);
      notify(navigator.onLine ? "+10 XP • saved locally and syncing" : "+10 XP • saved offline");
      if (navigator.onLine) void offlineSync.syncAll();
    } catch (error) { console.error("[TasksLocalFirst] completion failed", error); notify("Couldn't complete that task."); }
  };

  const deleteTask = async (taskId: string) => {
    if (!userId) return;
    try { await localTasks.remove(taskId, userId); setTasks(prev => prev.filter(task => task.id !== taskId)); notify("Task deleted locally."); if (navigator.onLine) void offlineSync.syncAll(); }
    catch (error) { console.error(error); notify("Couldn't delete that task."); }
  };

  const deleteSubject = async (subjectId: string) => {
    if (!userId) return;
    try {
      for (const task of tasks.filter(item => item.subject_id === subjectId)) await localTasks.remove(task.id, userId);
      await localSubjects.remove(subjectId, userId);
      setTasks(prev => prev.filter(task => task.subject_id !== subjectId));
      setSubjects(prev => prev.filter(subject => subject.id !== subjectId));
      notify("Subject deleted locally."); if (navigator.onLine) void offlineSync.syncAll();
    } catch (error) { console.error(error); notify("Couldn't delete that subject."); }
  };

  if (loading) return <PageSkeleton variant="list" />;
  const exportData = tasks.map(task => ({ id: task.id, subject: subjects.find(s => s.id === task.subject_id)?.name ?? "Unknown", task: task.title, completed: task.completed }));
  const xpToNext = Math.max(level * 100, 1);

  return <div style={{ padding: "32px 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
    {toast && <div role="status" style={{ position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)", background: "var(--primary)", color: "white", padding: "10px 20px", borderRadius: 99, fontWeight: 700, fontSize: 14, zIndex: 100 }}>{toast}</div>}
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div><h1 style={{ fontSize: 28, fontWeight: 800 }}>Tasks</h1><p style={{ color: "var(--muted-foreground)", fontSize: 14, marginTop: 4 }}>Level {level} • {xp} XP {refreshing ? "• syncing…" : "• device-first"}</p></div><ExportMenu filename="shadecode-study-plan" data={exportData} label="Export plan" exportType="study_plan" sourceType="tasks" /></div>
    <div style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 12, padding: 16 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><b>XP Progress</b><span>{xp} / {xpToNext}</span></div><div style={{ background: "var(--muted)", borderRadius: 99, height: 8 }}><div style={{ background: "var(--primary)", borderRadius: 99, height: 8, width: `${Math.min((xp / xpToNext) * 100, 100)}%` }} /></div></div>
    <div style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 12, padding: 16 }}><b>Add Subject</b><div style={{ display: "flex", gap: 8, marginTop: 12 }}><input aria-label="Subject name" placeholder="e.g. Mathematics" value={newSubject} onChange={e => setNewSubject(e.target.value)} onKeyDown={e => e.key === "Enter" && void addSubject()} style={{ flex: 1, background: "var(--muted)", border: "1px solid var(--card-border)", borderRadius: 8, padding: "10px 14px", color: "var(--foreground)" }} /><button onClick={() => void addSubject()} style={{ background: "var(--primary)", color: "white", border: 0, borderRadius: 8, padding: "10px 16px", fontWeight: 700 }}>Add</button></div></div>
    {subjects.length === 0 ? <div style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 12, padding: 32, textAlign: "center", color: "var(--muted-foreground)" }}>No subjects yet. Add one above. Your changes will work without internet.</div> : subjects.map(subject => { const subjectTasks = tasks.filter(task => task.subject_id === subject.id); const completed = subjectTasks.filter(task => task.completed).length; const progress = subjectTasks.length ? Math.round(completed / subjectTasks.length * 100) : 0; return <section key={subject.id} style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 12, padding: 16 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><b>{subject.name}</b><button aria-label={`Delete ${subject.name}`} onClick={() => void deleteSubject(subject.id)} style={{ background: "none", border: 0, cursor: "pointer" }}>🗑️</button></div><div style={{ marginTop: 10, background: "var(--muted)", borderRadius: 99, height: 4 }}><div style={{ background: "var(--primary)", width: `${progress}%`, height: 4, borderRadius: 99 }} /></div><div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>{subjectTasks.map(task => <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}><button disabled={task.completed} onClick={() => void completeTask(task)} aria-label={task.completed ? `${task.title} completed` : `Complete ${task.title}`} style={{ width: 22, height: 22, borderRadius: 7, border: "1px solid var(--card-border)", background: task.completed ? "var(--primary)" : "transparent", cursor: task.completed ? "default" : "pointer" }}>✓</button><span style={{ flex: 1, textDecoration: task.completed ? "line-through" : "none", opacity: task.completed ? .6 : 1 }}>{task.title}</span><button onClick={() => void deleteTask(task.id)} aria-label={`Delete ${task.title}`} style={{ background: "none", border: 0, cursor: "pointer", opacity: .7 }}>×</button></div>)}</div><div style={{ display: "flex", gap: 8, marginTop: 10 }}><input aria-label={`New task for ${subject.name}`} placeholder="Add a task…" value={newTasks[subject.id] ?? ""} onChange={e => setNewTasks(prev => ({ ...prev, [subject.id]: e.target.value }))} onKeyDown={e => e.key === "Enter" && void addTask(subject.id)} style={{ flex: 1, background: "var(--muted)", border: "1px solid var(--card-border)", borderRadius: 8, padding: "9px 12px", color: "var(--foreground)" }} /><button onClick={() => void addTask(subject.id)} style={{ border: "1px solid var(--card-border)", background: "var(--surface-2)", borderRadius: 8, padding: "9px 12px", fontWeight: 700 }}>Add</button></div></section>; })}
  </div>;
}
