const CACHE = 'jeldem-v2';

// Fichiers essentiels seulement (pas config.js — contient des secrets)
const CORE = ['/client_v2.html', '/icon.svg', '/manifest.json'];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE).then(c => {
            // addAll échoue si un seul fichier manque — on fait des ajouts individuels
            return Promise.allSettled(CORE.map(url => c.add(url)));
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    const url = e.request.url;

    // Réseau uniquement pour : Groq, Apps Script, PayDunya, CDN Tailwind/FA
    if (url.includes('groq.com') || url.includes('script.google.com') ||
        url.includes('paydunya') || url.includes('cdn.tailwindcss') ||
        url.includes('cdnjs.cloudflare') || url.includes('qrserver')) {
        return; // pas de cache
    }

    // Stratégie : cache d'abord, fallback réseau
    e.respondWith(
        caches.match(e.request).then(cached => {
            if (cached) return cached;
            return fetch(e.request).then(res => {
                // Ne cacher que les GET valides, pas les POST
                if (res.ok && e.request.method === 'GET') {
                    const clone = res.clone();
                    caches.open(CACHE).then(c => c.put(e.request, clone));
                }
                return res;
            }).catch(() => cached); // hors ligne : retourner le cache même périmé
        })
    );
});
