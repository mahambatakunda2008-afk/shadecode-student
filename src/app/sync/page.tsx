"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { CloudDownload, CloudUpload, Download, RefreshCw, ShieldCheck, Smartphone, TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { decryptBundle, downloadEncryptedBundle, encryptBundle, downloadEncryptedBackup, localFirstStore, uploadEncryptedBackup, type EncryptedSyncBundle } from "@/lib/local-first";
import type { LocalConflict } from "@/lib/local-first/types";

export default function SyncPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string>("");
  const [passphrase, setPassphrase] = useState("");
  const [status, setStatus] = useState("Your device is the primary copy of your study data.");
  const [busy, setBusy] = useState(false);
  const [conflicts, setConflicts] = useState<LocalConflict[]>([]);

  async function refreshConflicts(id: string) {
    try { setConflicts((await localFirstStore.listConflicts(id)).sort((a, b) => b.createdAt - a.createdAt)); } catch { setConflicts([]); }
  }

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();
    void (async () => {
      const [{ data }, id] = await Promise.all([supabase.auth.getUser(), localFirstStore.deviceId()]);
      if (!mounted) return;
      const nextUserId = data.user?.id ?? null;
      setUserId(nextUserId);
      setDeviceId(id);
      if (nextUserId) await refreshConflicts(nextUserId);
    })();
    return () => { mounted = false; };
  }, []);

  async function createBackup(): Promise<EncryptedSyncBundle> {
    if (!userId) throw new Error("Sign in before creating a backup");
    if (passphrase.length < 8) throw new Error("Use a sync passphrase of at least 8 characters");
    return encryptBundle(await localFirstStore.exportBundle(userId), passphrase);
  }
  async function handleDownload() { setBusy(true); try { downloadEncryptedBundle(await createBackup()); setStatus("Encrypted backup exported. Keep the passphrase safe: Shadecode cannot recover it."); } catch (error) { setStatus(error instanceof Error ? error.message : "Backup export failed"); } finally { setBusy(false); } }
  async function handleCloudUpload() { setBusy(true); try { await uploadEncryptedBackup(userId!, await createBackup()); setStatus("Encrypted backup uploaded. The cloud stores ciphertext, not your study data."); } catch (error) { setStatus(error instanceof Error ? error.message : "Cloud backup failed"); } finally { setBusy(false); } }
  async function importEncrypted(encrypted: EncryptedSyncBundle) { if (!userId) throw new Error("Sign in before restoring a backup"); if (passphrase.length < 8) throw new Error("Enter the passphrase used to create the backup"); const result = await localFirstStore.importBundle(await decryptBundle(encrypted, passphrase), userId); await refreshConflicts(userId); setStatus(`Restore complete: ${result.imported} records imported, ${result.conflicts} conflicts resolved locally.`); }
  async function handleFile(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; setBusy(true); try { await importEncrypted(JSON.parse(await file.text()) as EncryptedSyncBundle); } catch (error) { setStatus(error instanceof Error ? error.message : "Restore failed"); } finally { setBusy(false); event.target.value = ""; } }
  async function handleCloudRestore() { setBusy(true); try { const encrypted = await downloadEncryptedBackup(userId!); if (!encrypted) { setStatus("No cloud backup exists for this account yet."); return; } await importEncrypted(encrypted); } catch (error) { setStatus(error instanceof Error ? error.message : "Cloud restore failed"); } finally { setBusy(false); } }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div><p className="mb-2 text-sm font-medium text-muted-foreground">Shadecode architecture</p><h1 className="text-3xl font-bold tracking-tight">Device-first sync</h1><p className="mt-2 max-w-2xl text-muted-foreground">Your phone or computer keeps the working copy. The server is a backup and relay, not the brain of the app.</p></div>
      <section className="rounded-2xl border p-5"><div className="flex items-start gap-3"><Smartphone className="mt-1 h-5 w-5" /><div className="min-w-0 flex-1"><h2 className="font-semibold">This device</h2><p className="mt-1 text-sm text-muted-foreground">Local data lives in IndexedDB and remains usable offline.</p><p className="mt-3 break-all font-mono text-xs text-muted-foreground">Device: {deviceId || "initializing…"}</p></div></div></section>
      <section className="rounded-2xl border p-5"><div className="flex items-start gap-3"><ShieldCheck className="mt-1 h-5 w-5" /><div className="flex-1"><h2 className="font-semibold">Encrypted sync key</h2><p className="mt-1 text-sm text-muted-foreground">Backups are encrypted in your browser with AES-GCM. Your passphrase never goes to Shadecode.</p><input type="password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} placeholder="At least 8 characters" className="mt-4 w-full rounded-xl border bg-transparent px-3 py-2 outline-none" autoComplete="new-password" /></div></div></section>
      <section className="grid gap-3 sm:grid-cols-2"><button disabled={busy || !userId} onClick={handleDownload} className="flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-medium disabled:opacity-50"><Download className="h-4 w-4" /> Export encrypted backup</button><label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-3 font-medium"><CloudDownload className="h-4 w-4" /> Import backup file<input type="file" accept=".scsync,application/json" onChange={handleFile} className="hidden" /></label><button disabled={busy || !userId} onClick={handleCloudUpload} className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground disabled:opacity-50"><CloudUpload className="h-4 w-4" /> Backup to cloud</button><button disabled={busy || !userId} onClick={handleCloudRestore} className="flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-medium disabled:opacity-50"><RefreshCw className="h-4 w-4" /> Restore cloud backup</button></section>
      <section className="rounded-2xl border p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Sync conflicts</h2><p className="mt-1 text-sm text-muted-foreground">When devices disagree, Shadecode keeps the losing operation instead of silently throwing it away.</p></div><TriangleAlert className="h-5 w-5 shrink-0" /></div>{conflicts.length === 0 ? <p className="mt-4 rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">No local conflicts recorded.</p> : <div className="mt-4 space-y-3">{conflicts.slice(0, 10).map((conflict) => <article key={conflict.id} className="rounded-xl bg-muted/50 p-3 text-sm"><div className="flex items-center justify-between gap-2"><span className="font-medium">{conflict.entity} · {conflict.entityId}</span><span className="text-xs text-muted-foreground">{new Date(conflict.createdAt).toLocaleString()}</span></div><p className="mt-1 text-xs text-muted-foreground">Winner: {conflict.winner.deviceId} · Loser: {conflict.loser.deviceId} · {conflict.reason}</p></article>)}</div>}</section>
      <p className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">{busy ? "Working…" : status}</p>
    </main>
  );
}
