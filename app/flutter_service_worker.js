'use strict';
const CACHE_NAME = 'flutter-app-cache';
const RESOURCES = {
  "index.html": "f042a7b120e5d6eb6d1ab713029c8f0c",
"main.dart.js": "f3c0487f4e3f1bb034f47e200e15d0ac",
"favicon.png": "5dcef449791fa27946b3d35ad8803796",
"icons/Icon-192.png": "ac9a721a12bbc803b44f645561ecb1e1",
"icons/Icon-512.png": "96e752610906ba2a93c65f8abe1645f1",
"manifest.json": "b9b822c4a06b7a1ecc06648af835b4fd",
"assets/LICENSE": "c13d9911f18a375b32ce6e94546448cf",
"assets/AssetManifest.json": "16c0da7eb9ef9f722ca0fb4e41827621",
"assets/FontManifest.json": "68bc30ab60fd448a6a66a4279568ecd5",
"assets/packages/cupertino_icons/assets/CupertinoIcons.ttf": "115e937bb829a890521f72d2e664b632",
"assets/fonts/MaterialIcons-Regular.ttf": "56d3ffdef7a25659eab6a68a3fbfaf16",
"assets/assets/stop.png": "da218e7c047b7343ed3919ac0ee83775",
"assets/assets/piano.png": "2903e6a679c8d177e991bc72d5a1df5f",
"assets/assets/logo.svg.png": "1f1e977ab45266eed864023b0cf07a8a",
"assets/assets/notehead_filled.svg": "a3e16a2a50be3c26906a958d1a68b284",
"assets/assets/notehead_filled.png": "37c8b3634e9209022ffcd260858a6864",
"assets/assets/play_en_badge_web_generic.png": "db9b21a1c41f3dcd9731e1e7acfdbb57",
"assets/assets/metronome.svg": "a7fb35c859ddc1786f34d3c2c3238371",
"assets/assets/colorboard.png": "19a0e55840f5eea5112b46d1646ba244",
"assets/assets/colorboard_vertical.png": "f67aa95fdb328be75188429fe3ae6933",
"assets/assets/notehead_half.svg": "83ef8f0cf428ac043113f20d07532cc8",
"assets/assets/edit.svg": "0a53731d9e2ad9441ba03569124fbd04",
"assets/assets/fonts/vulf_sans_medium.otf": "899bf35ffd05371839fce190c266236c",
"assets/assets/fonts/vulf_sans_black.otf": "5a36cb728fc060a4c86a59420f151625",
"assets/assets/fonts/vulf_sans_light.otf": "2041c6160263e90a8e1ecaf8d4aafeef",
"assets/assets/fonts/vulf_sans_regular.otf": "77d3b8b0c40f5be423f8c10f3f77dc56",
"assets/assets/fonts/vulf_sans_bold.otf": "cf8d3d20afc11c90af3afe126c9ef0a7",
"assets/assets/logo.svg": "13c08e5ef41ac58ff35bfc0df7830403",
"assets/assets/play.png": "72897d71880a972a7bd812251ee5072b"
};

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheName) {
      return caches.delete(cacheName);
    }).then(function (_) {
      return caches.open(CACHE_NAME);
    }).then(function (cache) {
      return cache.addAll(Object.keys(RESOURCES));
    })
  );
});

self.addEventListener('fetch', function (event) {
  event.respondWith(
    caches.match(event.request)
      .then(function (response) {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
