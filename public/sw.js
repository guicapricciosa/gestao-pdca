/* Service worker: application shell only.
 *
 * Policy (docs/pwa.md):
 *  - precache: the offline page, the manifest and the icons;
 *  - /_next/static/*: cache-first (hashed, immutable, never personal);
 *  - navigations: network only; when the network fails, show /offline;
 *  - everything else (RSC payloads, Server Actions, Supabase, uploads):
 *    never cached, never intercepted.
 * Protected business data therefore never lands in Cache Storage.
 */
const VERSION = "v1";
const SHELL_CACHE = `shell-${VERSION}`;
const STATIC_CACHE = `static-${VERSION}`;
const SHELL = [
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => undefined),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== STATIC_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("/offline").then((cached) => cached ?? Response.error()),
      ),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(request).then(
          (cached) =>
            cached ??
            fetch(request).then((response) => {
              if (response.ok) cache.put(request, response.clone());
              return response;
            }),
        ),
      ),
    );
    return;
  }

  if (SHELL.includes(url.pathname)) {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then((cached) => cached ?? Response.error()),
      ),
    );
  }
  // Anything else goes straight to the network and is never stored.
});
