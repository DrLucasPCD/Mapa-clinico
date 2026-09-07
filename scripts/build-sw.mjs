import { readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const files = (await readdir('dist/assets')).map((f) => '/assets/' + f);
const version = createHash('sha256')
  .update(files.join('|'))
  .digest('hex')
  .slice(0, 12);
const shell = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  ...files,
];
const source = `const CACHE='mapa-${version}';const SHELL=${JSON.stringify(shell)};
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('mapa-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||e.request.headers.has('range'))return;
if(u.pathname.startsWith('/data/')){e.respondWith(fetch(e.request).then(async r=>{if(r.ok){const c=await caches.open(CACHE);await c.put(e.request,r.clone())}return r}).catch(()=>caches.match(e.request).then(r=>r||new Response('Unavailable',{status:503}))));return;}
e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(async r=>{if(r.ok){const c=await caches.open(CACHE);await c.put(e.request,r.clone())}return r}).catch(()=>e.request.mode==='navigate'?caches.match('/index.html'):new Response('Offline',{status:503}))));});`;
await writeFile('dist/sw.js', source);
console.log('Offline shell ready:', version);
