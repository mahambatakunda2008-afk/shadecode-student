"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { CloudDownload, CloudUpload, Download, RefreshCw, ShieldCheck, Smartphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  decryptBundle,
  downloadEncryptedBackup,
  encryptBundle,
  downloadEncryptedBackup as fetchCloudBackup,
  localFirstStore,
  uploadEncryptedBackup,
  type EncryptedSyncBundle,
} from "@/lib/local-first";

export default function SyncPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string>("");
  const [passphrase, setPassphrase] = useState("");
  const [status, setStatus] = useState("Your device is the primary copy of your study data.");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    void (async () => {
      const [{ data }, id] = await Promise.all([
        supabase.auth.getUser(),
        localFirstStore.deviceId(),
      ]);
      if (!mounted) return;
      setUserId(data.user?.id ?? null);
      setDeviceId(id);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  async function createBackup(): Promise<EncryptedSyncBundle> {
    if (!userId) throw new Error("Sign in before creating a backup");
    if (passphrase.length < 8) throw new Error("Use a sync passphrase of at least 8 characters");
    const bundle = await localFirstStore.exportBundle(userId);
    return encryptBundle(bundle, passphrase);
  }

  async function handleDownload() {
    setBusy(true);
    try {
      const encrypted = await createBackup();
      downloadEncryptedBackup(encrypted);
      setStatus("Encrypted backup exported. Keep the passphrase safe: Shadecode cannot recover it.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Backup export failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleCloudUpload() {
    setBusy(true);
    try {
      const encrypted = await createBackup();
      await uploadEncryptedBackup(userId!, encrypted);
      setStatus("Encrypted backup uploaded. The cloud stores ciphertext, not your study data.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Cloud backup failed");
    } finally {
      setBusy(false);
    }
  }

  async function importEncrypted(encrypted: EncryptedSyncBundle) {
    if (!userId) throw new Error("Sign in before restoring a backup");
    if (passphrase.length < 8) throw new Error("Enter the passphrase used to create the backup");
    const bundle = await decryptBundle(encrypted, passphrase);
    const result = await localFirstStore.importBundle(bundle, userId);
    setStatus(`Restore complete: ${result.imported} records imported, ${result.conflicts} conflicts resolved locally.`);
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const encrypted = JSON.parse(await file.text()) as EncryptedSyncBundle;
      await importEncrypted(encrypted);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Restore failed");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  async function handleCloudRestore() {
    setBusy(true);
    try {
      const encrypted = await fetchCloudBackup(userId!);
      if (!encrypted) {
        setStatus("No cloud backup exists for this account yet.");
        return;
      }
      await importEncrypted(encrypted);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Cloud restore failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <p className="mb-2 text-sm font-medium text-muted-foreground">Shadecode architecture</p>
        <h1 className="text-3xl font-bold tracking-tight">Device-first sync</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Your phone or computer keeps the working copy. The server is a backup and relay, not the brain of the app.
        </p>
      </div>

      <section className="rounded-2xl border p-5">
        <div className="flex items-start gap-3">
          <Smartphone className="mt-1 h-5 w-5" />
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">This device</h2>
            <p className="mt-1 text-sm text-muted-foreground">Local data lives in IndexedDB and remains usable offline.</p>
            <p className="mt-3 break-all font-mono text-xs text-muted-foreground">Device: {deviceId || "initializing…"}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 h-5 w-5" />
          <div className="flex-1">
            <h2 className="font-semibold">Encrypted sync key</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Backups are encrypted in your browser with AES-GCM. Your passphrase never goes to Shadecode.
            </p>
            <input
              type="password"
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
              placeholder="At least 8 characters"
              className="mt-4 w-full rounded-xl border bg-transparent px-3 py-2 outline-none"
              autoComplete="new-password"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <button disabled={busy || !userId} onClick={handleDownload} className="flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-medium disabled:opacity-50">
          <Download className="h-4 w-4" /> Export encrypted backup
        </button>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-3 font-medium">
          <CloudDownload className="h-4 w-4" /> Import backup file
          <input type="file" accept=".scsync,application/json" onChange={handleFile} className="hidden" />
        </label>
        <button disabled={busy || !userId} onClick={handleCloudUpload} className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground disabled:opacity-50">
          <CloudUpload className="h-4 w-4" /> Backup to cloud
        </button>
        <button disabled={busy || !userId} onClick={handleCloudRestore} className="flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-medium disabled:opacity-50">
          <RefreshCw className="h-4 w-4" /> Restore cloud backup
        </button>
      </section>

      <p className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">{busy ? "Working…" : status}</p>
    </main>
  );
}
