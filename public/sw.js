self.addEventListener("push", (event) => {
  try {
    const data = event.data ? JSON.parse(event.data.text() || "{}") : {};
    const title = data.title || "ZPB Notification";
    const body = data.body || data.message || "";
    const icon = data.icon || "/icon-192.png";
    const badge = data.badge || "/badge-72.png";
    const payload = data.data || {};

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon,
        badge,
        data: payload,
      })
    );
  } catch (e) {
    // no-op
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification &&
      event.notification.data &&
      event.notification.data.url) ||
    "/notifications";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url && client.url.includes(self.location.origin)) {
            client.focus();
            client.navigate(targetUrl);
            return;
          }
        }
        clients.openWindow(targetUrl);
      })
  );
});
