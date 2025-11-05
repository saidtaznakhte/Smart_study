// This is the "Offline page" service worker

importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

const CACHE = "prep-ai-app-cache";

const offlineFallbackPage = "offline.html";

// Define the assets to precache
const precacheAssets = [
  '/', // The root URL
  'index.html',
  'offline.html',
  'translations/en.json',
  'translations/fr.json',
  // Include common bundled JavaScript filenames that Vite might generate
  // Use a more general pattern for bundled JS, assuming files might be in a 'assets' directory.
  // This will cover most `index.tsx` transformations to `index.js` or `app.[hash].js`
  '/*.js',
  '/assets/*.js', 
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/vite.svg',
  '/manifest.json'
];

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// The Workbox precaching takes care of the 'install' event and adds assets to cache.
workbox.precaching.precacheAndRoute(precacheAssets.map(url => ({ url, revision: null })));

if (workbox.navigationPreload.isSupported()) {
  workbox.navigationPreload.enable();
}

// Cache page navigations and other essential resources with network-first strategy
// This also handles the offline fallback for navigation requests.
workbox.routing.registerRoute(
  ({ request }) => request.mode === 'navigate',
  new workbox.strategies.NetworkFirst({
    cacheName: 'pages',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
      }),
      new workbox.cacheableResponse.CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
    // Fallback to the offline page if the network request fails.
    // This is the direct way to handle navigation fallbacks with Workbox.
    handlerDidError: async () => {
      const cache = await caches.open(CACHE);
      return cache.match(offlineFallbackPage) || Response.error();
    },
  })
);

// Cache CSS and JS files with stale-while-revalidate strategy
workbox.routing.registerRoute(
  ({ request }) => request.destination === 'style' || request.destination === 'script' || request.destination === 'worker',
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'static-resources',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 Days
      }),
    ],
  })
);

// Cache images with cache-first strategy
workbox.routing.registerRoute(
  ({ request }) => request.destination === 'image',
  new workbox.strategies.CacheFirst({
    cacheName: 'images',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
      }),
    ],
  })
);

// Cache Google Fonts (stylesheets) with stale-while-revalidate
workbox.routing.registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'google-fonts-stylesheets',
  })
);

// Cache Google Fonts (webfonts) with cache-first, for a long time
workbox.routing.registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new workbox.strategies.CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new workbox.cacheableResponse.CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new workbox.expiration.ExpirationPlugin({
        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 Year
        maxEntries: 30,
      }),
    ],
  })
);

// Cache AISTUDIOCDN resources with cache-first, for a long time
workbox.routing.registerRoute(
  ({ url }) => url.origin === 'https://aistudiocdn.com',
  new workbox.strategies.CacheFirst({
    cacheName: 'aistudio-cdn',
    plugins: [
      new workbox.cacheableResponse.CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new workbox.expiration.ExpirationPlugin({
        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 Year
        maxEntries: 100,
      }),
    ],
  })
);

// Cache Tailwind CSS CDN with StaleWhileRevalidate
workbox.routing.registerRoute(
  ({ url }) => url.origin === 'https://cdn.tailwindcss.com',
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'tailwind-cdn',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 Days
      }),
    ],
  })
);