import type { EncryptedSyncBundle, SyncBundle } from "./types";

const PBKDF2_ITERATIONS = 250_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

/**
 * Normalize a typed-array view to a concrete ArrayBuffer.
 *
 * Recent TypeScript DOM typings distinguish ArrayBuffer from ArrayBufferLike
 * for Web Crypto BufferSource parameters. Keeping the conversion here makes
 * the crypto boundary explicit without changing the bytes we encrypt.
 */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer as ArrayBuffer;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptBundle(bundle: SyncBundle, passphrase: string): Promise<EncryptedSyncBundle> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("Web Crypto is unavailable in this environment");
  }
  if (passphrase.length < 8) throw new Error("Sync passphrase must be at least 8 characters");

  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(passphrase, salt);
  const plaintext = new TextEncoder().encode(JSON.stringify(bundle));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(plaintext),
  );

  return {
    version: 1,
    algorithm: "AES-GCM",
    kdf: "PBKDF2-SHA-256",
    iterations: PBKDF2_ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    createdAt: Date.now(),
  };
}

export async function decryptBundle(
  encrypted: EncryptedSyncBundle,
  passphrase: string,
): Promise<SyncBundle> {
  if (encrypted.version !== 1 || encrypted.algorithm !== "AES-GCM" || encrypted.kdf !== "PBKDF2-SHA-256") {
    throw new Error("Unsupported Shadecode encrypted bundle");
  }

  const salt = base64ToBytes(encrypted.salt);
  const iv = base64ToBytes(encrypted.iv);
  const ciphertext = base64ToBytes(encrypted.ciphertext);
  const key = await deriveKey(passphrase, salt);

  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: toArrayBuffer(iv) },
      key,
      toArrayBuffer(ciphertext),
    );
    const bundle = JSON.parse(new TextDecoder().decode(plaintext)) as SyncBundle;
    if (bundle.version !== 1 || !bundle.userId || !Array.isArray(bundle.records)) {
      throw new Error("Invalid sync bundle");
    }
    return bundle;
  } catch {
    throw new Error("Unable to decrypt sync bundle. Check the passphrase.");
  }
}

export function downloadEncryptedBundle(bundle: EncryptedSyncBundle): void {
  const blob = new Blob([JSON.stringify(bundle)], { type: "application/vnd.shadecode.sync+json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `shadecode-backup-${new Date().toISOString().slice(0, 10)}.scsync`;
  anchor.click();
  URL.revokeObjectURL(url);
}
