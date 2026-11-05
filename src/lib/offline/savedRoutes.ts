import { CORE_OFFLINE_ROUTES } from "./warmPolicy";

export interface SavedRoute { href: string; label: string }

/** Which core screens this device has saved for offline use (reads the browser Cache Storage; never the network). */
export async function listSavedRoutes(): Promise<SavedRoute[]> {
  if (typeof caches === "undefined") return [];
  try {
    const names = (await caches.keys()).filter((name) => name.startsWith("shadecode-pages-"));
    if (!names.length) return [];
    const cache = await caches.open(names[names.length - 1]);
    const saved: SavedRoute[] = [];
    for (const route of CORE_OFFLINE_ROUTES) {
      if (await cache.match(`${window.location.origin}${route.href}`, { ignoreVary: true })) saved.push({ ...route });
    }
    return saved;
  } catch {
    return [];
  }
}
