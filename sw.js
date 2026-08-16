const CACHE = "nihul-habayit-v15-47-event-prep-create";
const ASSETS = ["./", "./index.html", "./styles.css", "./app.js", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (url.pathname.endsWith("/config.js")) {
    event.respondWith(fetch(event.request));
    return;
  }
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

self.addEventListener("push", event => {
  let payload = {};
  try {
    payload = event.data?.json() || {};
  } catch (error) {
    payload = { body: event.data?.text() || "יש עדכון חדש באפליקציה" };
  }
  const title = payload.title || "ניהול הבית";
  const page = ["home", "shopping", "events", "tasks", "wishes", "planning"].includes(payload.data?.page)
    ? payload.data.page
    : "home";
  const normalizedPage = page === "planning" ? "wishes" : page;
  const icon = new URL("icons/icon-192.png", self.registration.scope).href;
  event.waitUntil(self.registration.showNotification(title, {
    body: payload.body || "יש עדכון חדש במשפחה",
    icon,
    badge: icon,
    dir: "rtl",
    lang: "he",
    tag: payload.data?.kind ? `nihul-habayit-${payload.data.kind}-${payload.data?.entityId || "group"}` : undefined,
    renotify: false,
    data: { ...(payload.data || {}), page: normalizedPage },
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const page = event.notification.data?.page || "home";
  const targetUrl = new URL(`index.html#${page}`, self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async clients => {
      const existing = clients.find(client => client.url.startsWith(self.registration.scope));
      if (existing) {
        if ("navigate" in existing) await existing.navigate(targetUrl);
        return existing.focus();
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
