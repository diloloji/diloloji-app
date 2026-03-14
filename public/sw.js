/**
 * Diloloji PWA — temel Service Worker.
 * Kurulumda beklemeden etkinleşir; "Uygulamayı Yükle" için gerekli.
 */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
