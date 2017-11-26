// https://jakearchibald.com/2014/offline-cookbook/#network-falling-back-to-cache
self.addEventListener('fetch', function(event) {
  event.respondWith(
    fetch(event.request).catch(function() {
      return caches.match(event.request);
    })
  );
});
