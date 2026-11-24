// BODO offline storage: downloaded songs live inside the phone (IndexedDB) and play without internet.
import { WORKER, resolve } from './bodoApi.js?v=4';

const meta = new Map(); // id -> info about each downloaded song (kept in memory for fast checks)
let dbp;
const open = () => dbp || (dbp = new Promise((res, rej) => {
  const r = indexedDB.open('bodo-offline', 1);
  r.onupgradeneeded = () => { r.result.createObjectStore('meta', { keyPath: 'id' }); r.result.createObjectStore('files', { keyPath: 'id' }); };
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
}));
const rq = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
async function write(fn) {
  const d = await open();
  return new Promise((res, rej) => {
    const t = d.transaction(['meta', 'files'], 'readwrite'); fn(t.objectStore('meta'), t.objectStore('files'));
    t.oncomplete = () => res(); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error('aborted'));
  });
}

export async function init() {
  try { const d = await open(); (await rq(d.transaction('meta').objectStore('meta').getAll())).forEach(m => meta.set(m.id, m)); } catch {}
}
export const has = id => meta.has(id);
export const all = () => [...meta.values()].sort((a, b) => b.ts - a.ts);
export const bytes = () => all().reduce((s, m) => s + m.size, 0);
export const persist = () => navigator.storage?.persist?.().catch(() => {});
export const estimate = () => navigator.storage?.estimate?.().catch(() => null);

export async function save(t, onProgress = () => {}) {
  await resolve(t); // find the song's real file address
  const r = await fetch(`${WORKER}/file?u=${encodeURIComponent(t.mp3)}`);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const total = +r.headers.get('Content-Length') || 0, chunks = []; let got = 0;
  if (r.body?.getReader) {
    const rd = r.body.getReader();
    for (;;) { const { done, value } = await rd.read(); if (done) break; chunks.push(value); got += value.length; onProgress(total ? got / total : 0); }
  } else chunks.push(new Uint8Array(await r.arrayBuffer()));
  const ct = r.headers.get('Content-Type') || '';
  const audio = new Blob(chunks, { type: /audio/.test(ct) ? ct : 'audio/mpeg' });
  if (audio.size < 20000) throw new Error('bad file'); // a tiny reply is an error page, not music
  let cover = null;
  if (t.cover) { try { const c = await fetch(`${WORKER}/file?u=${encodeURIComponent(t.cover)}`); if (c.ok) cover = await c.blob(); } catch {} }
  const m = { id: t.id, title: t.title, artist: t.artist || '', artistId: t.artistId || null, album: t.album || '', duration: t.duration || 0, size: audio.size + (cover?.size || 0), ts: Date.now(), cover: !!cover };
  await write((ms, fs) => { ms.put(m); fs.put({ id: t.id, audio, cover }); });
  meta.set(t.id, m);
  return m;
}

const urls = new Map(), covers = new Map();
export async function url(id) { // temporary links to the saved file, for the audio player
  if (urls.has(id)) return urls.get(id);
  const d = await open(), f = await rq(d.transaction('files').objectStore('files').get(id));
  if (!f) return null;
  const o = { audio: URL.createObjectURL(f.audio), cover: f.cover ? URL.createObjectURL(f.cover) : '' };
  urls.set(id, o);
  if (urls.size > 4) { const k = urls.keys().next().value, v = urls.get(k); URL.revokeObjectURL(v.audio); urls.delete(k); }
  return o;
}
export async function coverURL(id) {
  if (covers.has(id)) return covers.get(id);
  const d = await open(), f = await rq(d.transaction('files').objectStore('files').get(id));
  const u = f?.cover ? URL.createObjectURL(f.cover) : '';
  covers.set(id, u); return u;
}
export async function remove(id) {
  await write((ms, fs) => { ms.delete(id); fs.delete(id); });
  meta.delete(id); const u = urls.get(id); if (u) { URL.revokeObjectURL(u.audio); urls.delete(id); }
}
export async function clear() {
  await write((ms, fs) => { ms.clear(); fs.clear(); });
  meta.clear(); urls.forEach(u => URL.revokeObjectURL(u.audio)); urls.clear();
}
