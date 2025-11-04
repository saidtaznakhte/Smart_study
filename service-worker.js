// This is the "Offline page" service worker

importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

const CACHE = "prep-ai-app-cache";

const offlineFallbackPage = "offline.html";

// Define the assets to precache
const precacheAssets = [
  '/', // The root URL
  'index.html',
  'index.tsx',
  'App.tsx',
  'metadata.json',
  'manifest.json',
  'vite.svg',
  'offline.html',
  'translations/en.json',
  'translations/fr.json',
  // List all .tsx, .ts, .js files that make up your application
  // Based on the provided file structure, these are imported directly
  'components/Onboarding.tsx',
  'components/Dashboard.tsx',
  'components/SubjectView.tsx',
  'components/Planner.tsx',
  'components/Profile.tsx',
  'components/ImageEditor.tsx',
  'components/StudyGuide.tsx',
  'components/Flashcards.tsx',
  'components/Quiz.tsx',
  'components/AIChat.tsx',
  'components/SaveTipModal.tsx',
  'components/ProgressView.tsx',
  'components/AddSubjectModal.tsx',
  'context/AppContext.tsx',
  'context/LanguageContext.tsx',
  'services/geminiService.ts',
  'types.ts',
  'utils/audioUtils.ts',
  'utils/downloadUtils.ts',
];

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// The Workbox precaching takes care of the 'install' event and adds assets to cache.
// No need for a separate manual 'install' listener here for precaching.
// self.addEventListener('install', async (event) => {
//   event.waitUntil(
//     caches.open(CACHE)
//       .then((cache) => cache.addAll(precacheAssets.concat([offlineFallbackPage])))
//   );
// });

if (workbox.navigationPreload.isSupported()) {
  workbox.navigationPreload.enable();
}

// Precache all defined assets
workbox.precaching.precacheAndRoute(precacheAssets.map(url => ({ url, revision: null })));

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
      new workbox.routing.NavigationRoute.useHandler(
        new workbox.strategies.NetworkFirst({
          // Provide an offline fallback for navigation requests.
          plugins: [
            new workbox.cacheableResponse.CacheableResponsePlugin({
              statuses: [0, 200],
            }),
          ],
        }),
        {
          // Fallback to the offline page if the network request fails.
          fallback: offlineFallbackPage,
        }
      ),
    ],
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

// Removed redundant manual 'fetch' listener for navigation,
// as Workbox's registerRoute for navigation already handles this effectively.
// self.addEventListener('fetch', (event) => {
//   if (event.request.mode === 'navigate') {
//     event.respondWith((async () => {
//       try {
//         const preloadResp = await event.preloadResponse;

//         if (preloadResp) {
//           return preloadResp;
//         }

//         const networkResp = await fetch(event.request);
//         return networkResp;
//       } catch (error) {
//         console.warn('Fetch failed, serving offline fallback.', error);
//         const cache = await caches.open(CACHE);
//         const cachedResp = await cache.match(offlineFallbackPage);
//         return cachedResp;
//       }
//     })());
//   }
// });