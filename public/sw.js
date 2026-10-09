/* global self, caches, fetch, URL, Response, console */

const CACHE_PREFIX = "renkes-";
const CACHE_VERSION = "v3";
const SHELL_CACHE = `${CACHE_PREFIX}shell-${CACHE_VERSION}`;
const NEXT_STATIC_CACHE = `${CACHE_PREFIX}next-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}runtime-${CACHE_VERSION}`;
// Eigene Version fuer grosse Medien: ein Wechsel von CACHE_VERSION laedt Videos nicht neu.
const MEDIA_CACHE = `${CACHE_PREFIX}media-v1`;
// Rezept-Detailseiten (dynamische Route, von Next mit no-store ausgeliefert). Ihr HTML enthaelt nur
// die URL-ID; die Daten kommen aus IndexedDB. Bei jeder Aktivierung geleert, damit Seiten und Code passen.
const PAGES_CACHE = `${CACHE_PREFIX}pages-${CACHE_VERSION}`;
const DETAIL_PATH = /^\/recipes\/[A-Za-z0-9_-]{1,40}$/;
const DETAIL_PRECACHE_LIMIT = 500;
const DETAIL_PAGE_BUDGET_BYTES = 200 * 1024;

const CURRENT_CACHES = new Set([
  SHELL_CACHE,
  NEXT_STATIC_CACHE,
  RUNTIME_CACHE,
  MEDIA_CACHE,
  PAGES_CACHE,
]);

// Videos, die nach einem Online-Besuch der Seite offline verfuegbar werden (exakte URL inkl. Query).
const OFFLINE_MEDIA_URLS = ["/video/test_video.mp4?v=1"];
// Mindestens so viel freier Speicher (Vielfaches der Videogroesse) muss vor dem Laden frei sein.
const MEDIA_QUOTA_FACTOR = 1.5;

const PRECACHE_URLS = [
  "/",
  "/offline",
  "/chinesische-rezepte",
  "/stickers",
  "/danke-renke",
  "/add",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

const CORE_UI_IMAGE_URLS = [
  "/images/fantasy-page-backdrop.webp",
  "/images/header-renkes-kochbuch.webp",
  "/images/header-home-sign.webp",
  "/images/storytime-sticker-button.webp",
  "/images/recipes-hanging-button.webp",
  "/images/chinese-recipes-button.webp",
  "/images/hero/renkes-kochbuch-container-neu-final.png",
  "/images/ui/kuechenmeister-schild.png",
  "/images/kitchen-masters/renke-portal-transparent.png",
  "/images/kitchen-masters/walter-portal-v2.webp",
  "/images/kitchen-masters/malte-portal-transparent.webp",
  "/images/kitchen-masters/meister-brixel-transparent.webp",
  "/images/ui/renkes-beliebteste-rezepte.png",
  "/images/CHR.webp",
  "/images/magietrank-kessel-button.webp",
  "/images/recipe-parchment.webp",
  "/images/renke-tip-sticker.webp",
  "/images/walter-tip-sticker.webp",
  "/images/malte-tip-sticker.webp",
  "/images/kitchen-masters/christophus.webp",
  "/images/chinese-recipes-hero-landscape-v2.webp",
];

const RECIPE_IMAGE_URLS = [
  "/images/recipes/404-kekse-not-found.webp",
  "/images/recipes/apfel-crumble-recursive-crunch.webp",
  "/images/recipes/apfel-zimt-tarte-sweet-commit.webp",
  "/images/recipes/bauernbrot-long-term-support.webp",
  "/images/recipes/bauernbrot-stable-branch.webp",
  "/images/recipes/beef-broccoli-clean-architecture.webp",
  "/images/recipes/brezel-infinite-loop.webp",
  "/images/recipes/brownies-runtime-error.webp",
  "/images/recipes/burger-boolean-beast.webp",
  "/images/recipes/caesar-clean-interface.webp",
  "/images/recipes/char-siu-red-build.webp",
  "/images/recipes/ciabatta-async-fermentation.webp",
  "/images/recipes/cordon-bleu-wrapper-function.webp",
  "/images/recipes/couscous-lazy-load.webp",
  "/images/recipes/curry-commit-crash.webp",
  "/images/recipes/dan-dan-noodles-dependency-injection.webp",
  "/images/recipes/focaccia-olive-commit.webp",
  "/images/recipes/fried-rice-async-queue.webp",
  "/images/recipes/fruehlingsrollen-lazy-loading.webp",
  "/images/recipes/garnelenpfanne-hotfix.webp",
  "/images/recipes/gebratene-eiernudeln-merge-request.webp",
  "/images/recipes/gemuese-lasagne-green-merge.webp",
  "/images/recipes/griechischer-salat-stable-api.webp",
  "/images/recipes/gurkensalat-cool-runtime.webp",
  "/images/recipes/kabeljau-clean-code-kruste.webp",
  "/images/recipes/kaese-schinken-hoernchen-wrapped-component.webp",
  "/images/recipes/kaesebroetchen-hot-reload.webp",
  "/images/recipes/kaesekuchen-golden-release.webp",
  "/images/recipes/kaesekuchen-stable-release.webp",
  "/images/recipes/kartoffelgratin-layered-stack.webp",
  "/images/recipes/kartoffelsalat-legacy-refactor.webp",
  "/images/recipes/kartoffelsuppe-stack-overflow.webp",
  "/images/recipes/kichererbsen-curry-open-source.webp",
  "/images/recipes/kichererbsen-dependency-mix.webp",
  "/images/recipes/knoblauch-baguette-garlic-patch.webp",
  "/images/recipes/knoblauchbrot-pull-request.webp",
  "/images/recipes/kraeuter-focaccia-syntax-garden.webp",
  "/images/recipes/kung-pao-event-loop.webp",
  "/images/recipes/lachs-stream-buffer.webp",
  "/images/recipes/lasagne-merge-conflict.webp",
  "/images/recipes/laugenbroetchen-backend-batch.webp",
  "/images/recipes/linseneintopf-legacy-code.webp",
  "/images/recipes/mapo-tofu-hot-module-reload.webp",
  "/images/recipes/mousse-au-chocolat-dark-theme.webp",
  "/images/recipes/mujus-cannabis-brownies.webp",
  "/images/recipes/ofengemuese-clean-architecture.webp",
  "/images/recipes/pancakes-promise-all.webp",
  "/images/recipes/pasta-pesto-fresh-commit.webp",
  "/images/recipes/pilzpfanne-bugfix-rahm.webp",
  "/images/recipes/pilzrisotto-async-await.webp",
  "/images/recipes/pizza-bianca-white-theme.webp",
  "/images/recipes/quinoa-avocado-green-build.webp",
  "/images/recipes/rinderrouladen-nested-loop.webp",
  "/images/recipes/roggenbrot-stable-branch.webp",
  "/images/recipes/rote-bete-feta-red-branch.webp",
  "/images/recipes/schokokuchen-dark-mode.webp",
  "/images/recipes/schweinebraten-server-load.webp",
  "/images/recipes/schweinehaxe-404.webp",
  "/images/recipes/spaghetti-debugger.webp",
  "/images/recipes/sweet-sour-pork-boolean-balance.webp",
  "/images/recipes/tiramisu-layer-stack.webp",
  "/images/recipes/vollkornbroetchen-production-build.webp",
  "/images/recipes/wontons-wrapped-component.webp",
  "/images/recipes/wraps-while-schleife.webp",
  "/images/recipes/ziegenkaese-sweet-sour-merge.webp",
  "/images/recipes/zitronenkuchen-fresh-release.webp",
  "/images/recipes/zwiebelbrot-compile-kruste.webp",
  "/images/recipes/zwiebelbrot-layered-architecture.webp",
];

const CHINESE_RECIPE_IMAGE_URLS = [
  "/images/chinese-recipes/01-schweinefleisch-mit-mu-err-pilzen.webp",
  "/images/chinese-recipes/02-schweinefleisch-mit-gurke.webp",
  "/images/chinese-recipes/03-trocken-gebratene-bittermelone.webp",
  "/images/chinese-recipes/04-suess-sauer-geschmorter-chinakohl.webp",
  "/images/chinese-recipes/05-mapo-tofu.webp",
  "/images/chinese-recipes/06-trocken-gebratene-gruene-bohnen.webp",
  "/images/chinese-recipes/07-fisch-mit-eingelegtem-gemuese.webp",
  "/images/chinese-recipes/08-eichhoernchen-fisch.webp",
  "/images/chinese-recipes/09-scharfer-chili-fisch.webp",
  "/images/chinese-recipes/10-seegurke-nach-hausfrauenart.webp",
  "/images/chinese-recipes/11-rot-geschmorter-silberkarpfen.webp",
  "/images/chinese-recipes/12-fischkopf-im-tontopf.webp",
  "/images/chinese-recipes/13-jade-garnelen.webp",
  "/images/chinese-recipes/14-fuenf-gewuerze-aal.webp",
  "/images/chinese-recipes/15-aalstreifen-mit-gruenem-paprika.webp",
  "/images/chinese-recipes/16-knusprig-gebratene-garnelen.webp",
  "/images/chinese-recipes/17-garnelen-mit-tomate.webp",
  "/images/chinese-recipes/18-hell-geschmorte-garnelen.webp",
  "/images/chinese-recipes/19-gedaempfter-silberkarpfen.webp",
  "/images/chinese-recipes/20-fisch-mit-chili-bohnenpaste-nach-hausfrauenart.webp",
];

const IMAGE_WARMUP_URLS = [
  ...CORE_UI_IMAGE_URLS,
  ...RECIPE_IMAGE_URLS,
  ...CHINESE_RECIPE_IMAGE_URLS,
];
const IMAGE_WARMUP_BATCH_SIZE = 6;

async function warmImageCache(cache) {
  for (
    let index = 0;
    index < IMAGE_WARMUP_URLS.length;
    index += IMAGE_WARMUP_BATCH_SIZE
  ) {
    const batch = IMAGE_WARMUP_URLS.slice(
      index,
      index + IMAGE_WARMUP_BATCH_SIZE,
    );
    const results = await Promise.allSettled(
      batch.map(async (path) => {
        if (await cache.match(path)) {
          return;
        }

        const existing = await caches.match(path);
        if (existing) {
          await cache.put(path, existing);
          return;
        }

        const response = await fetch(path, { cache: "no-store" });

        if (!canCache(response)) {
          throw new Error(`HTTP ${response.status}`);
        }

        await cache.put(path, response.clone());
      }),
    );

    results.forEach((result, resultIndex) => {
      if (result.status === "rejected") {
        console.warn(
          `[renkes-sw] Bild-Warmup fehlgeschlagen: ${batch[resultIndex]}`,
          result.reason,
        );
      }
    });
  }
}

const PAGE_URLS = PRECACHE_URLS.filter(
  (path) => !path.includes(".") && path !== "/manifest.webmanifest",
);
const NEXT_ASSET_PATTERN = /(?:src|href)="(\/_next\/static\/[^"?#]+\.(?:js|css))"/g;

function collectNextAssets(html, assets) {
  for (const match of html.matchAll(NEXT_ASSET_PATTERN)) {
    assets.add(match[1]);
  }
  return assets;
}

// Liest die vorab gespeicherten Seiten und speichert deren /_next/static-Dateien mit,
// damit auch nie besuchte Seiten offline vollstaendig laufen und Code und Seiten zusammenpassen.
async function precachePageAssets(shellCache) {
  const assets = new Set();

  for (const path of PAGE_URLS) {
    const response = await shellCache.match(path);
    if (!response) {
      continue;
    }
    collectNextAssets(await response.text(), assets);
  }

  await cacheNextAssets(assets);
}

async function cacheNextAssets(assets) {
  const staticCache = await caches.open(NEXT_STATIC_CACHE);
  const results = await Promise.allSettled(
    [...assets].map(async (path) => {
      if (await staticCache.match(path)) {
        return;
      }
      const response = await fetch(path);
      if (!canCache(response)) {
        throw new Error(`HTTP ${response.status}`);
      }
      await staticCache.put(path, response);
    }),
  );

  results.forEach((result) => {
    if (result.status === "rejected") {
      console.warn("[renkes-sw] Seiten-Datei nicht gespeichert", result.reason);
    }
  });
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([caches.open(SHELL_CACHE), caches.open(RUNTIME_CACHE)])
      .then(([shellCache, runtimeCache]) =>
        shellCache
          .addAll(PRECACHE_URLS)
          .then(() => precachePageAssets(shellCache))
          .then(() => warmImageCache(runtimeCache)),
      )
      .then(() => {
        // Erste Installation uebernimmt sofort; Updates warten auf die Zustimmung der Seite.
        if (!self.registration.active) {
          return self.skipWaiting();
        }
        return undefined;
      }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                cacheName.startsWith(CACHE_PREFIX) &&
                !CURRENT_CACHES.has(cacheName),
            )
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => caches.delete(PAGES_CACHE))
      .then(() => removeUnlistedMedia())
      .then(() => self.clients.claim()),
  );
});

function mediaKey(url) {
  return url.pathname + url.search;
}

async function removeUnlistedMedia() {
  const cache = await caches.open(MEDIA_CACHE);
  const requests = await cache.keys();
  await Promise.all(
    requests
      .filter((request) => !OFFLINE_MEDIA_URLS.includes(mediaKey(new URL(request.url))))
      .map((request) => cache.delete(request)),
  );
}

async function hasRoomFor(bytes) {
  if (!self.navigator?.storage?.estimate) {
    return true;
  }

  const { usage = 0, quota = 0 } = await self.navigator.storage.estimate();
  return quota - usage >= bytes * MEDIA_QUOTA_FACTOR;
}

async function cacheOfflineMedia(key) {
  const cache = await caches.open(MEDIA_CACHE);

  if (await cache.match(key)) {
    return;
  }

  const head = await fetch(key, { method: "HEAD", cache: "no-store" });
  const expectedSize = Number(head.headers.get("Content-Length"));

  if (!head.ok || !Number.isFinite(expectedSize) || expectedSize <= 0) {
    console.warn(`[renkes-sw] Video-Groesse unbekannt, nicht gecacht: ${key}`);
    return;
  }

  if (!(await hasRoomFor(expectedSize))) {
    console.warn(`[renkes-sw] Zu wenig Speicher fuer Offline-Video: ${key}`);
    return;
  }

  const response = await fetch(key, { cache: "no-store" });

  if (response.status !== 200 || !canCache(response)) {
    console.warn(`[renkes-sw] Video nicht vollstaendig geladen (HTTP ${response.status}): ${key}`);
    return;
  }

  const blob = await response.blob();

  if (blob.size !== expectedSize) {
    console.warn(`[renkes-sw] Video unvollstaendig (${blob.size}/${expectedSize} Bytes): ${key}`);
    return;
  }

  await cache.put(
    key,
    new Response(blob, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? "video/mp4",
        "Content-Length": String(blob.size),
        "Accept-Ranges": "bytes",
      },
    }),
  );
}

self.addEventListener("message", (event) => {
  const data = event.data;

  if (data?.type === "SKIP_WAITING") {
    event.waitUntil(self.skipWaiting());
    return;
  }

  if (data?.type === "CACHE_DETAIL_PAGES") {
    const paths = Array.isArray(data.paths)
      ? data.paths
          .filter((path) => typeof path === "string" && DETAIL_PATH.test(path))
          .slice(0, DETAIL_PRECACHE_LIMIT)
      : [];
    if (paths.length > 0) {
      event.waitUntil(
        precacheDetailPages(paths).catch((error) =>
          console.warn("[renkes-sw] Detailseiten nicht gespeichert", error),
        ),
      );
    }
    return;
  }

  if (data?.type !== "CACHE_OFFLINE_MEDIA" || typeof data.url !== "string") {
    return;
  }

  const url = new URL(data.url, self.location.origin);
  const key = mediaKey(url);

  if (url.origin !== self.location.origin || !OFFLINE_MEDIA_URLS.includes(key)) {
    return;
  }

  event.waitUntil(
    cacheOfflineMedia(key).catch((error) =>
      console.warn(`[renkes-sw] Offline-Video fehlgeschlagen: ${key}`, error),
    ),
  );
});

function rangeNotSatisfiable(size) {
  return new Response(null, {
    status: 416,
    headers: { "Content-Range": `bytes */${size}` },
  });
}

// Beantwortet genau einen Byte-Bereich aus der vollstaendig gecachten Datei.
async function respondFromCachedMedia(request, cachedResponse) {
  const rangeHeader = request.headers.get("Range");

  if (!rangeHeader) {
    return cachedResponse;
  }

  const blob = await cachedResponse.blob();
  const size = blob.size;
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());

  if (!match || (match[1] === "" && match[2] === "")) {
    return new Response(blob, { status: 200, headers: cachedResponse.headers });
  }

  let start;
  let end;

  if (match[1] === "") {
    const suffixLength = Number(match[2]);
    if (suffixLength === 0) {
      return rangeNotSatisfiable(size);
    }
    start = Math.max(size - suffixLength, 0);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);
  }

  if (start >= size || start > end) {
    return rangeNotSatisfiable(size);
  }

  return new Response(blob.slice(start, end + 1), {
    status: 206,
    headers: {
      "Content-Type": cachedResponse.headers.get("Content-Type") ?? "video/mp4",
      "Content-Length": String(end - start + 1),
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Accept-Ranges": "bytes",
    },
  });
}

async function offlineMediaOrNetwork(request, key) {
  const cache = await caches.open(MEDIA_CACHE);
  const cachedResponse = await cache.match(key);

  if (cachedResponse) {
    return respondFromCachedMedia(request, cachedResponse);
  }

  return fetch(request);
}

function hasSensitiveQuery(url) {
  return Array.from(url.searchParams.keys()).some((name) =>
    name.toLowerCase().includes("token"),
  );
}

function canCache(response) {
  if (
    !response.ok ||
    !response.url ||
    new URL(response.url).origin !== self.location.origin
  ) {
    return false;
  }

  const cacheControl = response.headers.get("Cache-Control") ?? "";
  return !/\b(?:no-store|private)\b/i.test(cacheControl);
}

async function putIfCacheable(cache, request, response) {
  if (canCache(response)) {
    await cache.put(request, response.clone());
  }

  return response;
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const url = new URL(request.url);
  const detail = isDetailPage(url);

  try {
    const response = await fetch(request);
    if (detail) {
      await storeDetailPage(url.pathname, response.clone()).catch(() => undefined);
    }
    return await putIfCacheable(cache, request, response);
  } catch {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    if (detail) {
      const pagesCache = await caches.open(PAGES_CACHE);
      const cachedDetail = await pagesCache.match(url.pathname);
      if (cachedDetail) {
        return cachedDetail;
      }
    }

    const shellCache = await caches.open(SHELL_CACHE);
    return (
      (await shellCache.match(request)) ??
      (await shellCache.match("/offline")) ??
      new Response("Diese Seite ist offline noch nicht verfügbar.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }
}

function isDetailPage(url) {
  return url.origin === self.location.origin && !url.search && DETAIL_PATH.test(url.pathname);
}

async function storeDetailPage(path, response) {
  const contentType = response.headers.get("Content-Type") ?? "";
  if (!response.ok || !contentType.includes("text/html")) {
    return;
  }
  const html = await response.text();
  const cache = await caches.open(PAGES_CACHE);
  await cache.put(path, new Response(html, { status: 200, headers: { "Content-Type": contentType } }));
  await cacheNextAssets(collectNextAssets(html, new Set()));
}

async function precacheDetailPages(paths) {
  if (!(await hasRoomFor(paths.length * DETAIL_PAGE_BUDGET_BYTES))) {
    console.warn("[renkes-sw] Zu wenig Speicher fuer Rezept-Detailseiten");
    return;
  }

  const cache = await caches.open(PAGES_CACHE);
  for (let index = 0; index < paths.length; index += IMAGE_WARMUP_BATCH_SIZE) {
    const batch = paths.slice(index, index + IMAGE_WARMUP_BATCH_SIZE);
    await Promise.allSettled(
      batch.map(async (path) => {
        if (await cache.match(path)) {
          return;
        }
        const response = await fetch(path, { cache: "no-store" });
        if (new URL(response.url || path, self.location.origin).origin !== self.location.origin) {
          return;
        }
        await storeDetailPage(path, response);
      }),
    );
  }
}

// Navigationen mit Token (persoenliche Links) nie cachen; ohne Netz klar die Offlineseite zeigen.
async function networkOnlyNavigation(request) {
  try {
    return await fetch(request);
  } catch {
    const shellCache = await caches.open(SHELL_CACHE);
    return (
      (await shellCache.match("/offline")) ??
      new Response("Diese Seite ist offline nicht verfügbar.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(NEXT_STATIC_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const response = await fetch(request);
  return putIfCacheable(cache, request, response);
}

async function shellCacheFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const response = await fetch(request);
  return putIfCacheable(cache, request, response);
}

async function fetchAndUpdateRuntimeCache(cache, request) {
  const response = await fetch(request);
  return putIfCacheable(cache, request, response);
}

async function staleWhileRevalidate(event) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await cache.match(event.request);

  if (cachedResponse) {
    event.waitUntil(
      fetchAndUpdateRuntimeCache(cache, event.request).catch(() => undefined),
    );
    return cachedResponse;
  }

  return fetchAndUpdateRuntimeCache(cache, event.request);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (
    request.mode === "navigate" &&
    url.origin === self.location.origin &&
    hasSensitiveQuery(url)
  ) {
    event.respondWith(networkOnlyNavigation(request));
    return;
  }

  if (
    url.origin !== self.location.origin ||
    (url.pathname === "/api" || url.pathname.startsWith("/api/")) ||
    request.headers.has("Authorization") ||
    hasSensitiveQuery(url)
  ) {
    return;
  }

  if (OFFLINE_MEDIA_URLS.includes(mediaKey(url))) {
    event.respondWith(offlineMediaOrNetwork(request, mediaKey(url)));
    return;
  }

  if (request.headers.has("Range") || url.pathname.startsWith("/video/")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (!url.search && PRECACHE_URLS.includes(url.pathname)) {
    event.respondWith(shellCacheFirst(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (
    url.pathname.startsWith("/images/") ||
    url.pathname === "/_next/image"
  ) {
    event.respondWith(staleWhileRevalidate(event));
  }
});
