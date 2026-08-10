const CACHE_NAME = 'imca-nexus-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/static/css/style.css',
    '/static/css/glass.css',
    '/static/js/main.js',
    '/static/js/charts.js',
    '/static/fonts/Pasajero.otf',
    '/static/fonts/Bourgeois-Book.otf',
    '/static/wallpapers/static/amber_lounge.jpeg',
    '/static/wallpapers/static/cobalt_horizon.jpeg',
    '/static/wallpapers/static/crimson_protocol.jpeg',
    '/static/wallpapers/static/emerald_terrace.jpeg',
    '/static/wallpapers/static/lavender_eclipse.jpeg',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
