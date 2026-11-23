// BODO data layer: talks to the Cloudflare Worker (/page proxy), parses Albumaty pages in the browser.
export const WORKER = 'https://lingering-butterfly-5d60.7wrm6b6zw8.workers.dev';
const BASE = 'https://www.albumaty.com', DAY = 864e5, MIN = 6e4;

/* ---------- cache ---------- */
const mem = new Map(), fly = new Map();
const lsGet = k => { try { return JSON.parse(localStorage.getItem('am_' + k)); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem('am_' + k, JSON.stringify(v)); } catch {} };
function cached(key, ttl, fn) {
  const m = mem.get(key); if (m && Date.now() - m.t < ttl) return Promise.resolve(m.v);
  const s = lsGet('c_' + key); if (s && s.v != null && Date.now() - s.t < ttl) { mem.set(key, s); return Promise.resolve(s.v); }
  if (fly.has(key)) return fly.get(key);
  const p = (async () => {
    try { const v = await fn(); const e = { t: Date.now(), v }; mem.set(key, e); if (v && (!Array.isArray(v) || v.length)) lsSet('c_' + key, e); return v; }
    finally { fly.delete(key); }
  })();
  fly.set(key, p); return p;
}
try { // keep localStorage small
  const ks = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^am_c_(s|ar|al)\d/.test(k)) ks.push(k); }
  if (ks.length > 350) ks.map(k => [k, (JSON.parse(localStorage.getItem(k)) || {}).t || 0]).sort((a, b) => a[1] - b[1]).slice(0, ks.length - 250).forEach(([k]) => localStorage.removeItem(k));
} catch {}

/* ---------- fetch + parse helpers ---------- */
async function doc(path) {
  const r = await fetch(`${WORKER}/page?p=${encodeURIComponent(path)}`);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return new DOMParser().parseFromString(await r.text(), 'text/html');
}
const abs = u => !u ? '' : /^https?:/.test(u) ? u : u.startsWith('//') ? 'https:' + u : u.startsWith('/') ? BASE + u : BASE + '/' + u;
const goodCover = u => { u = abs(u); return u && !/empty\.png|twitter\.png|logo\.png/.test(u) ? u : ''; };
const txt = e => (e?.textContent || '').replace(/\s+/g, ' ').trim();
const idOf = (h, k) => { const m = (h || '').match(new RegExp('/' + k + '/(\\d+)\\.html')); return m ? +m[1] : null; };
const meta = (d, p) => d.querySelector(`meta[property="${p}"],meta[name="${p}"]`)?.getAttribute('content')?.trim() || '';
const after = (h, a) => !h || (h.compareDocumentPosition(a) & 4);

function parseSongs(d, ctx = {}) {
  const out = [], seen = new Set(); let cur = null, box = null;
  for (const a of d.querySelectorAll('a[href]')) {
    const h = a.getAttribute('href'), sid = idOf(h, 'song');
    if (sid) {
      if (seen.has(sid)) { cur = null; continue; }
      seen.add(sid);
      const b = a.closest('li,tr'), bt = txt(b);
      const dm = bt.match(/(\d{1,2}):(\d{2})\s*$/);
      cur = { id: sid, title: txt(a).replace(/^جديد\s+/, ''), artist: ctx.artist || '', artistId: ctx.artistId || null, album: ctx.album || '', cover: ctx.cover || '', duration: dm ? +dm[1] * 60 + +dm[2] : 0, plays: +(bt.match(/إستماع:?\s*(\d+)/)?.[1] || 0), mp3: null };
      box = b; out.push(cur); continue;
    }
    const gid = idOf(h, 'singer');
    if (gid && cur && !cur.artist && (!box || a.closest('li,tr') === box)) { cur.artist = txt(a).replace(/^اغاني\s+/, ''); cur.artistId = gid; }
  }
  return out.filter(s => s.title);
}
function parseAlbums(d, ctx = {}) {
  const out = [], seen = new Set();
  for (const a of d.querySelectorAll('a[href]')) {
    const id = idOf(a.getAttribute('href'), 'album'); if (!id || seen.has(id)) continue;
    const img = a.querySelector('img'), t = txt(a);
    if (!img && !/ألبوم/.test(t)) continue;
    seen.add(id);
    const m = t.match(/^(?:ألبوم\s+)?(.+?)\s+((?:19|20)\d\d)\s*(.*)$/);
    out.push({ id, title: (m ? m[1] : t).split(' ألبوم ')[0].trim(), year: m ? m[2] : '', artist: (m && m[3]) || ctx.artist || '', cover: goodCover(img?.getAttribute('data-src') || img?.getAttribute('src') || '') });
  }
  return out;
}

/* ---------- text matching (Arabic spelling + English/Franco) ---------- */
const letterNorm = s => s.replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[\u064B-\u065F\u0640\u0670]/g, '');
export const norm = s => letterNorm(String(s || '').toLowerCase()).replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(' ').map(w => w.length > 3 && w.startsWith('ال') ? w.slice(2) : w).join(' ');
const AR = { ب: 'b', ت: 't', ث: 's', ج: 'g', ح: 'h', خ: 'k', د: 'd', ذ: 'z', ر: 'r', ز: 'z', س: 's', ش: 'x', ص: 's', ض: 'd', ط: 't', ظ: 'z', غ: 'g', ف: 'f', ق: 'k', ك: 'k', ل: 'l', م: 'm', ن: 'n', ه: 'h', ة: '' };
function skel(s) { // consonant skeleton: "sherine" and "شيرين" both become "xrn"
  s = String(s || '').toLowerCase().replace(/sh|ch/g, 'x').replace(/kh/g, 'k').replace(/gh/g, 'g').replace(/th/g, 's').replace(/dh/g, 'z').replace(/ph/g, 'f');
  let o = '';
  for (const c of s) {
    if (c in AR) o += AR[c];
    else if (/[a-z]/.test(c)) { if ('aeiouyw'.includes(c)) continue; o += ({ j: 'g', q: 'k', c: 'k', v: 'f', p: 'b' })[c] || c; }
    else if (c === '7') o += 'h'; else if (c === '5') o += 'k';
  }
  return o.replace(/(.)\1+/g, '$1');
}
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const d = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) { let p = d[0]; d[0] = i; for (let j = 1; j <= b.length; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1)); p = t; } }
  return d[b.length];
}
const TW = { ya: 'يا', el: 'ال', al: 'ال', ana: 'انا', enta: 'انت', inta: 'انت', habibi: 'حبيبي', habibti: 'حبيبتي', hob: 'حب', hobb: 'حب', albi: 'قلبي', alby: 'قلبي', qalbi: 'قلبي', mesh: 'مش', msh: 'مش', leh: 'ليه', ahla: 'احلى', nour: 'نور', noor: 'نور', kol: 'كل', kolo: 'كله', eh: 'ايه', men: 'من', min: 'من', fi: 'في', fe: 'في', ala: 'على', ayza: 'عايزة', bahebak: 'بحبك', bahbak: 'بحبك', tamally: 'تملي', tamaly: 'تملي', maak: 'معاك', maa: 'مع', layaly: 'ليالي', leyaly: 'ليالي', eyoun: 'عيون', oyoun: 'عيون', omry: 'عمري', nasini: 'نسيني', wahashtini: 'وحشتني' };
const TL = { sh: 'ش', kh: 'خ', gh: 'غ', th: 'ث', dh: 'ذ', ch: 'تش', a: 'ا', b: 'ب', t: 'ت', g: 'ج', j: 'ج', h: 'ه', d: 'د', r: 'ر', z: 'ز', s: 'س', f: 'ف', q: 'ق', k: 'ك', l: 'ل', m: 'م', n: 'ن', w: 'و', y: 'ي', e: 'ي', i: 'ي', o: 'و', u: 'و', 3: 'ع', 7: 'ح', 5: 'خ', 2: 'ء', p: 'ب', v: 'ف', c: 'ك', x: 'كس' };
function trWord(w) {
  if (TW[w]) return TW[w];
  let o = ''; const n = w.length;
  for (let i = 0; i < n;) {
    const d = w.substr(i, 2);
    if (/^(sh|kh|gh|th|dh|ch)$/.test(d)) { o += TL[d]; i += 2; continue; }
    const c = w[i];
    if ('aeiouy'.includes(c)) { if (i === 0 || i === n - 1) o += c === 'a' ? 'ا' : 'aeiy'.includes(c) ? 'ي' : 'و'; } else o += TL[c] ?? '';
    i++;
  }
  return o;
}
const translit = s => { const w = s.toLowerCase().split(/\s+/).filter(Boolean); return w.length && w.every(x => /^[a-z0-9']+$/.test(x)) ? [w.map(trWord).join(' ')] : []; };
function variants(raw) {
  const v = new Set([raw.trim()]), ln = letterNorm(raw).trim();
  v.add(ln); v.add(ln.replace(/ه(?=\s|$)/g, 'ة'));
  translit(raw).forEach(x => v.add(x));
  return [...v].filter(x => x && x.length >= 2).slice(0, 4);
}
function scoreArtist(a, n, toks, qs) {
  const w = a.w || (a.w = norm(a.name).split(' ')), an = w.join(' ');
  if (an === n) return 100;
  if (an.startsWith(n)) return 85;
  if (toks.length && toks.every(t => w.some(x => x.startsWith(t)))) return 70;
  if (an.includes(n)) return 60;
  if (toks.length && toks.every(t => w.some(x => lev(x, t) <= (t.length >= 5 ? 2 : t.length >= 4 ? 1 : 0)))) return 45;
  if (qs.length >= 3) { const sk = a.sk ?? (a.sk = skel(a.name)); if (sk === qs) return 80; if (sk.startsWith(qs)) return 65; if (sk.includes(qs)) return 48; if (qs.length >= 4 && lev(sk, qs) <= 1) return 55; }
  return 0;
}
export function shuffle(a, r = Math.random) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export function rng(seed) { let h = 0; for (const c of seed) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0; let a = h >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const dayKey = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
const weekKey = () => { const d = new Date(); return d.getFullYear() + 'w' + Math.floor((d - new Date(d.getFullYear(), 0, 1)) / (7 * DAY)); };
export const dedupe = l => { const s = new Set(); return l.filter(t => { const k = norm(t.title) + '|' + (t.artistId || t.artist); return s.has(k) ? false : (s.add(k), true); }); };

/* ---------- pages ---------- */
export const directory = () => cached('dir', 7 * DAY, async () => {
  const res = await Promise.all([1, 2, 3, 11, 12, 13].map(n => doc(`cat/${n}.html`).then(d => {
    const o = [];
    for (const a of d.querySelectorAll('a[href*="/singer/"]')) { const t = txt(a); if (!/^اغاني\s/.test(t)) continue; const id = idOf(a.getAttribute('href'), 'singer'); if (id) o.push([id, t.replace(/^اغاني\s+/, '')]); }
    return o;
  }).catch(() => [])));
  const seen = new Set(), out = [];
  for (const o of res) for (const [id, name] of o) if (!seen.has(id)) { seen.add(id); out.push({ id, name }); }
  return out;
});
const loadArtist = id => cached('ar' + id, DAY, async () => {
  const d = await doc(`singer/${id}.html`);
  const name = (d.title.match(/تحميل اغاني\s*-\s*(.+?)\s*-\s*mp3/i) || [])[1] || txt(d.querySelector('h1'));
  const cover = goodCover(meta(d, 'og:image'));
  const songs = parseSongs(d, { artist: name, artistId: id, cover });
  return { id, name, cover, count: +(txt(d.body).match(/عدد الأغاني:?\s*(\d+)/)?.[1] || songs.length), albums: parseAlbums(d, { artist: name }), songs: songs.map(s => [s.id, s.title, s.plays, s.duration]) };
});
const expand = a => a.songs.map(([id, title, plays, duration]) => ({ id, title, plays, duration, artist: a.name, artistId: a.id, album: '', cover: a.cover, mp3: null }));
export const artist = async id => { const a = await loadArtist(id); return { ...a, songs: expand(a) }; };
export const artistSongs = async id => expand(await loadArtist(id));
export const album = id => cached('al' + id, DAY, async () => {
  const d = await doc(`album/${id}.html`), h1 = d.querySelector('h1');
  const m = txt(h1).replace(/^البوم\s+/, '').match(/^(.*?)\s*((?:19|20)\d\d)?$/);
  let artist = '', artistId = null;
  for (const a of d.querySelectorAll('a[href*="/singer/"]')) if (after(h1, a)) { artist = txt(a); artistId = idOf(a.getAttribute('href'), 'singer'); break; }
  const cover = goodCover(meta(d, 'og:image')), title = m ? m[1] : txt(h1);
  return { id, title, year: m?.[2] || '', artist, artistId, cover, songs: parseSongs(d, { artist, artistId, album: title, cover }) };
});
export const home = () => cached('home', 30 * MIN, async () => { const d = await doc(''); return { songs: parseSongs(d), albums: parseAlbums(d) }; });
export const newSongs = () => cached('new', 30 * MIN, async () => parseSongs(await doc('nowlastsongsnow.html')));
export const newAlbums = () => cached('albums', 60 * MIN, async () => parseAlbums(await doc('lastalbums.html')));

export async function resolve(t) { // fetch the real mp3 + cover when a song is about to be played
  if (t.mp3 && t._r) return t;
  const r = await cached('s' + t.id, 7 * DAY, async () => {
    const d = await doc(`song/${t.id}.html`), h1 = d.querySelector('h1');
    const mp3 = meta(d, 'og:audio') || d.querySelector('audio[src]')?.getAttribute('src') || d.querySelector('source[src]')?.getAttribute('src') || '';
    let artistId = null;
    for (const a of d.querySelectorAll('a[href*="/singer/"]')) if (h1 && after(h1, a)) { artistId = idOf(a.getAttribute('href'), 'singer'); break; }
    return { mp3: abs(mp3), cover: goodCover(meta(d, 'og:image')), album: meta(d, 'og:audio:album'), artist: meta(d, 'og:audio:artist') || meta(d, 'music:musician'), duration: parseInt(meta(d, 'music:duration') || '0') || 0, artistId };
  });
  if (!r.mp3) throw new Error('no audio');
  t.mp3 = r.mp3; t._r = 1;
  if (r.cover) t.cover = r.cover;
  t.album = t.album || r.album; t.artist = t.artist || r.artist; t.artistId = t.artistId || r.artistId; t.duration = t.duration || r.duration;
  return t;
}

/* ---------- smart search ---------- */
const sm = new Map();
export async function search(q) {
  const raw = q.trim(), key = norm(raw);
  if (raw.length < 2) return { artists: [], songs: [], albums: [], topArtist: null };
  const hit = sm.get(key); if (hit && Date.now() - hit.t < 10 * MIN) return hit.v;
  const n = key, toks = n.split(' ').filter(Boolean), qs = skel(raw);
  const [dir, ...lists] = await Promise.all([directory().catch(() => []), ...variants(raw).map(v => doc('search.php?q=' + encodeURIComponent(v)).then(d => parseSongs(d)).catch(() => []))]);
  const artists = dir.map(a => ({ ...a, s: scoreArtist(a, n, toks, qs) })).filter(a => a.s > 0).sort((a, b) => b.s - a.s).slice(0, 10);
  let found = lists.flat();
  if (!found.length && toks.length > 1) { // fall back to single words
    const words = [...new Set(toks)].filter(w => w.length >= 3).sort((a, b) => b.length - a.length).slice(0, 2);
    found = (await Promise.all(words.map(w => doc('search.php?q=' + encodeURIComponent(w)).then(d => parseSongs(d)).catch(() => [])))).flat();
  }
  const sc = s => { const t = norm(s.title + ' ' + s.artist); return toks.filter(k => t.includes(k)).length / (toks.length || 1); };
  found.sort((a, b) => sc(b) - sc(a));
  let top = artists[0] && artists[0].s >= 45 ? artists[0] : null, albums = [], popular = [];
  if (top) {
    try { const a = await loadArtist(top.id); top = { ...top, cover: a.cover, count: a.count }; albums = a.albums; popular = expand(a).sort((x, y) => y.plays - x.plays).slice(0, 10); } catch { top = null; }
  }
  const seen = new Set(), songs = [];
  [...popular, ...found].forEach(s => { if (!seen.has(s.id)) { seen.add(s.id); songs.push(s); } });
  const v = { artists, songs: songs.slice(0, 40), albums, topArtist: top && top.s >= 60 ? top : null };
  sm.set(key, { t: Date.now(), v });
  return v;
}

/* ---------- mixes (refresh daily / weekly) ---------- */
export async function mixSpecs(topIds) {
  const dir = await directory().catch(() => []);
  if (!dir.length) return [];
  const by = new Map(dir.map(a => [a.id, a])), pop = dir.slice(0, 100), r = rng('dm' + dayKey());
  const seeds = topIds.filter(id => by.has(id)).slice(0, 6);
  while (seeds.length < 3) { const c = pop[Math.floor(r() * pop.length)]; if (!seeds.includes(c.id)) seeds.push(c.id); }
  const sub = ids => ids.map(i => by.get(i)?.name).filter(Boolean).slice(0, 3).join(', ') + ' and more';
  const specs = shuffle(seeds, r).slice(0, 3).map((sid, i) => {
    const ids = [sid, ...shuffle(pop.filter(a => a.id !== sid), r).slice(0, 3).map(a => a.id)];
    return { key: 'dm' + i + dayKey(), title: 'Daily Mix ' + (i + 1), ids, sub: sub(ids), hue: Math.floor(r() * 360) };
  });
  const dids = shuffle(pop.filter(a => !topIds.includes(a.id)), rng('dw' + weekKey())).slice(0, 6).map(a => a.id);
  specs.push({ key: 'dw' + weekKey(), title: 'Discover Weekly', ids: dids, sub: sub(dids), hue: 280 });
  specs.push({ key: 'new', title: 'New Releases', kind: 'new', sub: 'Fresh songs this week', hue: 150 });
  return specs;
}
export async function buildMix(spec) {
  if (spec.kind === 'new') return dedupe(await newSongs()).slice(0, 40);
  const r = rng(spec.key);
  const lists = await Promise.all(spec.ids.map(id => artistSongs(id).catch(() => [])));
  const out = [];
  lists.forEach((l, i) => out.push(...shuffle(dedupe(l).sort((a, b) => b.plays - a.plays).slice(0, 40), r).slice(0, i === 0 ? 12 : 6)));
  return shuffle(dedupe(out), r);
}
