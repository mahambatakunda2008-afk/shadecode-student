"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, CloudOff, RefreshCw, Sparkles, Target } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { localFirstStore, type LocalRecord } from "@/lib/local-first";

type Snapshot = { table: string; fetchedAt: number; rows: Record<string, unknown>[] };

function snapshotOf(record: LocalRecord | undefined): Snapshot | null {
  if (!record || !record.payload || typeof record.payload !== "object") return null;
  const payload = record.payload as Partial<Snapshot>;
  return Array.isArray(payload.rows)
    ? { table: String(payload.table ?? record.entity), fetchedAt: Number(payload.fetchedAt ?? record.updatedAt), rows: payload.rows as Record<string, unknown>[] }
    : null;
}

function text(row: Record<string, unknown>, keys: string[], fallback: string) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
  }
  return fallback;
}

export default function OfflineHub() {
  const [records, setRecords] = useState<LocalRecord[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const id = data.user?.id ?? null;
      setUserId(id);
      if (id) setRecords(await localFirstStore.list(id));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const snapshots = useMemo(() => {
    const map = new Map<string, Snapshot>();
    for (const record of records) {
      const snapshot = snapshotOf(record);
      if (snapshot) map.set(snapshot.table, snapshot);
    }
    return map;
  }, [records]);

  const tasks = snapshots.get("tasks")?.rows ?? [];
  const timetable = snapshots.get("timetable")?.rows ?? [];
  const achievements = snapshots.get("achievements")?.rows ?? [];
  const insights = [...(snapshots.get("insights")?.rows ?? []), ...(snapshots.get("cortex_insights")?.rows ?? [])];
  const lastSync = Math.max(0, ...Array.from(snapshots.values()).map((item) => item.fetchedAt));

  return (
    <main className="mx-auto min-h-screen max-w-5xl space-y-6 p-5 pb-12 sm:p-8">
      <header className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold">
              <CloudOff className="h-3.5 w-3.5" /> Offline mode
            </div>
            <h1 className="text-3xl font-black tracking-tight">Shadecode, without the internet.</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Your device keeps the latest study snapshots locally. Keep learning now, sync when the connection returns.
            </p>
          </div>
          <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh local data
          </button>
        </div>
        <p className="mt-5 text-xs text-muted-foreground">
          {lastSync ? `Last local sync: ${new Date(lastSync).toLocaleString()}` : "No local snapshot yet. Open Shadecode while online once to seed this device."}
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [Target, "Tasks", tasks.length],
          [CalendarClock, "Timetable", timetable.length],
          [CheckCircle2, "Achievements", achievements.length],
          [Sparkles, "Cortex insights", insights.length],
        ].map(([Icon, label, value]) => (
          <div key={String(label)} className="rounded-2xl border bg-card p-5">
            <Icon className="mb-4 h-5 w-5" />
            <div className="text-2xl font-black">{value as number}</div>
            <div className="text-sm text-muted-foreground">{String(label)}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="font-bold">Your tasks</h2>
          <div className="mt-4 space-y-2">
            {tasks.slice(0, 8).map((row, index) => (
              <div key={String(row.id ?? index)} className="rounded-xl border p-3">
                <p className="font-medium">{text(row, ["title", "name", "task"], `Task ${index + 1}`)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{text(row, ["status", "completed"], "Saved locally")}</p>
              </div>
            ))}
            {!tasks.length && <p className="text-sm text-muted-foreground">No cached tasks yet.</p>}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <h2 className="font-bold">Upcoming timetable</h2>
          <div className="mt-4 space-y-2">
            {timetable.slice(0, 8).map((row, index) => (
              <div key={String(row.id ?? index)} className="rounded-xl border p-3">
                <p className="font-medium">{text(row, ["title", "subject", "name"], `Study block ${index + 1}`)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{text(row, ["start_time", "startTime", "date"], "Saved locally")}</p>
              </div>
            ))}
            {!timetable.length && <p className="text-sm text-muted-foreground">No cached timetable yet.</p>}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard" className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground">Back to app</Link>
        <Link href="/sync" className="rounded-xl border px-5 py-3 text-sm font-bold">Manage device sync</Link>
        {!userId && <span className="self-center text-xs text-muted-foreground">Sign in once while online to enable device snapshots.</span>}
      </div>
    </main>
  );
}
