/* 김우재 수학교실 · 서비스워커
   ──────────────────────────────────────────────────────────────
   내용을 고쳐 올릴 때마다 아래 VERSION 의 날짜/번호만 바꾸면 됩니다.
   버전이 바뀌면 예전 캐시를 전부 지우고 새로 받아옵니다.
   (예전 버전 캐시도 이름과 상관없이 모두 정리하므로,
    기존에 설치돼 있던 서비스워커의 묵은 캐시도 이 파일 하나로 걷힙니다.)
   ────────────────────────────────────────────────────────────── */
var VERSION = '2026-08-16-3';
var CACHE = 'math-classroom-' + VERSION;

/* 오프라인으로 쓰려면 반드시 받아 둬야 하는 파일들.
   레포에 파일을 더 추가하면 여기에도 적어 주세요. */
var ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './favicon-32.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      /* 파일 하나가 404 여도 설치가 통째로 실패하지 않도록 개별 처리 */
      return Promise.all(ASSETS.map(function (u) {
        return c.add(new Request(u, { cache: 'reload' }))['catch'](function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);   // 예전 캐시 전부 정리
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  /* 화면(HTML)은 네트워크 우선 — 온라인이면 항상 최신 내용을 본다.
     끊겨 있으면 캐시본으로 대체. */
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') >= 0) {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      })['catch'](function () {
        return caches.match(req).then(function (hit) {
          return hit || caches.match('./index.html');
        });
      })
    );
    return;
  }

  /* 아이콘·정적 파일은 캐시 우선 (빠르고 데이터도 아낌) */
  e.respondWith(
    caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      });
    })
  );
});

/* 페이지에서 즉시 업데이트를 요청할 때 사용 */
self.addEventListener('message', function (e) {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
