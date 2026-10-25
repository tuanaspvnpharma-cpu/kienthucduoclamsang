/* Service worker – ClinPharmAI Portal.
   Tăng CACHE_VERSION mỗi lần đổi app shell hoặc data/catalog.json. */
'use strict';
var CACHE_VERSION = 'cpa-1.0.1';
var SHELL = [
  './', 'index.html', 'manifest.webmanifest',
  'css/base.css', 'css/theme.css', 'js/lib.js', 'js/app.js',
  'data/catalog.json', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'
];
/* CDN mà các trang tài liệu dùng (font, Tailwind, Chart.js, Font Awesome…) – lưu để xem ngoại tuyến. */
var CDN_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.tailwindcss.com', 'cdnjs.cloudflare.com', 'cdn.jsdelivr.net'];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE_VERSION).then(function (cache) {
    return cache.addAll(SHELL).then(function () {
      /* Lấy danh sách trang từ chính catalog để không phải khai báo hai nơi. */
      return fetch('data/catalog.json', { cache: 'no-cache' })
        .then(function (r) { return r.json(); })
        .then(function (cat) {
          var pages = (cat.records || []).map(function (r) { return encodeURIComponent(r.file); });
          /* Một trang lỗi không được làm hỏng cả bản cài: thêm từng trang. */
          return Promise.all(pages.map(function (p) { return cache.add(p).catch(function () { /* bỏ qua */ }); }));
        });
    });
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('cpa-') === 0 && k !== CACHE_VERSION; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

/* stale-while-revalidate: trả bản đã lưu ngay, đồng thời tải bản mới cho lần sau. */
function staleWhileRevalidate(event, request) {
  return caches.open(CACHE_VERSION).then(function (cache) {
    return cache.match(request).then(function (cached) {
      var network = fetch(request).then(function (res) {
        if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone());
        return res;
      });
      if (cached) {
        event.waitUntil(network.catch(function () { /* ngoại tuyến */ }));
        return cached;
      }
      return network.catch(function () {
        if (request.mode === 'navigate') return cache.match('index.html');
        return Response.error();
      });
    });
  });
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  /* cache: 'no-store' (dùng trong tests/) luôn đi thẳng mạng để kiểm tra tệp thật. */
  if (req.method !== 'GET' || req.cache === 'no-store') return;
  var url = new URL(req.url);
  if (url.origin === self.location.origin || CDN_HOSTS.indexOf(url.hostname) !== -1) {
    event.respondWith(staleWhileRevalidate(event, req));
  }
});
