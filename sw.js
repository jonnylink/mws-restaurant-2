self.importScripts('js/idb.js', 'js/api_helper.js');

const staticCacheName = 'UdacityEats-v4';

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.open(staticCacheName).then(cache => {
            ApiHelper.doPendingFetch();
            return cache.match(event.request).then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request).then(fetch_response => {
                    if (event.request.method === 'GET' && event.request.type !== 'html') {
                        cache.put(event.request, fetch_response.clone());
                    }
                    return fetch_response;
                });
            });
        })
    );
})

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                cacheNames.filter(cacheName => cacheName.startsWith('UdacityEats') && cacheName !== staticCacheName)
                    .map(cacheName => caches.delete(cacheName))
            })
    );
})

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(staticCacheName).then(cache => {
            return cache.addAll([
                '/',
                '/favicon.ico',
                '/manifest.json',
                '/index.html',
                '/restaurant.html',
                '/css/styles.css',
                '/js/api_helper.js',
                '/js/main.js',
                '/js/restaurant_info.js',
                '/js/idb.js',
            ]);
        })
    );
});
