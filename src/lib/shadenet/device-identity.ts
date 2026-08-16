const DEVICE_KEY = "shadecode:device-id";

function randomId(): string {
  const webCrypto = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (webCrypto?.randomUUID) return webCrypto.randomUUID();
  if (webCrypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    webCrypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  throw new Error("Secure randomness is unavailable");
}

export function getDeviceId(storage: Pick<Storage, "getItem" | "setItem"> = localStorage): string {
  const existing = storage.getItem(DEVICE_KEY);
  if (existing) return existing;
  const id = randomId();
  storage.setItem(DEVICE_KEY, id);
  return id;
}
