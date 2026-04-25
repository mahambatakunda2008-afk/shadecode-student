import { CortexCacheEntry } from "@/lib/cortex/types";

const CACHE_TTL_MS = 30 * 60 * 1000;
const CLIENT_STORAGE_KEY = "shadecode:cortex:cache";
const serverCache = new Map<string, CortexCacheEntry<unknown>>();

type CacheState = Record<string, CortexCacheEntry<unknown>>;

function isFresh(entry: CortexCacheEntry<unknown>) {
  return Date.now() - new Date(entry.createdAt).getTime() < CACHE_TTL_MS;
}

function isBrowser() {
  return typeof window !== "undefined";
}

function readClientCache(): CacheState {
  if (!isBrowser()) {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(CLIENT_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    return JSON.parse(raw) as CacheState;
  } catch {
    return {};
  }
}

function writeClientCache(state: CacheState) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(state));
}

export function getCachedCortexValue<T>(cacheKey: string) {
  if (isBrowser()) {
    const state = readClientCache();
    const entry = state[cacheKey];

    if (!entry || !isFresh(entry)) {
      return null;
    }

    return entry.value as T;
  }

  const entry = serverCache.get(cacheKey);
  if (!entry || !isFresh(entry)) {
    return null;
  }

  return entry.value as T;
}

export function setCachedCortexValue<T>(cacheKey: string, value: T) {
  const entry: CortexCacheEntry<T> = {
    createdAt: new Date().toISOString(),
    value,
  };

  if (isBrowser()) {
    const state = readClientCache();
    state[cacheKey] = entry;
    writeClientCache(state);
    return;
  }

  serverCache.set(cacheKey, entry);
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
