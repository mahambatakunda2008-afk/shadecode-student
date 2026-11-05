import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const SW_SOURCE = fs.readFileSync(path.resolve(__dirname, "../../../public/sw.js"), "utf8");
const ORIGIN = "https://app.test";

type Rec = { status: number; headers: [string, string][]; body: ArrayBuffer };

function makeCaches() {
  const stores = new Map<string, Map<string, Rec>>();
  const href = (req: unknown, ignoreSearch = false) => {
    const url = new URL(typeof req === "string" ? req : (req as { url: string }).url, ORIGIN);
    if (ignoreSearch) url.search = "";
    return url.href;
  };
  const rebuild = (rec: Rec) => new Response(rec.body.slice(0), { status: rec.status, headers: rec.headers });
  const cacheFor = (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name)!;
    return {
      async match(req: unknown, opts?: { ignoreSearch?: boolean }) {
        const wanted = href(req, opts?.ignoreSearch);
        for (const [key, rec] of store) if (href(key, opts?.ignoreSearch) === wanted) return rebuild(rec);
        return undefined;
      },
      async put(req: unknown, res: Response) {
        store.set(href(req), { status: res.status, headers: [...res.headers.entries()], body: await res.arrayBuffer() });
      },
      async add(req: string) {
        const res = await sandbox.fetch(req);
        await this.put(req, res);
      },
      async keys() {
        return [...store.keys()].map((key) => ({ url: key }));
      },
      async delete(req: unknown) {
        return store.delete(href(req));
      },
    };
  };
  return {
    stores,
    api: {
      open: async (name: string) => cacheFor(name),
      keys: async () => [...stores.keys()],
      delete: async (name: string) => stores.delete(name),
      match: async (req: unknown) => {
        for (const name of stores.keys()) {
          const hit = await cacheFor(name).match(req);
          if (hit) return hit;
        }
        return undefined;
      },
    },
  };
}

type Handler = (event: Record<string, unknown>) => void;
let handlers: Record<string, Handler>;
let sandbox: Record<string, unknown> & { fetch: (...args: unknown[]) => Promise<Response> };
let cachesMock: ReturnType<typeof makeCaches>;
let network: Map<string, () => Response | Promise<Response>>;
let offline: boolean;
let clientMessages: unknown[];
let fetchCalls: string[];

const html = (body: string, extra: { redirected?: boolean; status?: number; type?: string; date?: string } = {}) => {
  const res = new Response(body, { status: extra.status ?? 200, headers: { "content-type": extra.type ?? "text/html; charset=utf-8", ...(extra.date ? { date: extra.date } : {}) } });
  if (extra.redirected) Object.defineProperty(res, "redirected", { value: true });
  return res;
};

function boot() {
  cachesMock = makeCaches();
  handlers = {};
  clientMessages = [];
  fetchCalls = [];
  offline = false;
  network = new Map();
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type: string, fn: Handler) => { handlers[type] = fn; },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn(async () => undefined), matchAll: async () => [{ postMessage: (m: unknown) => clientMessages.push(m) }] },
  };
  sandbox = {
    self,
    caches: cachesMock.api,
    URL, Response, Request, Headers, Promise, Set, Map, Date, JSON, Array, Number, Object, Error,
    setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
    clearTimeout: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
    fetch: async (input: unknown) => {
      const url = new URL(typeof input === "string" ? input : (input as { url: string }).url, ORIGIN);
      fetchCalls.push(url.pathname + url.search);
      if (offline) throw new TypeError("Failed to fetch");
      const handler = network.get(url.pathname) ?? network.get(url.pathname + url.search);
      return handler ? handler() : new Response("not found", { status: 404, headers: { "content-type": "text/plain" } });
    },
  } as never;
  vm.runInNewContext(SW_SOURCE, sandbox);
}

async function fire(type: string, event: Record<string, unknown> = {}) {
  const waits: Promise<unknown>[] = [];
  let responder: Promise<Response> | undefined;
  handlers[type]({
    ...event,
    respondWith: (p: Promise<Response>) => { responder = Promise.resolve(p); },
    waitUntil: (p: Promise<unknown>) => { waits.push(Promise.resolve(p)); },
  });
  const response = responder ? await responder : undefined;
  await Promise.all(waits);
  return { handled: Boolean(responder), response };
}

const request = (url: string, mode = "navigate", headers: Record<string, string> = {}, method = "GET") => ({ url: new URL(url, ORIGIN).href, method, mode, headers: new Headers(headers) });
const get = (url: string, mode = "navigate", headers: Record<string, string> = {}) => fire("fetch", { request: request(url, mode, headers) });
const text = async (r?: Response) => (r ? r.clone().text() : "");

beforeEach(() => boot());
afterEach(() => vi.useRealTimers());

describe("install and activate", () => {
  it("saves the offline page and takes over immediately", async () => {
    network.set("/offline.html", () => html("<h1>Offline</h1>"));
    await fire("install");
    expect(await text(await cachesMock.api.match(`${ORIGIN}/offline.html`))).toContain("Offline");
    expect((sandbox.self as { skipWaiting: ReturnType<typeof vi.fn> }).skipWaiting).toHaveBeenCalled();
  });

  it("removes old shadecode caches but keeps current ones and unrelated ones", async () => {
    for (const name of ["shadecode-shell-v6", "shadecode-static-v7", "shadecode-pages-v7", "other-app"]) await cachesMock.api.open(name);
    await fire("activate");
    expect([...cachesMock.stores.keys()].sort()).toEqual(["other-app", "shadecode-pages-v7", "shadecode-static-v7"]);
  });
});

describe("page navigation", () => {
  beforeEach(async () => {
    network.set("/offline.html", () => html("<h1>OFFLINE PAGE</h1>"));
    await fire("install");
  });

  it("serves a visited page offline, even with a different query string", async () => {
    network.set("/dashboard", () => html("<h1>Dashboard for Tendai</h1>"));
    expect(await text((await get("/dashboard")).response)).toContain("Dashboard for Tendai");
    offline = true;
    expect(await text((await get("/dashboard")).response)).toContain("Dashboard for Tendai");
    expect(await text((await get("/dashboard?tab=2")).response)).toContain("Dashboard for Tendai");
    expect(await text((await get("/dashboard/")).response)).toContain("Dashboard for Tendai");
  });

  it("shows the offline page, not a crash, for a page that was never saved", async () => {
    offline = true;
    const { response } = await get("/exam-sim");
    expect(await text(response)).toContain("OFFLINE PAGE");
  });

  it("never saves a redirected page (a login screen must not become /dashboard)", async () => {
    network.set("/dashboard", () => html("<h1>Please sign in</h1>", { redirected: true }));
    expect(await text((await get("/dashboard")).response)).toContain("Please sign in");
    offline = true;
    expect(await text((await get("/dashboard")).response)).toContain("OFFLINE PAGE");
  });

  it("does not save errors or non-HTML responses", async () => {
    network.set("/learn", () => html("boom", { status: 500 }));
    network.set("/study", () => html("{}", { type: "application/json" }));
    await get("/learn");
    await get("/study");
    offline = true;
    expect(await text((await get("/learn")).response)).toContain("OFFLINE PAGE");
    expect(await text((await get("/study")).response)).toContain("OFFLINE PAGE");
  });

  it("falls back to the saved page when the network is too slow", async () => {
    network.set("/dashboard", () => html("<h1>Saved dashboard</h1>"));
    await get("/dashboard");
    vi.useFakeTimers();
    network.set("/dashboard", () => new Promise<Response>(() => undefined));
    const pending = get("/dashboard");
    await vi.advanceTimersByTimeAsync(6100);
    expect(await text((await pending).response)).toContain("Saved dashboard");
  });

  it("opens the saved dashboard when the installed app starts at / offline", async () => {
    network.set("/dashboard", () => html("<h1>Saved dashboard</h1>"));
    await get("/dashboard");
    offline = true;
    expect(await text((await get("/")).response)).toContain("Saved dashboard");
  });

  it("shows the offline page for sign-in routes and an unsaved / when offline", async () => {
    offline = true;
    expect(await text((await get("/auth/login")).response)).toContain("OFFLINE PAGE");
    expect(await text((await get("/")).response)).toContain("OFFLINE PAGE");
  });
});

describe("a broken worker must never break the site", () => {
  it("falls through to the network when its own storage throws", async () => {
    network.set("/dashboard", () => html("<h1>Live dashboard</h1>"));
    network.set("/_next/static/chunks/a-1.js", () => new Response("a", { headers: { "content-type": "text/javascript" } }));
    network.set("/learn", () => new Response("flight"));
    (sandbox.caches as { open: unknown }).open = async () => { throw new Error("QuotaExceededError"); };
    expect(await text((await get("/dashboard")).response)).toContain("Live dashboard");
    expect(await text((await get("/_next/static/chunks/a-1.js", "cors")).response)).toBe("a");
    expect(await text((await get("/learn?_rsc=1", "cors", { RSC: "1" })).response)).toBe("flight");
  });
});

describe("what the worker must leave alone", () => {
  it("does not intercept API calls, writes, other origins, auth headers or itself", async () => {
    expect((await get("/api/exam/generate", "cors")).handled).toBe(false);
    expect((await fire("fetch", { request: request("/dashboard", "cors", {}, "POST") })).handled).toBe(false);
    expect((await fire("fetch", { request: { url: "https://supabase.example/rest/v1/x", method: "GET", mode: "cors", headers: new Headers() } })).handled).toBe(false);
    expect((await get("/x.js", "cors", { authorization: "Bearer t" })).handled).toBe(false);
    expect((await get("/sw.js", "cors")).handled).toBe(false);
  });
});

describe("build files and images", () => {
  it("serves hashed build files from the saved copy even when the ?dpl= query differs", async () => {
    network.set("/_next/static/chunks/page-abc.js", () => new Response("console.log(1)", { headers: { "content-type": "text/javascript" } }));
    await get("/_next/static/chunks/page-abc.js?dpl=dpl_111", "cors");
    offline = true;
    const { response } = await get("/_next/static/chunks/page-abc.js?dpl=dpl_222", "cors");
    expect(await text(response)).toContain("console.log(1)");
  });

  it("does not hit the network again for a saved hashed file", async () => {
    network.set("/_next/static/chunks/a-1.js", () => new Response("a", { headers: { "content-type": "text/javascript" } }));
    await get("/_next/static/chunks/a-1.js", "cors");
    fetchCalls.length = 0;
    await get("/_next/static/chunks/a-1.js", "cors");
    expect(fetchCalls).toEqual([]);
  });

  it("keeps images available offline, including optimised ones", async () => {
    network.set("/icons/logo.png", () => new Response("png", { headers: { "content-type": "image/png" } }));
    network.set("/_next/image", () => new Response("img", { headers: { "content-type": "image/webp" } }));
    await get("/icons/logo.png", "no-cors");
    await get("/_next/image?url=%2Fa.png&w=64&q=75", "no-cors");
    offline = true;
    expect(await text((await get("/icons/logo.png", "no-cors")).response)).toBe("png");
    expect(await text((await get("/_next/image?url=%2Fa.png&w=64&q=75", "no-cors")).response)).toBe("img");
  });

  it("returns a network error (not a crash) for a file that was never saved", async () => {
    offline = true;
    const { response } = await get("/_next/static/chunks/never-seen.js", "cors");
    expect(response?.type).toBe("error");
  });
});

describe("in-app navigation (RSC)", () => {
  it("reuses an exact saved payload offline and errors cleanly otherwise so Next does a full page load", async () => {
    network.set("/learn", () => new Response("flight-data", { headers: { "content-type": "text/x-component" } }));
    await get("/learn?_rsc=abc", "cors", { RSC: "1" });
    offline = true;
    expect(await text((await get("/learn?_rsc=abc", "cors", { RSC: "1" })).response)).toBe("flight-data");
    expect((await get("/learn?_rsc=zzz", "cors", { RSC: "1" })).response?.type).toBe("error");
  });
});

describe("saving routes for offline (warm-up)", () => {
  const page = (assets: string) => html(`<html><head>${assets}</head><body>ok</body></html>`, { date: new Date().toUTCString() });

  it("saves pages and every build file they reference, including the RSC chunk lists", async () => {
    network.set("/dashboard", () => page(`<script src="/_next/static/chunks/main-1.js?dpl=d1"></script><link rel="stylesheet" href="/_next/static/css/app-2.css"><script>self.__next_f.push([1,"[\\"1\\",\\"static/chunks/lazy-3.js\\"]"])</script>`));
    network.set("/learn", () => page(`<script src="/_next/static/chunks/main-1.js?dpl=d1"></script><link rel="preload" href="/_next/static/media/font-4.woff2" as="font">`));
    for (const f of ["/_next/static/chunks/main-1.js", "/_next/static/css/app-2.css", "/_next/static/chunks/lazy-3.js", "/_next/static/media/font-4.woff2"]) network.set(f, () => new Response("x", { headers: { "content-type": "text/plain" } }));

    await fire("message", { data: { type: "WARM_ROUTES", routes: ["/dashboard", "/learn"] } });

    offline = true;
    expect(await text((await get("/dashboard")).response)).toContain("ok");
    expect(await text((await get("/learn")).response)).toContain("ok");
    for (const f of ["/_next/static/chunks/main-1.js?dpl=other", "/_next/static/css/app-2.css", "/_next/static/chunks/lazy-3.js", "/_next/static/media/font-4.woff2"]) {
      expect((await get(f, "cors")).response?.type, f).not.toBe("error");
    }
    expect(clientMessages).toEqual([expect.objectContaining({ type: "WARM_DONE", pages: 2, failed: 0 })]);
    expect((clientMessages[0] as { assets: number }).assets).toBe(4);
  });

  it("does not save a route that redirected to sign-in and reports it as failed", async () => {
    network.set("/exam-sim", () => html("<h1>login</h1>", { redirected: true }));
    await fire("message", { data: { type: "WARM_ROUTES", routes: ["/exam-sim"] } });
    offline = true;
    expect(await text((await get("/exam-sim")).response)).not.toContain("login");
    expect(clientMessages[0]).toEqual(expect.objectContaining({ pages: 0, failed: 1 }));
  });

  it("ignores unsafe or irrelevant routes", async () => {
    network.set("/dashboard", () => page(""));
    await fire("message", { data: { type: "WARM_ROUTES", routes: ["//evil.com/x", "https://evil.com", "../etc", "/api/exam/generate", "/auth/login", "/_next/static/x.js", "/", 42, "/dashboard"] } });
    expect(fetchCalls.filter((c) => c !== "/dashboard")).toEqual([]);
    expect(clientMessages[0]).toEqual(expect.objectContaining({ pages: 1 }));
  });

  it("does not refetch a page that was saved recently, but still saves its files", async () => {
    network.set("/dashboard", () => page(`<script src="/_next/static/chunks/m-1.js"></script>`));
    network.set("/_next/static/chunks/m-1.js", () => new Response("x"));
    await fire("message", { data: { type: "WARM_ROUTES", routes: ["/dashboard"] } });
    fetchCalls.length = 0;
    clientMessages.length = 0;
    await fire("message", { data: { type: "WARM_ROUTES", routes: ["/dashboard"] } });
    expect(fetchCalls).toEqual([]);
    expect(clientMessages[0]).toEqual(expect.objectContaining({ pages: 0, skipped: 1 }));
  });

  it("refreshes a saved page once it is old", async () => {
    network.set("/dashboard", () => html("<p>old</p>", { date: new Date(Date.now() - 7 * 3600_000).toUTCString() }));
    await fire("message", { data: { type: "WARM_ROUTES", routes: ["/dashboard"] } });
    network.set("/dashboard", () => page("<p>new</p>"));
    await fire("message", { data: { type: "WARM_ROUTES", routes: ["/dashboard"] } });
    offline = true;
    expect(await text((await get("/dashboard")).response)).toContain("new");
  });

  it("survives the network dropping halfway through", async () => {
    network.set("/dashboard", () => page(`<script src="/_next/static/chunks/m-1.js"></script>`));
    network.set("/_next/static/chunks/m-1.js", () => { offline = true; throw new TypeError("Failed to fetch"); });
    await fire("message", { data: { type: "WARM_ROUTES", routes: ["/dashboard", "/learn"] } });
    expect(clientMessages[0]).toEqual(expect.objectContaining({ type: "WARM_DONE" }));
  });
});

describe("sign-out", () => {
  it("removes saved pages and in-app payloads but keeps build files", async () => {
    network.set("/dashboard", () => html("<h1>Tendai's dashboard</h1>"));
    network.set("/_next/static/chunks/a-1.js", () => new Response("a"));
    await get("/dashboard");
    await get("/_next/static/chunks/a-1.js", "cors");
    network.set("/learn", () => new Response("flight"));
    await get("/learn?_rsc=1", "cors", { RSC: "1" });
    await fire("message", { data: { type: "CLEAR_APP_CACHE" } });
    expect([...cachesMock.stores.keys()]).toEqual(["shadecode-static-v7"]);
    offline = true;
    expect((await get("/_next/static/chunks/a-1.js", "cors")).response?.type).not.toBe("error");
  });
});
