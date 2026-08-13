import { createClient } from "@/lib/supabase/client";
import type { EncryptedSyncBundle } from "./types";

const BUCKET = "shadecode-backups";
const FILE_NAME = "latest.scsync";

/**
 * Supabase is deliberately used here only as an opaque backup relay.
 * The payload is encrypted in the browser before it reaches the server.
 */
export async function uploadEncryptedBackup(
  userId: string,
  bundle: EncryptedSyncBundle,
): Promise<void> {
  const supabase = createClient();
  const body = new Blob([JSON.stringify(bundle)], { type: "application/vnd.shadecode.sync+json" });
  const path = `${userId}/${FILE_NAME}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    upsert: true,
    contentType: "application/vnd.shadecode.sync+json",
    cacheControl: "31536000",
  });

  if (error) throw new Error(`Cloud backup failed: ${error.message}`);
}

export async function downloadEncryptedBackup(userId: string): Promise<EncryptedSyncBundle | null> {
  const supabase = createClient();
  const path = `${userId}/${FILE_NAME}`;
  const { data, error } = await supabase.storage.from(BUCKET).download(path);

  if (error) {
    if (/not found|object not found/i.test(error.message)) return null;
    throw new Error(`Cloud restore failed: ${error.message}`);
  }

  const text = await data.text();
  return JSON.parse(text) as EncryptedSyncBundle;
}

export const LOCAL_FIRST_BACKUP_BUCKET = BUCKET;
