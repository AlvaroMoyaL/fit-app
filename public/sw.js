self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("fit-app-v1").then((cache) =>
      cache.addAll([
        "/",
        "/index.html",
        "/manifest.webmanifest",
        "/icon-192.svg",
        "/icon-512.svg",
        "/apple-touch-icon.svg",
      ])
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== "fit-app-v1").map((k) => caches.delete(k)))
    )
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
