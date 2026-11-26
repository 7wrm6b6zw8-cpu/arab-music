// BODO data layer: talks to the Cloudflare Worker (/page proxy), parses Albumaty pages in the browser.
export const WORKER = 'https://lingering-butterfly-5d60.7wrm6b6zw8.workers.dev';
export const BUILD = 6; // app.js checks this to be sure it is paired with the right version of this file
const BASE = 'https://www.albumaty.com', DAY = 864e5, MIN = 6e4;

/* ---------- cache ---------- */
const mem = new Map(), fly = new Map();
const lsGet = k => { try { return JSON.parse(localStorage.getItem('am_' + k)); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem('am_' + k, JSON.stringify(v)); } catch {} };
function cached(key, ttl, fn) {
  const m = mem.get(key); if (m && Date.now() - m.t < ttl) return Promise.resolve(m.v);
  const s = lsGet('c_' + key); if (s && s.v != null && Date.now() - s.t < ttl) { mem.set(key, s); return Promise.resolve(s.v); }
  if (fly.has(key)) return fly.get(key);
  const stale = s || m; // an old copy is still better than nothing when there is no internet
  const p = (async () => {
    try { const v = await fn(); const e = { t: Date.now(), v }; mem.set(key, e); if (v && (!Array.isArray(v) || v.length)) lsSet('c_' + key, e); return v; }
    catch (err) { if (stale && stale.v != null) return stale.v; throw err; }
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


/* ---------- international songs (MP3.pm), reached through the Worker's /ext ---------- */
const extDoc = async u => {
  const r = await fetch(`${WORKER}/ext?u=${encodeURIComponent(u)}`);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return new DOMParser().parseFromString(await r.text(), 'text/html');
};
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
function parseExt(d) {
  const out = [], seen = new Set();
  for (const li of d.querySelectorAll('li')) {
    let song = null, any = null, who = null;
    for (const a of li.querySelectorAll('a[href]')) {
      let u; try { u = new URL(a.getAttribute('href'), 'https://mp3.pm/'); } catch { continue; }
      if (!/(^|\.)mp3\.pm$/.test(u.hostname)) continue;
      if (/^\/song\/\d+-/.test(u.pathname)) {
        const t = txt(a);
        any = any || [a, u];
        if (t && !/^\(?download\)?$/i.test(t) && !song) song = [a, u]; // skip the "(download)" button, keep the real title link
      } else if (u.pathname === '/' && /^\d+-/.test(u.hostname) && !who) who = a;
    }
    if (!song && any) { // no title link found: build a title from the address
      const w = any[1].pathname.replace(/^\/song\/\d+-/, '').replace(/\/$/, '').replace(/-/g, ' ');
      song = [{ textContent: w.replace(/\b\w/g, c => c.toUpperCase()) }, any[1]];
    }
    if (!song) continue;
    const id = 'm' + song[1].pathname.match(/^\/song\/(\d+)-/)[1];
    if (seen.has(id)) continue; seen.add(id);
    const dm = txt(li).match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*$/);
    out.push({ id, title: txt(song[0]), artist: who ? txt(who) : '', artistId: null, album: '', cover: '', duration: dm && !dm[3] ? +dm[1] * 60 + +dm[2] : 0, plays: 0, mp3: null, src: 'mp3pm', page: `https://${song[1].hostname}${song[1].pathname}` });
  }
  return out.filter(t => t.title);
}
/* ---------- smart matching for MP3.pm songs ----------
   MP3.pm spells artists its own way ("Edd Sheraan" instead of "Ed Sheeran") and a search for "Perfect" returns
   every song with that word. So we first ask Deezer which songs are really popular under that name (real title,
   artist, length), then pick the MP3.pm entries that match them by SOUND of the artist + song length, not spelling. */
const dzRefs = q => cached('dz' + slug(q).slice(0, 80), 6 * 60 * MIN, async () => {
  const r = await fetch(`${WORKER}/dz?q=${encodeURIComponent(q)}`);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const j = await r.json();
  return (j.data || []).map(x => ({ title: x.title_short || x.title || '', artist: (x.artist && x.artist.name) || '', duration: x.duration || 0, rank: x.rank || 0 })).filter(x => x.title && x.artist);
});
const words = s => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
// title without "(Official Video)", "[Remastered]", "feat. ..."
const core = s => words(String(s || '').replace(/[\(\[][^\)\]]*[\)\]]/g, ' ').replace(/\b(feat|ft|featuring)\b.*$/i, ' '));
// words that usually mean "not the original" (the person did not ask for them, so they lose points)
const BAD_RE = /\b(cover|covers|remix|karaoke|instrumental|live|acoustic|slowed|reverb|sped|speed|nightcore|8d|mashup|tribute|bootleg|rework|piano|lofi|ringtone|reaction|quarantine|parody|demo|vip)\b/;
function artistSim(a, b) { // "edd sheraan" and "ed sheeran" both sound like "dxrn", so they match
  const x = skel(a), y = skel(b); if (!x || !y) return 0;
  if (x === y) return 1;
  if (Math.min(x.length, y.length) >= 3 && (x.includes(y) || y.includes(x))) return .85;
  return Math.min(x.length, y.length) >= 3 && lev(x, y) <= 1 ? .8 : 0;
}
const durScore = (a, b) => !a || !b ? 0 : Math.abs(a - b) <= 2 ? 1 : Math.abs(a - b) <= 6 ? .5 : Math.abs(a - b) > 20 ? -1 : 0;
function pickRefs(res, q) { // the real songs this search most likely means, most popular first
  const qc = core(q), qt = qc.split(' ').filter(Boolean), seen = new Set(), out = [];
  const byRank = (a, b) => b.rank - a.rank;
  const exact = res.filter(x => core(x.title) === qc).sort(byRank).map(x => ({ ...x, exact: 1 }));
  const part = res.filter(x => core(x.title) !== qc && qt.every(w => (core(x.title) + ' ' + core(x.artist)).includes(w))).sort(byRank).map(x => ({ ...x, exact: 0 }));
  for (const x of [...exact, ...part]) { const k = core(x.title) + '|' + skel(x.artist); if (seen.has(k)) continue; seen.add(k); out.push(x); }
  return out.slice(0, 6);
}
export function rankForeign(list, q, refs = []) {
  const qc = core(q), qt = qc.split(' ').filter(Boolean), qBad = BAD_RE.test(words(q));
  const refTitles = new Set(refs.map(r => core(r.title)));
  const scored = list.map((t, i) => {
    const tc = core(t.title), tt = tc.split(' ').filter(Boolean);
    let s = 0;
    if (tc === qc || refTitles.has(tc)) s += 30;
    else if (qt.length && qt.every(w => tt.includes(w))) s += 12 - Math.min(12, 2 * (tt.length - qt.length));
    if (!qBad && BAD_RE.test(words(t.title))) s -= 40;
    let ref = 0;
    refs.forEach((r, j) => {
      const rt = core(r.title), ok = tc === rt ? 1 : tc.startsWith(rt + ' ') ? .5 : 0; if (!ok) return;
      const d = durScore(t.duration, r.duration), sim = t.artist ? artistSim(t.artist, r.artist) : (d === 1 ? .6 : 0);
      if (!sim) return;
      const v = ((ok === 1 ? 30 : 10) + sim * 40 + (d > 0 ? 10 * d : 15 * d)) * (r.exact ? 1 : .6) * (1 - .1 * j);
      if (v > ref) ref = v;
    });
    return { t, s: s + ref - i * .01, ref };
  }).sort((a, b) => b.s - a.s);
  const top = scored[0];
  return { list: scored.map(x => x.t), best: top && top.ref > 0 && top.s >= 80 ? top.t : null };
}
export async function foreignSearch(q) {
  const raw = q.trim(), none = { list: [], best: null };
  if (!/[a-z]/i.test(raw) || /[\u0600-\u06FF]/.test(raw)) return none; // MP3.pm is for English-spelled searches
  const k = slug(raw); if (k.length < 2) return none;
  const refs = pickRefs(await dzRefs(raw).catch(() => []), raw); // if Deezer is unreachable we still rank by title
  const keys = [k]; // MP3.pm may not know the artist's spelling, so also search with the real title (and real artist + title)
  if (refs[0]) [slug(refs[0].title), slug(refs[0].artist + ' ' + refs[0].title)].forEach(x => { if (x.length >= 2 && !keys.includes(x)) keys.push(x); });
  const lists = await Promise.all(keys.map(x => cached('fs3' + x.slice(0, 60), 30 * MIN, async () => parseExt(await extDoc(`https://s-${x.slice(0, 60).replace(/-+$/, '')}.mp3.pm/`)).slice(0, 30)).catch(() => [])));
  const seen = new Set(), all = [];
  lists.flat().forEach(t => { if (!seen.has(t.id)) { seen.add(t.id); all.push(t); } });
  const r = rankForeign(all, raw, refs);
  return { list: r.list.slice(0, 30), best: r.best };
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

export const ready = t => !!(t.mp3 && t._r && (!t.exp || Date.now() < t.exp)); // MP3.pm links expire, so they get a timer
export async function resolve(t) { // fetch the real mp3 + cover when a song is about to be played
  if (ready(t)) return t;
  if (t.src === 'mp3pm') {
    const r = await cached('s' + t.id, 20 * MIN, async () => {
      const mp3 = meta(await extDoc(t.page), 'og:audio');
      if (!mp3) throw new Error('no audio');
      return { mp3 };
    });
    t.mp3 = r.mp3; t.play = `${WORKER}/file?u=${encodeURIComponent(r.mp3)}`; t._r = 1; t.exp = Date.now() + 20 * MIN;
    return t;
  }
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
  if (raw.length < 2) return { artists: [], songs: [], albums: [], topArtist: null, popular: [], latest: [], foreign: [], best: null };
  const hit = sm.get(key); if (hit && Date.now() - hit.t < 10 * MIN) return hit.v;
  const n = key, toks = n.split(' ').filter(Boolean), qs = skel(raw);
  const foreignP = foreignSearch(raw).catch(() => ({ list: [], best: null }));
  const [dir, ...lists] = await Promise.all([directory().catch(() => []), ...variants(raw).map(v => doc('search.php?q=' + encodeURIComponent(v)).then(d => parseSongs(d)).catch(() => []))]);
  const artists = dir.map(a => ({ ...a, s: scoreArtist(a, n, toks, qs) })).filter(a => a.s > 0).sort((a, b) => b.s - a.s).slice(0, 10);
  let found = lists.flat();
  if (!found.length && toks.length > 1) { // fall back to single words
    const words = [...new Set(toks)].filter(w => w.length >= 3).sort((a, b) => b.length - a.length).slice(0, 2);
    found = (await Promise.all(words.map(w => doc('search.php?q=' + encodeURIComponent(w)).then(d => parseSongs(d)).catch(() => [])))).flat();
  }
  const sc = s => { const t = norm(s.title + ' ' + s.artist); return toks.filter(k => t.includes(k)).length / (toks.length || 1); };
  found.sort((a, b) => sc(b) - sc(a));
  let top = artists[0] && artists[0].s >= 55 ? artists[0] : null, albums = [], popular = [], latest = [];
  if (top) {
    try {
      const a = await loadArtist(top.id), all = expand(a);
      top = { ...top, cover: a.cover, count: a.count }; albums = a.albums;
      popular = dedupe(all.slice().sort((x, y) => y.plays - x.plays)).slice(0, 10);
      latest = dedupe(all.slice().sort((x, y) => y.id - x.id)).filter(t => !popular.some(p => p.id === t.id)).slice(0, 5);
    } catch { top = null; }
  }
  const seen = new Set([...popular, ...latest].map(t => t.id)), songs = [];
  found.forEach(t => { if (!seen.has(t.id)) { seen.add(t.id); songs.push(t); } });
  const fr = await foreignP;
  const v = { artists, songs: songs.slice(0, 40), albums, topArtist: top, popular, latest, foreign: fr.list.filter(t => t !== fr.best), best: fr.best };
  sm.set(key, { t: Date.now(), v });
  return v;
}

/* ---------- mixes: daily mixes, moods and genres (they refresh every day, or on demand) ---------- */
const pack = l => l.map(t => [t.id, t.title, t.plays || 0, t.duration || 0, t.artist || '', t.artistId || null]);
const unpack = l => l.map(([id, title, plays, duration, artist, artistId]) => ({ id, title, plays, duration, artist, artistId, album: '', cover: '', mp3: null }));
const pageSongs = async path => unpack(await cached('pg' + path, DAY, async () => pack(parseSongs(await doc(path)))));
const wordSongs = async w => unpack(await cached('kw' + w, DAY, async () => pack(parseSongs(await doc('search.php?q=' + encodeURIComponent(w))))));

export const MOODS = [
  { key: 'romantic', title: 'Romantic Hits', sub: 'Love songs you know by heart', hue: 340, artists: [71, 123, 155, 158, 284, 307, 150, 91, 213, 82, 11, 72], words: ['حبيبي', 'بحبك', 'عشق', 'قلبي', 'غرام', 'حب'] },
  { key: 'sad', title: 'Sad Songs', sub: 'For the heavy nights', hue: 222, pages: ['singer/1190.html'], artists: [121, 6, 13, 8, 138, 196, 307], words: ['حزين', 'وجع', 'دموع', 'وحشتني', 'ابكي', 'غدار'] },
  { key: 'heartbreak', title: 'Heartbreak', sub: 'Betrayal, goodbyes and tears', hue: 0, artists: [121, 8, 13, 6, 284, 138, 307], words: ['خيانة', 'هجر', 'غدر', 'نسيتني', 'ظلمتني', 'فراق', 'خسارة'] },
  { key: 'chill', title: 'Late Night Chill', sub: 'Slow and smooth', hue: 262, artists: [307, 82, 212, 196, 197, 213, 891, 13, 284] },
  { key: 'party', title: 'Party Mode', sub: 'Turn it up', hue: 28, pages: ['singer/639.html'], artists: [1136, 1052, 247, 969, 1262, 1917, 27, 181, 186, 22, 113] },
  { key: 'mahraganat', title: 'Mahraganat', sub: 'Street sound of Cairo', hue: 12, pages: ['singer/639.html'], artists: [1136, 1052, 247, 969, 1262, 1917, 1179, 1668, 1278, 1363] },
  { key: 'rap', title: 'Rap and Hip Hop', sub: 'Arabic rap essentials', hue: 275, artists: [1068, 1132, 1123, 1306, 1310, 452, 27, 1179, 236] },
  { key: 'queens', title: 'Arab Pop Queens', sub: 'Elissa, Sherine, Angham and more', hue: 312, artists: [6, 121, 13, 152, 8, 146, 118, 282, 140, 341] },
  { key: 'lebanese', title: 'Lebanese Love', sub: 'Songs from Beirut', hue: 355, artists: [284, 152, 6, 101, 146, 282, 140, 228, 341, 306, 64, 486, 132] },
  { key: 'khaleeji', title: 'Khaleeji Vibes', sub: 'Voices of the Gulf', hue: 188, artists: [196, 197, 213, 82, 212, 333, 44] },
  { key: 'egy', title: 'Egyptian Hits', sub: 'The biggest names in Egypt', hue: 18, artists: [71, 72, 123, 155, 11, 22, 186, 181, 150, 158] },
  { key: 'golden', title: 'Golden Age', sub: 'Timeless classics', hue: 42, artists: [26, 124, 132, 34, 770, 56, 154, 144, 1801, 96, 891] },
  { key: 'throwback', title: 'Throwback', sub: 'Songs from back then', hue: 24, era: 'old', artists: [123, 154, 158, 150, 90, 68, 106, 146, 71, 127, 12, 13, 155] },
  { key: 'fresh', title: 'Fresh Hits', sub: 'The newest songs from big artists', hue: 165, era: 'new', artists: [123, 71, 72, 155, 11, 22, 1136, 1052, 247, 969, 121, 6, 13] },
  { key: 'top', title: 'Most Played Ever', sub: 'The biggest songs on BODO', hue: 140, kind: 'top' },
  { key: 'intl', title: 'International Hits', sub: 'Pop, rap and dance from around the world', hue: 200, kind: 'intl' },
  { key: 'rai', title: 'Raï and Algerian', sub: 'Sounds of Algeria', hue: 100, artists: [38, 702, 1657, 1767, 1719] },
  { key: 'wedding', title: 'Wedding Party', sub: 'Songs for the dance floor', hue: 48, pages: ['album/1023.html'], artists: [181, 186, 22, 113] },
  { key: 'sebou', title: 'Sebou Songs', sub: 'For newborn celebrations', hue: 172, pages: ['album/1024.html'] },
  { key: 'bday', title: 'Birthday Songs', sub: 'Happy birthday!', hue: 58, pages: ['album/1051.html'] },
  { key: 'ramadan', title: 'Ramadan Nights', sub: 'Songs of the holy month', hue: 205, pages: ['album/444.html'] }
];

export async function mixSpecs(topIds) { // personal mixes, built from what you listen to
  const dir = await directory().catch(() => []);
  if (!dir.length) return [];
  const by = new Map(dir.map(a => [a.id, a])), pop = dir.slice(0, 100), r = rng('dm' + dayKey());
  const seeds = topIds.filter(id => by.has(id)).slice(0, 6);
  while (seeds.length < 3) { const c = pop[Math.floor(r() * pop.length)]; if (!seeds.includes(c.id)) seeds.push(c.id); }
  const sub = ids => ids.map(i => by.get(i)?.name).filter(Boolean).slice(0, 3).join(', ') + ' and more';
  const specs = shuffle(seeds, r).slice(0, 3).map((sid, i) => {
    const ids = [sid, ...shuffle(pop.filter(a => a.id !== sid), r).slice(0, 3).map(a => a.id)];
    return { key: 'dm' + i + dayKey(), title: 'Daily Mix ' + (i + 1), ids, lead: true, sub: sub(ids), hue: Math.floor(r() * 360) };
  });
  const dids = shuffle(pop.filter(a => !topIds.includes(a.id)), rng('dw' + weekKey())).slice(0, 6).map(a => a.id);
  specs.push({ key: 'dw' + weekKey(), title: 'Discover Weekly', ids: dids, sub: sub(dids), hue: 280 });
  specs.push({ key: 'new', title: 'New Releases', kind: 'new', sub: 'Fresh songs this week', hue: 150 });
  return specs;
}
export async function buildMix(spec) {
  if (spec.kind === 'intl') {
    const r = rng(spec.key + (spec.seed || dayKey()));
    const lists = await Promise.all(['https://mp3.pm/', 'https://mp3.pm/top/rap/', 'https://mp3.pm/top/dance_house/'].map(p => cached('ft2' + p, 6 * 60 * MIN, async () => parseExt(await extDoc(p))).catch(() => [])));
    return shuffle(dedupe(lists.flat()), r).slice(0, 40);
  }
  if (spec.kind === 'new') return dedupe(await newSongs()).slice(0, 40);
  const r = rng(spec.key + (spec.seed || dayKey()));
  const byPlays = l => dedupe(l).sort((a, b) => b.plays - a.plays);
  const ids = spec.kind === 'top' ? shuffle((await directory().catch(() => [])).slice(0, 24).map(a => a.id), r).slice(0, 12)
    : spec.lead ? spec.ids : shuffle(spec.ids || spec.artists || [], r).slice(0, 6);
  const [lists, pages, words] = await Promise.all([
    Promise.all(ids.map(id => artistSongs(id).catch(() => []))),
    Promise.all((spec.pages || []).map(p => pageSongs(p).catch(() => []))),
    Promise.all(shuffle(spec.words || [], r).slice(0, 2).map(w => wordSongs(w).catch(() => [])))
  ]);
  if (spec.kind === 'top') return byPlays(lists.flat()).slice(0, 40);
  const out = [];
  lists.forEach((l, i) => {
    let s = byPlays(l);
    if (spec.era) { const o = s.slice().sort((a, b) => a.id - b.id), k = Math.max(5, Math.ceil(o.length * (spec.era === 'old' ? .45 : .25))); s = byPlays(spec.era === 'old' ? o.slice(0, k) : o.slice(-k)); }
    out.push(...shuffle(s.slice(0, 20), r).slice(0, spec.lead && i === 0 ? 12 : 5));
  });
  pages.forEach(l => out.push(...shuffle(byPlays(l).slice(0, 50), r).slice(0, 14)));
  words.forEach(l => out.push(...shuffle(l, r).slice(0, 8)));
  return shuffle(dedupe(out), r).slice(0, 40);
}
