// 홈 화면 앱(PWA)용. 항상 네트워크에서 새로 받고(배포하면 바로 반영), 행사장 와이파이가 끊기면 마지막으로 받은 사본을 쓴다.
const CACHE = 'namgang-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const req = e.request;
  // 같은 사이트의 GET만. 응모 전송(구글 스크립트)은 건드리지 않는다
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true })),
  );
});
