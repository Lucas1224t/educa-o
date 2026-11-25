const CACHE = "educaplay-v3";
const SHELL = ["/index.html", "/admin.html", "/aluno.html", "/professor.html", "/css/estilo.css", "/js/api.js", "/js/app.js",
  "/js/aluno.js", "/js/professor.js", "/js/offline.js", "/js/pwa.js", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin || u.pathname.startsWith("/api/") || u.pathname.startsWith("/.netlify/")) return; // API nunca em cache
  e.respondWith(
    fetch(e.request).then((r) => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)); } return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((m) => m || (e.request.mode === "navigate" ? caches.match("/index.html") : Response.error())))
  );
});
