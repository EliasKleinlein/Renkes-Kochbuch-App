/* global self, caches, fetch, URL, Response, console */

const CACHE_PREFIX = "renkes-";
const CACHE_VERSION = "v3";
const SHELL_CACHE = `${CACHE_PREFIX}shell-${CACHE_VERSION}`;
const NEXT_STATIC_CACHE = `${CACHE_PREFIX}next-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}runtime-${CACHE_VERSION}`;

const CURRENT_CACHES = new Set([
  SHELL_CACHE,
  NEXT_STATIC_CACHE,
  RUNTIME_CACHE,
]);

const PRECACHE_URLS = [
  "/",
  "/offline",
  "/chinesische-rezepte",
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

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([caches.open(SHELL_CACHE), caches.open(RUNTIME_CACHE)])
      .then(([shellCache, runtimeCache]) =>
        shellCache
          .addAll(PRECACHE_URLS)
          .then(() => warmImageCache(runtimeCache)),
      )
      .then(() => self.skipWaiting()),
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
      .then(() => self.clients.claim()),
  );
});

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

  try {
    const response = await fetch(request);
    return await putIfCacheable(cache, request, response);
  } catch {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
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
    url.origin !== self.location.origin ||
    (url.pathname === "/api" || url.pathname.startsWith("/api/")) ||
    request.headers.has("Authorization") ||
    hasSensitiveQuery(url) ||
    request.headers.has("Range") ||
    url.pathname.startsWith("/video/")
  ) {
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
