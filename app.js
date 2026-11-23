import * as api from './bodoApi.js';
const $ = s => document.querySelector(s), el = $('#view');
const L = (k, d) => { try { return JSON.parse(localStorage.getItem('am_' + k)) ?? d; } catch { return d; } };
const S = (k, v) => { try { localStorage.setItem('am_' + k, JSON.stringify(v)); } catch {} };
const st = { fav: L('fav', []), recent: L('recent', []), pl: L('pl', {}), hist: L('hist', []), ap: L('ap', {}), queue: [], idx: -1, shuf: false, rep: 0, view: 'home', arg: null, tab: 'home', stack: [], open: null, q: '', err: '', ext: false, fails: 0 };
const au = new Audio(); au.preload = 'none';
const lists = {}, byId = new Map();
let rtok = 0, specs = [];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = s => isFinite(s) && s > 0 ? Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') : '0:00';
const isFav = t => st.fav.some(x => x.id === t.id);
const hue = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const initial = s => (String(s || '').trim().match(/[\p{L}\p{N}]/u) || ['♪'])[0].toUpperCase();
const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
let tt; const toast = m => { let e = $('#toast'); if (!e) { e = document.createElement('div'); e.id = 'toast'; document.body.append(e); } e.textContent = m; e.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => e.classList.remove('show'), 2400); };

/* ---------- icons ---------- */
const P = {
  home: '<path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  library: '<path d="M4.5 4v16M9.5 4v16M14.5 5.5l4.5 14"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  list: '<path d="M4 7h11M4 12h11M4 17h6"/><circle cx="18" cy="16" r="2.5"/><path d="M20.5 16V8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
  back: '<path d="m15 5-7 7 7 7"/>', fwd: '<path d="m9 5 7 7-7 7"/>', down: '<path d="m6 9 6 6 6-6"/>',
  shuf: '<path d="M16 4h4v4M4 20 20 4M20 16v4h-4M15 15l5 5M4 4l5 5"/>',
  rep: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  vol: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/>', mute: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="m17 9 4 6M21 9l-4 6"/>',
  play: '<path d="M7 4.5v15l13-7.5z"/>', pause: '<rect x="6" y="4.5" width="4" height="15" rx="1"/><rect x="14" y="4.5" width="4" height="15" rx="1"/>',
  next: '<path d="M5 5v14l11-7z"/><rect x="17" y="5" width="2.5" height="14" rx="1"/>', prev: '<path d="M19 5v14L8 12z"/><rect x="4.5" y="5" width="2.5" height="14" rx="1"/>'
};
P.heartF = P.heart; P.rep1 = P.rep + '<path d="M11 10.5l1.2-1v6" stroke-width="1.6"/>';
const FILLED = new Set(['play', 'pause', 'next', 'prev', 'heartF']);
const ic = n => `<svg viewBox="0 0 24 24" class="ic${FILLED.has(n) ? ' f' : ''}" aria-hidden="true">${P[n]}</svg>`;

/* ---------- building blocks ---------- */
const art = t => t.cover ? `<img src="${esc(t.cover)}" alt="" loading="lazy">` : `<div class="ph" style="--h:${hue(t.title)}" data-lz="${t.id}">${initial(t.title)}</div>`;
const av = a => `<div class="av" data-act="artist" data-id="${a.id}">${a.cover ? `<img class="c" src="${esc(a.cover)}" alt="">` : `<div class="ph c" style="--h:${hue(a.name)}" data-az="${a.id}" data-cls="c">${initial(a.name)}</div>`}<span>${esc(a.name)}</span></div>`;
const ac = a => `<div class="ac" data-act="album" data-id="${a.id}">${a.cover ? `<img src="${esc(a.cover)}" alt="" loading="lazy">` : `<div class="ph" style="--h:${hue(a.title)}">${initial(a.title)}</div>`}<b>${esc(a.title)}</b><small>${esc([a.year, a.artist].filter(Boolean).join(' · '))}</small></div>`;
const row = (t, c, i) => {
  const a = `data-c="${esc(c)}" data-i="${i}"`, f = isFav(t);
  const who = t.artistId ? `<span class="lnk" data-act="artist" data-id="${t.artistId}">${esc(t.artist)}</span>` : esc(t.artist);
  return `<div class="row">${art(t)}<div class="m" data-act="play" ${a}><b>${esc(t.title)}</b><small>${who}${t.album ? ' · ' + esc(t.album) : ''}</small></div><button data-act="fav" ${a} class="${f ? 'on' : ''}" aria-label="Favorite">${ic(f ? 'heartF' : 'heart')}</button>${c.startsWith('pl:') ? `<button data-act="rm" ${a} aria-label="Remove from playlist">${ic('x')}</button>` : `<button data-act="add" ${a} aria-label="Add to playlist">${ic('plus')}</button>`}</div>`;
};
const list = (a, c) => { lists[c] = a; a.forEach(t => byId.set(t.id, t)); return a.length ? a.map((t, i) => row(t, c, i)).join('') : '<p class="e">Nothing here yet. Tap the heart next to any song to save it.</p>'; };
const chip = n => `<button class="chip" data-act="q" data-q="${esc(n)}">${esc(n)}</button>`;
const backBar = () => `<button class="chip" data-act="goback">${ic('back')}Back</button>`;

// covers and artist photos load only when they scroll into view
const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return; const n = e.target; io.unobserve(n);
  const swap = u => { if (!u || !n.isConnected) return; const im = new Image(); im.src = u; im.alt = ''; im.className = n.dataset.cls || ''; n.replaceWith(im); };
  if (n.dataset.lz) { const t = byId.get(+n.dataset.lz); if (t) api.resolve(t).then(() => swap(t.cover)).catch(() => {}); }
  else if (n.dataset.az) api.artist(+n.dataset.az).then(a => swap(a.cover)).catch(() => {});
}), { rootMargin: '250px' });
const lazy = () => document.querySelectorAll('.ph[data-lz],.ph[data-az]').forEach(n => { if (!n.__o) { n.__o = 1; io.observe(n); } });
new MutationObserver(lazy).observe(el, { childList: true, subtree: true });

/* ---------- search ---------- */
let tok = 0;
async function run(q) {
  const r = $('#res'), n = ++tok; if (!r) return;
  if (q.length < 2) { r.innerHTML = ''; return; }
  r.innerHTML = '<p class="ld">Searching…</p>';
  try {
    const x = await api.search(q); if (n !== tok || !$('#res')) return;
    const top = x.topArtist;
    r.innerHTML = (top ? `<div class="trc" data-act="artist" data-id="${top.id}">${top.cover ? `<img class="c" src="${esc(top.cover)}" alt="">` : `<div class="ph c" style="--h:${hue(top.name)}">${initial(top.name)}</div>`}<div><b>${esc(top.name)}</b><small>Artist · ${top.count} songs · all songs and albums</small></div>${ic('fwd')}</div>` : '')
      + (x.artists.length > 1 ? '<h2>Artists</h2><div class="hs">' + x.artists.map(av).join('') + '</div>' : '')
      + (x.songs.length ? '<h2>Songs</h2>' + list(x.songs, 's') : (x.artists.length ? '' : `<p class="e">No results for “${esc(q)}”. Try different words.</p>`))
      + (x.albums.length ? '<h2>Albums</h2><div class="hs">' + x.albums.map(ac).join('') + '</div>' : '');
  } catch { if (n === tok && $('#res')) $('#res').innerHTML = '<p class="er">Couldn’t reach the music source. Check your connection and try again.</p>'; }
}
const ch = () => { const c = $('#ch'); if (c) c.innerHTML = st.hist.filter(h => h.includes($('#q').value)).slice(0, 8).map(chip).join(''); };
const topIds = () => [...new Set([...Object.entries(st.ap).sort((a, b) => b[1] - a[1]).map(([k]) => +k), ...st.fav.map(f => f.artistId).filter(Boolean)])];

/* ---------- views ---------- */
const V = {
  home() {
    const rc = st.recent.slice(0, 6); lists.rc = rc; rc.forEach(t => byId.set(t.id, t));
    el.innerHTML = `<h2 class="g">${greet()}</h2>` + (rc.length ? '<div class="grid">' + rc.map((t, i) => `<div class="gc" data-act="play" data-c="rc" data-i="${i}">${art(t)}<b>${esc(t.title)}</b></div>`).join('') + '</div>' : '')
      + '<div id="mx"></div><div id="na"></div><div id="pa"></div>' + (st.fav.length ? '<h2>Your favorites</h2>' + list(st.fav.slice(0, 3), 'hf') : '') + '<h2>Trending now</h2><div id="tr"><p class="ld">Loading…</p></div>';
    const k = rtok, ok = () => k === rtok && st.view === 'home';
    api.mixSpecs(topIds()).then(sp => { if (!ok() || !sp.length) return; specs = sp; $('#mx').innerHTML = '<h2>Made for you</h2><div class="hs">' + sp.map((s, i) => `<div class="mc" data-act="mix" data-i="${i}" style="--h:${s.hue}"><b>${esc(s.title)}</b><small>${esc(s.sub)}</small></div>`).join('') + '</div>'; }).catch(() => {});
    api.home().then(h => { if (!ok()) return; if (h.albums.length) $('#na').innerHTML = '<h2>New albums</h2><div class="hs">' + h.albums.slice(0, 10).map(ac).join('') + '</div>'; $('#tr').innerHTML = list(h.songs.slice(0, 25), 'tr'); })
      .catch(() => { if (ok()) $('#tr').innerHTML = '<p class="er">Couldn’t load songs. Check your connection.</p>'; });
    api.directory().then(d => { if (ok() && d.length) $('#pa').innerHTML = '<h2>Popular artists</h2><div class="hs">' + d.slice(0, 14).map(av).join('') + '</div>'; }).catch(() => {});
  },
  search() { el.innerHTML = `<h2 class="g">Search</h2><input id="q" type="search" dir="auto" placeholder="Artists, songs or albums" value="${esc(st.q)}" enterkeyhint="search" autocomplete="off"><div class="chips" id="ch"></div><div id="res"></div>`; ch(); run(st.q); },
  async artist(id) {
    el.innerHTML = backBar() + '<p class="ld">Loading…</p>'; const k = rtok;
    try {
      const a = await api.artist(id); if (k !== rtok) return;
      const pop = a.songs.slice().sort((x, y) => y.plays - x.plays).slice(0, 10);
      el.innerHTML = backBar() + `<div class="hero">${a.cover ? `<img class="c" src="${esc(a.cover)}" alt="">` : `<div class="ph c" style="--h:${hue(a.name)}">${initial(a.name)}</div>`}<div><small>ARTIST</small><h2>${esc(a.name)}</h2><small>${a.songs.length} songs${a.albums.length ? ' · ' + a.albums.length + ' albums' : ''}</small></div></div>`
        + `<div class="acts"><button class="big" data-act="playall" data-c="ar" aria-label="Play all">${ic('play')}</button><button class="chip" data-act="shufall" data-c="ar">${ic('shuf')}Shuffle</button></div>`
        + '<h2>Popular</h2>' + list(pop, 'ap') + (a.albums.length ? '<h2>Albums</h2><div class="hs">' + a.albums.map(ac).join('') + '</div>' : '') + `<h2>All songs</h2>` + list(a.songs, 'ar');
    } catch { if (k === rtok) el.innerHTML = backBar() + '<p class="er">Couldn’t load this artist. Check your connection.</p>'; }
  },
  async album(id) {
    el.innerHTML = backBar() + '<p class="ld">Loading…</p>'; const k = rtok;
    try {
      const a = await api.album(id); if (k !== rtok) return;
      el.innerHTML = backBar() + `<div class="hero">${a.cover ? `<img src="${esc(a.cover)}" alt="">` : `<div class="ph" style="--h:${hue(a.title)}">${initial(a.title)}</div>`}<div><small>ALBUM${a.year ? ' · ' + a.year : ''}</small><h2>${esc(a.title)}</h2>${a.artistId ? `<small class="lnk" data-act="artist" data-id="${a.artistId}">${esc(a.artist)}</small>` : `<small>${esc(a.artist)}</small>`}</div></div>`
        + `<div class="acts"><button class="big" data-act="playall" data-c="al" aria-label="Play all">${ic('play')}</button><button class="chip" data-act="shufall" data-c="al">${ic('shuf')}Shuffle</button></div>` + list(a.songs, 'al');
    } catch { if (k === rtok) el.innerHTML = backBar() + '<p class="er">Couldn’t load this album. Check your connection.</p>'; }
  },
  library() { el.innerHTML = `<h2 class="g">Your library</h2><div class="chips"><button class="chip" data-go="favorites">Favorites (${st.fav.length})</button><button class="chip" data-go="playlists">Playlists (${Object.keys(st.pl).length})</button></div><h2>Recently played</h2>` + list(st.recent, 'rc'); },
  favorites() { el.innerHTML = '<h2 class="g">Favorites</h2>' + list(st.fav, 'fv'); },
  playlists() {
    const n = st.open;
    if (n && st.pl[n]) el.innerHTML = `<div class="chips"><button class="chip" data-act="back">${ic('back')}Back</button><button class="chip" data-act="pldel" data-n="${esc(n)}">Delete playlist</button></div><h2 class="g">${esc(n)}</h2>` + list(st.pl[n], 'pl:' + n);
    else el.innerHTML = '<h2 class="g">Playlists</h2><button class="chip" data-act="plnew">' + ic('plus') + 'New playlist</button>' + (Object.keys(st.pl).map(k => `<div class="row" data-act="plopen" data-n="${esc(k)}"><div class="ph" style="--h:${hue(k)}">${ic('list')}</div><div class="m"><b>${esc(k)}</b><small>${st.pl[k].length} songs</small></div></div>`).join('') || '<p class="e">Create your first playlist, or tap + next to any song.</p>');
  }
};
const NAV = [['home', 'home', 'Home'], ['search', 'search', 'Search'], ['library', 'library', 'Library'], ['favorites', 'heart', 'Favorites'], ['playlists', 'list', 'Playlists']];
const NAVV = NAV.map(n => n[0]);
const renderNav = () => { $('#nav').innerHTML = NAV.map(([k, i, n]) => `<button data-go="${k}" class="${k === st.tab ? 'on' : ''}"><i>${ic(i)}</i>${n}</button>`).join(''); };
function go(v, arg, o = {}) {
  if (!o.back) { if (v === 'artist' || v === 'album') st.stack.push({ v: st.view, a: st.arg, y: scrollY }); else st.stack = []; }
  st.view = v; st.arg = arg; st.open = null; rtok++;
  if (NAVV.includes(v)) st.tab = v;
  renderNav(); V[v](arg);
  if (o.y != null) requestAnimationFrame(() => scrollTo(0, o.y)); else scrollTo(0, 0);
}
const back = () => { const p = st.stack.pop(); if (p) go(p.v, p.a, { back: 1, y: p.y }); else go(st.tab || 'home'); };

/* ---------- lock screen / media session ---------- */
const ms = navigator.mediaSession;
function msMeta(t) {
  if (!ms) return;
  try { ms.metadata = new MediaMetadata({ title: t.title, artist: t.artist, album: t.album || 'BODO', artwork: t.cover ? [{ src: new URL(t.cover, location.href).href, sizes: '512x512' }] : [] }); } catch {}
}
function bindMS() {
  if (!ms) return;
  const h = (a, f) => { try { ms.setActionHandler(a, f); } catch {} };
  h('seekbackward', null); h('seekforward', null);
  h('play', () => au.play().catch(() => {})); h('pause', () => au.pause());
  h('nexttrack', () => next(false)); h('previoustrack', () => prev());
  h('seekto', d => { if (d.seekTime != null) au.currentTime = d.seekTime; });
}
bindMS();
au.addEventListener('playing', () => { const t = st.queue[st.idx]; if (t) msMeta(t); bindMS(); });

/* ---------- player ---------- */
const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=';
const isReal = () => !au.src.startsWith('data:');
let unlocked = false; // lets iOS play audio after a network wait
document.addEventListener('click', () => { if (unlocked) return; unlocked = true; if (!au.src) { au.src = SILENT; au.play().then(() => { if (!isReal()) au.pause(); }).catch(() => {}); } }, { capture: true });

function play(l, i) { st.queue = l.slice(); st.idx = i; st.fails = 0; load(); }
let lt = 0;
async function load() {
  const t = st.queue[st.idx]; if (!t) return; const my = ++lt; st.err = ''; msMeta(t); drawP();
  try {
    if (!(t.mp3 && t._r)) await api.resolve(t);
    if (my !== lt) return;
    msMeta(t); au.src = t.mp3; drawP(); await au.play(); st.fails = 0;
  } catch (e) {
    if (my !== lt || e.name === 'AbortError') return;
    st.err = 'Couldn’t play this song. Skipping…'; drawP();
    if (++st.fails <= 3) setTimeout(() => { if (my === lt) next(true); }, 1200);
    return;
  }
  if (my !== lt) return;
  st.recent = [t, ...st.recent.filter(x => x.id !== t.id)].slice(0, 30); S('recent', st.recent);
  if (t.artistId) { st.ap[t.artistId] = (st.ap[t.artistId] || 0) + 1; S('ap', st.ap); }
  drawP();
  const nx = st.queue[st.idx + 1]; if (nx && !nx._r) api.resolve(nx).catch(() => {}); // get the next song ready
  if (st.queue.length - st.idx <= 3) extend();
}

// endless play: when the queue runs low, add songs by the same artist, your favorites and trending
async function radioTracks() {
  const key = t => api.norm(t.title) + '|' + (t.artistId || t.artist), have = new Set(st.queue.map(key)), out = [];
  const cur = st.queue[st.idx];
  const add = (arr, k) => { let n = 0; for (const x of api.shuffle(arr)) { if (n >= k) break; if (have.has(key(x))) continue; have.add(key(x)); out.push(x); n++; } };
  const pop = arr => arr.slice().sort((a, b) => b.plays - a.plays).slice(0, Math.max(15, arr.length / 3 | 0));
  if (cur?.artistId) add(pop(await api.artistSongs(cur.artistId).catch(() => [])), 7);
  const pool = topIds().filter(id => id !== cur?.artistId);
  for (const id of api.shuffle(pool).slice(0, 2)) add(pop(await api.artistSongs(id).catch(() => [])), 4);
  const h = await api.home().catch(() => null); if (h) add(h.songs, 4);
  return api.shuffle(out);
}
async function extend() {
  if (st.ext) return; st.ext = true;
  try { const m = await radioTracks(); if (m.length) { st.queue.push(...m); if (!$('#full').hidden) drawP(); } } catch {}
  st.ext = false;
}
async function next(auto) {
  let n = st.queue.length; if (!n) return;
  if (auto && st.rep === 2) { au.currentTime = 0; au.play(); return; }
  let i = st.shuf ? Math.floor(Math.random() * n) : st.idx + 1;
  if (i >= n) {
    if (st.rep) i = 0;
    else { await extend(); n = st.queue.length; if (i >= n) { if (auto) { au.pause(); return; } i = 0; } }
  }
  st.idx = i; load();
}
function prev() { if (!st.queue.length) return; if (au.currentTime > 3) { au.currentTime = 0; return; } st.idx = (st.idx - 1 + st.queue.length) % st.queue.length; load(); }
au.onended = () => { if (isReal()) next(true); };
au.onerror = () => { if (!isReal()) return; st.err = 'This song isn’t available right now.'; drawP(); };
au.onplay = au.onpause = au.onloadedmetadata = () => drawP();
au.ontimeupdate = () => {
  const p = $('#mpb'); if (p) p.style.width = (au.duration ? au.currentTime / au.duration * 100 : 0) + '%';
  const s = $('#seek'); if (s) { s.max = au.duration || 0; s.value = au.currentTime; $('#ct').textContent = fmt(au.currentTime); $('#dt').textContent = fmt(au.duration); }
  if (ms && isFinite(au.duration) && au.duration > 0) { try { ms.setPositionState({ duration: au.duration, playbackRate: au.playbackRate || 1, position: Math.min(au.currentTime, au.duration) }); } catch {} }
};
function drawP() {
  const t = st.queue[st.idx], m = $('#mini'); m.hidden = !t; if (!t) return;
  if (ms) ms.playbackState = au.paused ? 'paused' : 'playing';
  const pl = ic(au.paused ? 'play' : 'pause'), w = au.duration ? au.currentTime / au.duration * 100 : 0;
  const cv = t.cover ? `<img src="${esc(t.cover)}" alt="">` : `<div class="ph" style="--h:${hue(t.title)}">${initial(t.title)}</div>`;
  m.innerHTML = `${cv}<div class="mt" data-act="expand"><b>${esc(t.title)}</b><small>${st.err ? esc(st.err) : esc(t.artist)}</small></div><button data-act="pp" aria-label="Play or pause">${pl}</button><button data-act="next" aria-label="Next">${ic('next')}</button><div class="mp"><i id="mpb" style="width:${w}%"></i></div>`;
  if (!$('#full').hidden) $('#full').innerHTML = `<button data-act="close" class="cl" aria-label="Close">${ic('down')}</button>${t.cover ? `<img class="big" src="${esc(t.cover)}" alt="">` : `<div class="ph big" style="--h:${hue(t.title)}">${initial(t.title)}</div>`}<h2>${esc(t.title)}</h2><small>${t.artistId ? `<span class="lnk" data-act="artist" data-id="${t.artistId}">${esc(t.artist)}</span>` : esc(t.artist)}</small>${st.err ? `<p class="er">${esc(st.err)}</p>` : ''}<input id="seek" type="range" min="0" max="${au.duration || 0}" step="1" value="${au.currentTime}" dir="ltr"><div class="tm" dir="ltr"><span id="ct">${fmt(au.currentTime)}</span><span id="dt">${fmt(au.duration)}</span></div><div class="ctl" dir="ltr"><button data-act="shuf" class="${st.shuf ? 'on' : ''}" aria-label="Shuffle">${ic('shuf')}</button><button data-act="prev" aria-label="Previous">${ic('prev')}</button><button class="pp" data-act="pp" aria-label="Play or pause">${pl}</button><button data-act="next" aria-label="Next">${ic('next')}</button><button data-act="rep" class="${st.rep ? 'on' : ''}" aria-label="Repeat">${ic(st.rep === 2 ? 'rep1' : 'rep')}</button></div><div class="vol" dir="ltr"><button data-act="mute" aria-label="Mute">${ic(au.muted ? 'mute' : 'vol')}</button><input id="vol" type="range" min="0" max="1" step=".05" value="${au.volume}"></div><h2>Queue</h2>` + st.queue.map((x, i) => `<div class="q ${i === st.idx ? 'cur' : ''}" data-act="qplay" data-i="${i}">${esc(x.title)} — ${esc(x.artist)}</div>`).join('');
}

/* ---------- events ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act],[data-go]'); if (!b) return;
  const d = b.dataset, a = d.act; if (d.go && !a) return go(d.go);
  const t = lists[d.c]?.[d.i];
  const A = {
    play: () => play(lists[d.c], +d.i),
    fav: () => { st.fav = isFav(t) ? st.fav.filter(x => x.id !== t.id) : [t, ...st.fav]; S('fav', st.fav); b.innerHTML = ic(isFav(t) ? 'heartF' : 'heart'); b.classList.toggle('on', isFav(t)); },
    add: () => { const k = (prompt('Playlist name' + (Object.keys(st.pl).length ? '\nPlaylists: ' + Object.keys(st.pl).join(', ') : '')) || '').trim(); if (!k) return; st.pl[k] = st.pl[k] || []; if (!st.pl[k].some(x => x.id === t.id)) st.pl[k].push(t); S('pl', st.pl); b.innerHTML = ic('check'); b.classList.add('on'); },
    rm: () => { st.pl[d.c.slice(3)].splice(+d.i, 1); S('pl', st.pl); V.playlists(); },
    q: () => { st.q = d.q; go('search'); },
    plnew: () => { const k = (prompt('New playlist name') || '').trim(); if (k) { st.pl[k] = st.pl[k] || []; S('pl', st.pl); V.playlists(); } },
    plopen: () => { st.open = d.n; V.playlists(); },
    pldel: () => { if (confirm('Delete this playlist?')) { delete st.pl[d.n]; S('pl', st.pl); st.open = null; V.playlists(); } },
    back: () => { st.open = null; V.playlists(); },
    goback: () => back(),
    artist: () => { $('#full').hidden = true; go('artist', +d.id); },
    album: () => go('album', +d.id),
    mix: () => { const s = specs[+d.i]; if (!s) return; toast('Building ' + s.title + '…'); api.buildMix(s).then(l => l.length ? play(l, 0) : toast('Couldn’t build this mix')).catch(() => toast('Couldn’t build this mix')); },
    playall: () => { const l = lists[d.c]; if (l?.length) play(l, 0); },
    shufall: () => { const l = lists[d.c]; if (l?.length) play(api.shuffle(l), 0); },
    expand: () => { $('#full').hidden = false; drawP(); },
    close: () => { $('#full').hidden = true; },
    pp: () => { if (au.src && isReal()) au.paused ? au.play().catch(() => {}) : au.pause(); },
    next: () => next(false), prev,
    shuf: () => { st.shuf = !st.shuf; drawP(); },
    rep: () => { st.rep = (st.rep + 1) % 3; drawP(); },
    mute: () => { au.muted = !au.muted; drawP(); },
    qplay: () => { st.idx = +d.i; load(); }
  };
  (A[a] || (() => {}))();
});
let dt;
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'q') { st.q = t.value.trim(); ch(); clearTimeout(dt); dt = setTimeout(() => run(st.q), 450); }
  else if (t.id === 'seek') au.currentTime = t.value;
  else if (t.id === 'vol') { au.volume = t.value; au.muted = false; }
});
document.addEventListener('change', e => { if (e.target.id === 'q' && st.q.length > 1) { st.hist = [st.q, ...st.hist.filter(h => h !== st.q)].slice(0, 15); S('hist', st.hist); } });
go('home');
