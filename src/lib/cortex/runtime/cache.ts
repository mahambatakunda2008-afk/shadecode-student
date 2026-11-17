import { CortexCacheEntry } from "@/lib/cortex/types";

const CACHE_TTL_MS = 30 * 60 * 1000;
const CLIENT_STORAGE_KEY = "shadecode:cortex:cache";
const MAX_CLIENT_CACHE_ENTRIES = 100;
const serverCache = new Map<string, CortexCacheEntry<unknown>>();

type CacheState = Record<string, CortexCacheEntry<unknown>>;

function isFresh(entry: CortexCacheEntry<unknown>) {
  const createdAt = Date.parse(entry.createdAt);
  const age = Date.now() - createdAt;
  return Number.isFinite(createdAt) && age >= 0 && age < CACHE_TTL_MS;
}

function isCacheEntry(value: unknown): value is CortexCacheEntry<unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Partial<CortexCacheEntry<unknown>>;
  return typeof candidate.createdAt === "string" && "value" in candidate && isFresh(candidate as CortexCacheEntry<unknown>);
}

function isBrowser() {
  return typeof window !== "undefined";
}

function readClientCache(): CacheState {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(CLIENT_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const valid: CacheState = {};
    for (const [key, entry] of Object.entries(parsed)) {
      if (isCacheEntry(entry)) valid[key] = entry;
    }
    return valid;
  } catch {
    // Storage is an optional acceleration layer, never a dependency for Cortex.
    return {};
  }
}

function writeClientCache(state: CacheState) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota/privacy-mode failures must not turn a successful answer into failure.
    try {
      const newest = Object.entries(state)
        .sort(([, a], [, b]) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .slice(0, Math.ceil(MAX_CLIENT_CACHE_ENTRIES / 2));
      window.localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(Object.fromEntries(newest)));
    } catch {
      // Best effort only. The caller's primary result remains successful.
    }
  }
}

export function getCachedCortexValue<T>(cacheKey: string) {
  if (isBrowser()) {
    const entry = readClientCache()[cacheKey];
    return entry ? entry.value as T : null;
  }
  const entry = serverCache.get(cacheKey);
  if (!entry || !isFresh(entry)) {
    serverCache.delete(cacheKey);
    return null;
  }
  return entry.value as T;
}

export function setCachedCortexValue<T>(cacheKey: string, value: T) {
  const entry: CortexCacheEntry<T> = { createdAt: new Date().toISOString(), value };
  if (isBrowser()) {
    const state = readClientCache();
    state[cacheKey] = entry;
    const bounded = Object.fromEntries(
      Object.entries(state)
        .sort(([, a], [, b]) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .slice(0, MAX_CLIENT_CACHE_ENTRIES),
    );
    writeClientCache(bounded);
    return;
  }
  serverCache.set(cacheKey, entry);
  if (serverCache.size > MAX_CLIENT_CACHE_ENTRIES) {
    for (const [key, cached] of serverCache) {
      if (!isFresh(cached) || serverCache.size > MAX_CLIENT_CACHE_ENTRIES) serverCache.delete(key);
      if (serverCache.size <= MAX_CLIENT_CACHE_ENTRIES) break;
    }
  }
}

export function getCachedCortexInsight(cacheKey: string) {
  return getCachedCortexValue<string>(cacheKey);
}

export function setCachedCortexInsight(cacheKey: string, insight: string) {
  setCachedCortexValue(cacheKey, insight);
}

export function createCortexCacheKey(scope: string, fingerprint: string) {
  return `${scope}:${fingerprint}`;
}
