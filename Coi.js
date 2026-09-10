/* ------------------------------------------------------------------
   coi.js — cross-origin isolation for a static host.

   Multithreaded ffmpeg needs SharedArrayBuffer, and browsers only hand
   that out when the page is served with two headers GitHub Pages will
   not set for you. A service worker sits between the page and the
   network and adds them to every response, which is enough.

   Nothing here touches your content. If the worker cannot register,
   the studio falls back to the single-threaded engine on its own.
   ------------------------------------------------------------------ */
if (typeof window === "undefined") {
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

  self.addEventListener("message", e => {
    if (e.data && e.data.type === "deregister") {
      self.registration.unregister().then(() =>
        self.clients.matchAll().then(cs => cs.forEach(c => c.navigate(c.url))));
    }
  });

  self.addEventListener("fetch", function (event) {
    const r = event.request;
    if (r.cache === "only-if-cached" && r.mode !== "same-origin") return;

    event.respondWith(
      fetch(r)
        .then(function (response) {
          if (response.status === 0) return response;
          const headers = new Headers(response.headers);
          headers.set("Cross-Origin-Embedder-Policy", "require-corp");
          headers.set("Cross-Origin-Opener-Policy", "same-origin");
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: headers
          });
        })
        .catch(function (e) { return new Response(String(e.message || e), { status: 500 }); })
    );
  });

} else {
  (function () {
    if (window.crossOriginIsolated) return;                 // already isolated
    if (!window.isSecureContext || !navigator.serviceWorker) return;

    navigator.serviceWorker.register(window.document.currentScript.src)
      .then(function (reg) {
        reg.addEventListener("updatefound", () => window.sessionStorage.removeItem("coiReloaded"));
        if (reg.active && !navigator.serviceWorker.controller) {
          if (!window.sessionStorage.getItem("coiReloaded")) {
            window.sessionStorage.setItem("coiReloaded", "1");   // reload once, never loop
            window.location.reload();
          }
        }
      })
      .catch(function () { /* no isolation; the studio uses the single-threaded engine */ });
  })();
}
