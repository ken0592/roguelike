const CACHE_NAME = "foxbound-v20";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=pwa20",
  "./app.js?v=pwa20",
  "./manifest.webmanifest?v=pwa20",
  "./assets/pwa/icon-180.png",
  "./assets/pwa/icon-192.png",
  "./assets/pwa/icon-512.png",
  "./assets/town/foxbound-spire-hub-v1.jpg?v=pwa20",
  "./assets/tokens/foxbound-characters-v3.png?v=pwa11",
  "./assets/tokens/foxbound-items-v2.png?v=pwa11",
  "./assets/kenney-roguelike-rpg-pack/Spritesheet/roguelikeSheet_transparent.png",
  "./assets/foxbound-codex-v1/runtime-manifest.json?v=pwa20",
  "./assets/foxbound-codex-v1/assets/heroes/kohaku/spritesheet.png?v=pwa20",
  "./assets/foxbound-codex-v1/assets/heroes/regulus/spritesheet.png?v=pwa20",
  "./assets/foxbound-codex-v1/assets/heroes/mira/spritesheet.png?v=pwa20",
  "./assets/relics/foxbound-relic-icons-v1/relic-icons-common-v1.png?v=pwa20",
  "./assets/data/foxbound-relic-designs-v1.json",
  "./assets/data/foxbound-move-designs-v1.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html")),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
