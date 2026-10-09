// Phase 11: Offline-Videos im Service Worker (node --test, ohne Abhaengigkeiten).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const ORIGIN = "http://localhost:3000";
const VIDEO = "/video/test_video.mp4?v=1";
const BYTES = Uint8Array.from({ length: 100 }, (_, i) => i);

function keyOf(input) {
  const url = new URL(typeof input === "string" ? input : input.url, ORIGIN);
  return url.pathname + url.search;
}

function withUrl(response, url) {
  Object.defineProperty(response, "url", { value: new URL(url, ORIGIN).href });
  return response;
}

function loadServiceWorker({ quota = 10_000, usage = 0, headLength = 100, getBytes = BYTES, offline = false, activeWorker = null } = {}) {
  const listeners = {};
  let skipWaitingCalls = 0;
  let netzAus = offline;
  const stores = new Map();
  const fetchCalls = [];

  const cacheFor = (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name);
    return {
      async match(input) {
        const hit = store.get(keyOf(input));
        return hit ? new Response(hit.blob, { status: hit.status, headers: hit.headers }) : undefined;
      },
      async put(input, response) {
        store.set(keyOf(input), { blob: await response.blob(), status: response.status, headers: new Headers(response.headers) });
      },
      async keys() { return [...store.keys()].map((k) => new Request(ORIGIN + k)); },
      async delete(input) { return store.delete(keyOf(input)); },
      async addAll(paths) {
        for (const path of paths) await this.put(path, await fetchMock(path));
      },
    };
  };

  const fetchMock = async (input, init = {}) => {
    if (netzAus) throw new TypeError("Failed to fetch");
    const key = keyOf(input);
    const method = init.method ?? (typeof input === "string" ? "GET" : input.method);
    fetchCalls.push({ key, method });
    if (!key.includes(".") && !key.startsWith("/api") && !key.startsWith("/video")) {
      const kopf = { "Content-Type": "text/html; charset=utf-8" };
      if (key.startsWith("/recipes/")) kopf["Cache-Control"] = "private, no-cache, no-store, max-age=0, must-revalidate";
      return withUrl(new Response(`<html><script src="/_next/static/chunks/seite${key.replace(/\//g, "-")}.js" async></script><link rel="stylesheet" href="/_next/static/css/app.css"></html>`, { status: 200, headers: kopf }), key);
    }
    if (method === "HEAD") {
      return withUrl(new Response(null, { status: 200, headers: { "Content-Length": String(headLength), "Content-Type": "video/mp4" } }), key);
    }
    return withUrl(new Response(getBytes, { status: 200, headers: { "Content-Type": "video/mp4" } }), key);
  };

  const self = {
    location: { origin: ORIGIN },
    navigator: { storage: { estimate: async () => ({ usage, quota }) } },
    clients: { claim: async () => {} },
    registration: { active: activeWorker },
    skipWaiting: async () => { skipWaitingCalls += 1; },
    addEventListener: (type, fn) => { listeners[type] = fn; },
  };
  const caches = {
    open: async (name) => cacheFor(name),
    keys: async () => [...stores.keys()],
    delete: async (n) => stores.delete(n),
    async match(input) {
      for (const name of stores.keys()) {
        const hit = await cacheFor(name).match(input);
        if (hit) return hit;
      }
      return undefined;
    },
  };
  vm.runInNewContext(readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8"), {
    self, caches, fetch: fetchMock, URL, Response, Request, Headers, Blob, console: { warn() {}, error() {} },
  });

  const mediaStore = () => stores.get("renkes-media-v1") ?? new Map();
  return { listeners, fetchCalls, mediaStore, cacheFor, stores, skipWaitingCalls: () => skipWaitingCalls, setOffline: (aus) => { netzAus = aus; } };
}

function fetchEvent(sw, path, headers = {}, mode) {
  let responsePromise;
  const request = new Request(ORIGIN + path, { headers });
  if (mode) Object.defineProperty(request, "mode", { value: mode });
  sw.listeners.fetch({ request, respondWith: (p) => { responsePromise = p; }, waitUntil() {} });
  return responsePromise;
}

async function message(sw, url) {
  let done = Promise.resolve();
  sw.listeners.message({ data: { type: "CACHE_OFFLINE_MEDIA", url }, waitUntil: (p) => { done = p; } });
  await done;
}

async function cachedSw() {
  const sw = loadServiceWorker();
  await message(sw, VIDEO);
  return sw;
}

test("Laden auf Anforderung: genug Speicher -> Video vollstaendig im Media-Cache", async () => {
  const sw = await cachedSw();
  assert.equal(sw.mediaStore().get(VIDEO).blob.size, 100);
});

test("Laden auf Anforderung: zu wenig Speicher -> nichts gecacht", async () => {
  const sw = loadServiceWorker({ quota: 149, usage: 0 });
  await message(sw, VIDEO);
  assert.equal(sw.mediaStore().size, 0);
});

test("Laden auf Anforderung: nicht freigegebene URL -> ignoriert, kein Netzaufruf", async () => {
  const sw = loadServiceWorker();
  await message(sw, "/video/anderes.mp4");
  assert.equal(sw.fetchCalls.length, 0);
});

test("Laden auf Anforderung: unvollstaendiger Download -> nichts gecacht", async () => {
  const sw = loadServiceWorker({ headLength: 120 });
  await message(sw, VIDEO);
  assert.equal(sw.mediaStore().size, 0);
});

test("Range ohne Cache -> Weitergabe ans Netz", async () => {
  const sw = loadServiceWorker();
  await fetchEvent(sw, VIDEO, { Range: "bytes=0-9" });
  assert.deepEqual(sw.fetchCalls.at(-1), { key: VIDEO, method: "GET" });
});

for (const [range, start, end] of [["bytes=10-19", 10, 19], ["bytes=90-", 90, 99], ["bytes=-5", 95, 99], ["bytes=0-999", 0, 99]]) {
  test(`Range aus Cache ${range} -> 206 bytes ${start}-${end}/100`, async () => {
    const sw = await cachedSw();
    const response = await fetchEvent(sw, VIDEO, { Range: range });
    assert.equal(response.status, 206);
    assert.equal(response.headers.get("Content-Range"), `bytes ${start}-${end}/100`);
    assert.equal(response.headers.get("Content-Length"), String(end - start + 1));
    assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [...BYTES.slice(start, end + 1)]);
  });
}

test("Range ausserhalb der Datei -> 416 mit bytes */100", async () => {
  const sw = await cachedSw();
  const response = await fetchEvent(sw, VIDEO, { Range: "bytes=100-" });
  assert.equal(response.status, 416);
  assert.equal(response.headers.get("Content-Range"), "bytes */100");
});

test("Ohne Range aus Cache -> 200 mit voller Datei", async () => {
  const sw = await cachedSw();
  const response = await fetchEvent(sw, VIDEO);
  assert.equal(response.status, 200);
  assert.equal((await response.arrayBuffer()).byteLength, 100);
});

test("Ausschluesse bleiben: anderes Video, API und Range auf Bild -> kein respondWith", () => {
  const sw = loadServiceWorker();
  assert.equal(fetchEvent(sw, "/video/anderes.mp4", { Range: "bytes=0-9" }), undefined);
  assert.equal(fetchEvent(sw, "/api/recipes/sync"), undefined);
  assert.equal(fetchEvent(sw, "/images/fantasy-page-backdrop.webp", { Range: "bytes=0-9" }), undefined);
});

test("Aktivieren entfernt nicht freigegebene Medien, behaelt freigegebene", async () => {
  const sw = await cachedSw();
  await sw.cacheFor("renkes-media-v1").put("/video/alt.mp4?v=0", new Response(new Uint8Array(3)));
  let done;
  sw.listeners.activate({ waitUntil: (p) => { done = p; } });
  await done;
  assert.deepEqual([...sw.mediaStore().keys()], [VIDEO]);
});

test("Phase 12: Navigation mit Token online -> Netzantwort, nichts gecacht", async () => {
  const sw = loadServiceWorker();
  const response = await fetchEvent(sw, "/danke-renke/eintrag/elias?token=abc", {}, "navigate");
  assert.equal(response.status, 200);
  assert.deepEqual(sw.fetchCalls.at(-1), { key: "/danke-renke/eintrag/elias?token=abc", method: "GET" });
  for (const name of ["renkes-runtime-v3", "renkes-shell-v3"]) {
    assert.equal((await sw.cacheFor(name).keys()).length, 0);
  }
});

test("Phase 12: Navigation mit Token offline -> Offlineseite statt Browserfehler", async () => {
  const sw = loadServiceWorker({ offline: true });
  await sw.cacheFor("renkes-shell-v3").put("/offline", new Response("OFFLINESEITE"));
  const response = await fetchEvent(sw, "/danke-renke/eintrag/elias?token=abc", {}, "navigate");
  assert.equal(await response.text(), "OFFLINESEITE");
});

test("Phase 12: Nicht-Navigation mit Token bleibt unangetastet", () => {
  const sw = loadServiceWorker();
  assert.equal(fetchEvent(sw, "/irgendwas?token=abc"), undefined);
});

async function install(sw) {
  let done;
  sw.listeners.install({ waitUntil: (p) => { done = p; } });
  await done;
}

test("Phase 14: Erstinstallation ohne aktive Version -> skipWaiting", async () => {
  const sw = loadServiceWorker();
  await install(sw);
  assert.equal(sw.skipWaitingCalls(), 1);
});

test("Phase 14: Update mit aktiver Version -> wartet (kein skipWaiting)", async () => {
  const sw = loadServiceWorker({ activeWorker: {} });
  await install(sw);
  assert.equal(sw.skipWaitingCalls(), 0);
});

test("Phase 14: Nachricht SKIP_WAITING -> skipWaiting", async () => {
  const sw = loadServiceWorker({ activeWorker: {} });
  let done;
  sw.listeners.message({ data: { type: "SKIP_WAITING" }, waitUntil: (p) => { done = p; } });
  await done;
  assert.equal(sw.skipWaitingCalls(), 1);
});

test("Phase 14: andere Nachricht -> kein skipWaiting", async () => {
  const sw = loadServiceWorker({ activeWorker: {} });
  sw.listeners.message({ data: { type: "IRGENDWAS" }, waitUntil() {} });
  assert.equal(sw.skipWaitingCalls(), 0);
});

test("Phase 14: Installation speichert JS/CSS der Shell-Seiten mit", async () => {
  const sw = loadServiceWorker();
  await install(sw);
  const statisch = [...(sw.stores.get("renkes-next-static-v3") ?? new Map()).keys()];
  for (const datei of ["/_next/static/chunks/seite-.js", "/_next/static/chunks/seite-stickers.js", "/_next/static/chunks/seite-danke-renke.js", "/_next/static/css/app.css"]) {
    assert.ok(statisch.includes(datei), `${datei} fehlt in ${statisch.join(", ")}`);
  }
});

test("Phase 14: Bild aus aelterer Cache-Version wird uebernommen, nicht neu geladen", async () => {
  const sw = loadServiceWorker({ activeWorker: {} });
  const bild = "/images/fantasy-page-backdrop.webp";
  await sw.cacheFor("renkes-runtime-v2").put(bild, new Response(new Uint8Array(7)));
  await install(sw);
  assert.ok(await sw.cacheFor("renkes-runtime-v3").match(bild));
  assert.equal(sw.fetchCalls.filter((c) => c.key === bild).length, 0);
});

test("Phase 14: Bild ohne Vorgaenger wird aus dem Netz geladen", async () => {
  const sw = loadServiceWorker();
  await install(sw);
  assert.equal(sw.fetchCalls.filter((c) => c.key === "/images/fantasy-page-backdrop.webp").length, 1);
});

async function sendMessage(sw, data) {
  let done = Promise.resolve();
  sw.listeners.message({ data, waitUntil: (p) => { done = p; } });
  await done;
}

const pagesKeys = (sw) => [...(sw.stores.get("renkes-pages-v3") ?? new Map()).keys()];

test("Phase 16: CACHE_DETAIL_PAGES speichert Detailseiten samt Seiten-Code", async () => {
  const sw = loadServiceWorker({ quota: 10_000_000 });
  await sendMessage(sw, { type: "CACHE_DETAIL_PAGES", paths: ["/recipes/12", "/recipes/13"] });
  assert.deepEqual(pagesKeys(sw).sort(), ["/recipes/12", "/recipes/13"]);
  const statisch = [...(sw.stores.get("renkes-next-static-v3") ?? new Map()).keys()];
  assert.ok(statisch.includes("/_next/static/chunks/seite-recipes-12.js"));
});

test("Phase 16: ungueltige Pfade werden ignoriert (kein Netzaufruf)", async () => {
  const sw = loadServiceWorker();
  await sendMessage(sw, { type: "CACHE_DETAIL_PAGES", paths: ["/api/thanks", "/recipes/12?x=1", "/recipes/../geheim", 42, "/recipes/"] });
  assert.equal(sw.fetchCalls.length, 0);
  assert.equal(pagesKeys(sw).length, 0);
});

test("Phase 16: zu wenig Speicher -> keine Detailseiten", async () => {
  const sw = loadServiceWorker({ quota: 1000, usage: 0 });
  await sendMessage(sw, { type: "CACHE_DETAIL_PAGES", paths: ["/recipes/12"] });
  assert.equal(pagesKeys(sw).length, 0);
});

test("Phase 16: Online-Besuch speichert Detailseite trotz no-store, offline wird sie daraus bedient", async () => {
  const sw = loadServiceWorker();
  const online = await fetchEvent(sw, "/recipes/12", {}, "navigate");
  assert.equal(online.status, 200);
  assert.deepEqual(pagesKeys(sw), ["/recipes/12"]);
  assert.equal((await sw.cacheFor("renkes-runtime-v3").keys()).length, 0, "no-store-Antwort darf nicht im Runtime-Cache landen");
  sw.setOffline(true);
  const offline = await fetchEvent(sw, "/recipes/12", {}, "navigate");
  assert.match(await offline.text(), /seite-recipes-12/);
});

test("Phase 16: nie gespeicherte Detailseite offline -> Offlineseite", async () => {
  const sw = loadServiceWorker({ offline: true });
  await sw.cacheFor("renkes-shell-v3").put("/offline", new Response("OFFLINESEITE"));
  const response = await fetchEvent(sw, "/recipes/99", {}, "navigate");
  assert.equal(await response.text(), "OFFLINESEITE");
});

test("Phase 16: Aktivieren leert den Detailseiten-Cache", async () => {
  const sw = loadServiceWorker({ quota: 10_000_000 });
  await sendMessage(sw, { type: "CACHE_DETAIL_PAGES", paths: ["/recipes/12"] });
  assert.deepEqual(pagesKeys(sw), ["/recipes/12"], "vorher muss die Seite gespeichert sein");
  let done;
  sw.listeners.activate({ waitUntil: (p) => { done = p; } });
  await done;
  assert.equal(pagesKeys(sw).length, 0);
});
