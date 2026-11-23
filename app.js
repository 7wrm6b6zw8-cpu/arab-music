import * as src from './musicSourceAdapter.js';
import { getEgyptTopSongs, getArabRegionSongs, getGlobalTopSongs, resolveChartTrack } from './egyptCharts.js';
const $ = s => document.querySelector(s), el = $('#view');
const L = (k, d) => { try { return JSON.parse(localStorage.getItem('am_' + k)) ?? d; } catch { return d; } };
const S = (k, v) => { try { localStorage.setItem('am_' + k, JSON.stringify(v)); } catch {} };
const st = { fav: L('fav', []), recent: L('recent', []), pl: L('pl', {}), hist: L('hist', []), taste: L('taste', {}), queue: [], idx: -1, shuf: false, rep: 0, view: 'home', open: null, q: '', err: '', fetching: false, radio: null, pendingAdvance: false, prefetchAtIdx: -1, radioSeen: [] };
const au = new Audio(); au.preload = 'none';
const lists = {};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = s => isFinite(s) && s > 0 ? Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') : '0:00';
const isFav = t => st.fav.some(x => x.id === t.id);

// الميكسات الثابتة والاحترافية
const MIX_SECTIONS = [
  { title: "Egypt First · Trending", mixes: {
    "Egypt Top Hits": ["Amr Diab", "Tamer Hosny", "Wegz", "Sherine", "Ahmed Saad", "Ruby", "Bahaa Sultan", "Ramy Sabry"],
    "Egyptian New & Trending": ["Ahmed Saad", "Toul8", "Wegz", "Marwan Pablo", "Ruby", "Muslim", "Tamer Ashour", "Amr Diab"]
  }},
  { title: "Mood & Pop", mixes: {
    "Arabic Top Hits": ["Amr Diab", "Tamer Hosny", "Sherine", "Ramy Sabry", "Angham", "Bahaa Sultan"],
    "Romantic Mix": ["Tamer Ashour", "Wael Kfoury", "Amr Diab", "Assala", "Sherine", "Angham", "Ramy Sabry"],
    "Party & Dance": ["Mohamed Ramadan", "Wegz", "Hassan Shakosh", "Tamer Hosny", "Ahmed Saad"]
  }},
  { title: "Street & Youth", mixes: {
    "Mahraganat": ["Hamo El Mardashy", "Essam Sasa", "Omar Kamal", "Hassan Shakosh", "Muslim"],
    "Arabic Rap": ["Wegz", "Marwan Pablo", "Afroto", "Abyusif", "Mousv"],
    "Modern Egypt": ["Mohamed Ramadan", "Wegz", "Marwan Pablo", "Sherine", "Ahmed Saad"]
  }},
  { title: "Classics & Tarab", mixes: {
    "Golden Era": ["Umm Kulthum", "Abdel Halim Hafez", "Warda", "Mohamed Abdel Wahab"]
  }},
  { title: "Top Egyptian Artists", mixes: {
    "Amr Diab Mix": ["Amr Diab"], "Tamer Hosny Mix": ["Tamer Hosny"], "Sherine Mix": ["Sherine"],
    "Wegz Mix": ["Wegz"], "Ahmed Saad Mix": ["Ahmed Saad"]
  }}
];

const ALL_MIXES = {};
MIX_SECTIONS.forEach(sec => {
  for (const [name, queries] of Object.entries(sec.mixes)) ALL_MIXES[name] = queries;
});

const P = {
  home: '<path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  library: '<path d="M4.5 4v16M9.5 4v16M14.5 5.5l4.5 14"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  list: '<path d="M4 7h11M4 12h11M4 17h6"/><circle cx="18" cy="16" r="2.5"/><path d="M20.5 16V8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  back: '<path d="m15 5-7 7 7 7"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  shuf: '<path d="M16 4h4v4M4 20 20 4M20 16v4h-4M15 15l5 5M4 4l5 5"/>',
  rep: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  vol: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/>',
  mute: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="m17 9 4 6M21 9l-4 6"/>',
  play: '<path d="M7 4.5v15l13-7.5z"/>',
  pause: '<rect x="6" y="4.5" width="4" height="15" rx="1"/><rect x="14" y="4.5" width="4" height="15" rx="1"/>',
  next: '<path d="M5 5v14l11-7z"/><rect x="17" y="5" width="2.5" height="14" rx="1"/>',
  prev: '<path d="M19 5v14L8 12z"/><rect x="4.5" y="5" width="2.5" height="14" rx="1"/>'
};
P.heartF = P.heart;
P.rep1 = P.rep + '<path d="M11 10.5l1.2-1v6" stroke-width="1.6"/>';
const FILLED = new Set(['play', 'pause', 'next', 'prev', 'heartF']);
const ic = n => `<svg viewBox="0 0 24 24" class="ic${FILLED.has(n) ? ' f' : ''}" aria-hidden="true">${P[n]}</svg>`;
const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
const shuffleArray = arr => { const copy = [...arr]; for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; } return copy; };
function preferredArtists() {
  const scores = {};
  [...st.fav, ...st.recent].forEach(track => { const key = track.artist; if (key) scores[key] = (scores[key] || 0) + (isFav(track) ? 5 : 1); });
  Object.entries(st.taste).forEach(([artist, data]) => { scores[artist] = (scores[artist] || 0) + Math.max(0, Number(data?.plays) || 0) * 2 + Math.max(0, Number(data?.completed) || 0) * 2 - Math.max(0, Number(data?.skips) || 0) * 2; });
  return Object.keys(scores).filter(name => scores[name] > 0).sort((a, b) => scores[b] - scores[a]).slice(0, 5);
}
const EGYPTIAN_ARTISTS = ['Amr Diab','Tamer Hosny','Wegz','Sherine','Ahmed Saad','Ruby','Ramy Sabry','Tamer Ashour','Angham','Bahaa Sultan','Marwan Pablo','Afroto','Muslim','Hassan Shakosh','Essam Sasa','Mohamed Hamaki','Hamza Namira','Cairokee','Marwan Moussa','Abyusif','Ahmed Kamel','Donia Samir Ghanem','Hamo Bika','Oka Ortega'];
const EGYPTIAN_ARTIST_ALIASES = ['عمرو دياب','تامر حسني','ويجز','شيرين','احمد سعد','أحمد سعد','روبي','رامي صبري','تامر عاشور','أنغام','بهاء سلطان','مروان بابلو','أفروتو','مسلم','حسن شاكوش','عصام صاصا','محمد حماقي','حمزة نمرة','كايروكي','مروان موسى','أبيوسف','أحمد كامل','حمو بيكا'];
function isEgyptianArtist(name = '') { const value = String(name).toLowerCase(); return EGYPTIAN_ARTISTS.some(x => value.includes(x.toLowerCase())) || EGYPTIAN_ARTIST_ALIASES.some(x => value.includes(x)); }
async function mapLimit(items, limit, fn) { const out = new Array(items.length); let next = 0; await Promise.all(Array.from({length: Math.min(limit, items.length)}, async () => { while (next < items.length) { const i = next++; try { out[i] = await fn(items[i], i); } catch { out[i] = null; } } })); return out; }
function trackKey(t) { return `${String(t?.title||'').toLowerCase().trim()}|${String(t?.artist||'').toLowerCase().trim()}`; }
function uniqueTracks(items) { const seen = new Set(); return (items || []).filter(t => t?.title && t?.artist && !seen.has(trackKey(t)) && seen.add(trackKey(t))); }
function recordTaste(track, event) {
  if (!track?.artist) return;
  const key = track.artist; const item = st.taste[key] || { plays: 0, skips: 0, completed: 0 };
  item[event] = (Number(item[event]) || 0) + 1; st.taste[key] = item; S('taste', st.taste);
}

const row = (t, c, i) => {
  const a = `data-c="${esc(c)}" data-i="${i}"`, f = isFav(t);
  const artistSpan = `<span style="text-decoration:underline;cursor:pointer" data-artist="${esc(t.artist)}" data-artistid="${esc(t.artistId || '')}">${esc(t.artist)}</span>`;
  return `<div class="row"><img src="${esc(t.cover)}" alt="" loading="lazy"><div class="m" data-act="play" ${a}><b>${esc(t.title)}</b><small>${artistSpan}${t.album ? ' · ' + esc(t.album) : ''}</small></div><button data-act="fav" ${a} class="${f ? 'on' : ''}">${ic(f ? 'heartF' : 'heart')}</button>${c.startsWith('pl:') ? `<button data-act="rm" ${a}>${ic('x')}</button>` : `<button data-act="add" ${a}>${ic('plus')}</button>`}</div>`;
};
const list = (a, c) => { lists[c] = Array.isArray(a) ? a : []; return lists[c].length ? lists[c].map((t, i) => row(t, c, i)).join('') : '<p class="e">Nothing here yet.</p>'; };
const chartList = (tracks, key) => {
  const sourceTracks = Array.isArray(tracks) ? tracks : [];
  lists[key] = key === 'chart-eg' ? sourceTracks.slice().sort((a, b) => Number(isEgyptianArtist(b.artist)) - Number(isEgyptianArtist(a.artist)) || (a.chartRank || 999) - (b.chartRank || 999)) : sourceTracks;
  return lists[key].length ? lists[key].slice(0, 20).map((track, index) => `<div class="row chart-row"><span class="chart-rank">${index + 1}</span><img src="${esc(track.cover)}" alt="" loading="lazy"><div class="m"><b>${esc(track.title)}</b><small>${esc(track.artist)} · ${esc(track.album)}</small></div><button data-act="chartplay" data-list="${esc(key)}" data-i="${index}" aria-label="Find and play ${esc(track.title)}">${ic('play')}</button></div>`).join('') : '<p class="e">No chart tracks are available right now.</p>';
};
const chip = n => `<button class="chip" data-act="q" data-q="${esc(n)}">${esc(n)}</button>`;

let tok = 0;
async function run(q) {
  const r = $('#res'), n = ++tok; if (!r) return;
  if (String(q || '').length < 2) { r.innerHTML = ''; return; }
  r.innerHTML = '<p class="ld">Searching…</p>';
  try {
    let a = await src.search(String(q || '').trim()); if (n !== tok) return;
    const seen = new Set(); a = a.filter(t => { const k = (t.title + t.artist).toLowerCase(); return seen.has(k) ? false : seen.add(k); });
    r.innerHTML = a.length ? list(a, 's') : `<p class="e">No results for “${esc(q)}”.</p>`;
  } catch { if (n === tok) r.innerHTML = '<p class="er">Couldn’t reach the music source.</p>'; }
}
const ch = () => { const c = $('#ch'); if (c) c.innerHTML = st.hist.filter(h => h.includes($('#q').value)).slice(0, 8).map(chip).join(''); };

const V = {
  home() {
    const rc = st.recent.slice(0, 6); lists.rc = rc;
    const topArtists = preferredArtists();
    let mixesHtml = '';
    if (topArtists.length) {
      mixesHtml += `<h2>Made For You</h2><div class="h-scroll"><div class="card" data-act="rec"><div class="mix-art daily">Daily<br>Mix</div><b>Daily Mix</b><small>${esc(topArtists.slice(0, 2).join(' · '))}</small></div></div>`;
    }
    MIX_SECTIONS.forEach(section => {
      const cards = shuffleArray(Object.keys(section.mixes)).map(mixName => `<div class="card" data-act="mix" data-mix="${esc(mixName)}"><div class="mix-art">${esc(mixName)}</div><b>${esc(mixName)}</b><small>Curated mix</small></div>`).join('');
      mixesHtml += `<h2>${esc(section.title)}</h2><div class="h-scroll">${cards}</div>`;
    });
    el.innerHTML = `<h2 class="g">${greet()}</h2>` +
      (rc.length ? '<div class="grid">' + rc.map((track, i) => `<div class="gc" data-act="play" data-c="rc" data-i="${i}"><img src="${esc(track.cover)}" alt="" loading="lazy"><b>${esc(track.title)}</b></div>`).join('') + '</div>' : '') +
      mixesHtml + '<h2>Egypt Top 100</h2><p class="chart-note">Apple Music chart · Egypt</p><div id="eg-chart"><p class="ld">Loading Egypt chart…</p></div><h2>Arab Region Picks</h2><p class="chart-note">Combined discovery from Saudi Arabia and UAE charts</p><div id="ar-chart"><p class="ld">Loading Arab region charts…</p></div><h2>Global Discovery · US Top 100</h2><p class="chart-note">Apple Music chart · United States storefront</p><div id="global-chart"><p class="ld">Loading global chart…</p></div><h2>More from your playback sources</h2><div id="tr"><p class="ld">Loading…</p></div>'; 

    getEgyptTopSongs().then(tracks => {
      if (st.view === 'home' && $('#eg-chart')) $('#eg-chart').innerHTML = chartList(tracks, 'chart-eg');
    }).catch(() => {
      if (st.view === 'home' && $('#eg-chart')) $('#eg-chart').innerHTML = '<p class="er">Couldn’t load the Egypt chart. Check your connection and try again.</p>';
    });
    getArabRegionSongs().then(tracks => {
      if (st.view === 'home' && $('#ar-chart')) $('#ar-chart').innerHTML = chartList(tracks, 'chart-ar');
    }).catch(() => { if (st.view === 'home' && $('#ar-chart')) $('#ar-chart').innerHTML = '<p class="er">Arab region charts are unavailable right now.</p>'; });
    getGlobalTopSongs().then(tracks => {
      if (st.view === 'home' && $('#global-chart')) $('#global-chart').innerHTML = chartList(tracks, 'chart-global');
    }).catch(() => { if (st.view === 'home' && $('#global-chart')) $('#global-chart').innerHTML = '<p class="er">Global chart is unavailable right now.</p>'; });
    src.trending().then(tracks => {
      if (st.view === 'home' && $('#tr')) $('#tr').innerHTML = list(tracks.slice(0, 20), 'tr');
    }).catch(() => {
      if (st.view === 'home' && $('#tr')) $('#tr').innerHTML = '<p class="er">Couldn’t load tracks from the playback source.</p>';
    });
  },
  search() { el.innerHTML = `<h2 class="g">Search</h2><input id="q" type="search" dir="auto" placeholder="What do you want to listen to?" value="${esc(st.q)}" enterkeyhint="search" autocomplete="off"><div class="chips" id="ch"></div><div id="res"></div>`; ch(); run(st.q); },
  library() { el.innerHTML = `<h2 class="g">Your library</h2><div class="chips"><button class="chip" data-go="favorites">Favorites (${st.fav.length})</button><button class="chip" data-go="playlists">Playlists (${Object.keys(st.pl).length})</button></div><h2>Recently played</h2>` + list(st.recent, 'rc'); },
  favorites() { el.innerHTML = '<h2 class="g">Favorites</h2>' + list(st.fav, 'fv'); },
  playlists() {
    const n = st.open;
    if (n && st.pl[n]) el.innerHTML = `<div class="chips"><button class="chip" data-act="back">${ic('back')}Back</button><button class="chip" data-act="pldel" data-n="${esc(n)}">Delete playlist</button></div><h2 class="g">${esc(n)}</h2>` + list(st.pl[n], 'pl:' + n);
    else el.innerHTML = '<h2 class="g">Playlists</h2><button class="chip" data-act="plnew">' + ic('plus') + 'New playlist</button>' + (Object.keys(st.pl).map(k => `<div class="row" data-act="plopen" data-n="${esc(k)}"><div class="ph">${ic('list')}</div><div class="m"><b>${esc(k)}</b><small>${st.pl[k].length} songs</small></div></div>`).join('') || '<p class="e">Create your first playlist.</p>');
  },
  artist(name, id) {
    el.innerHTML = `<div class="chips"><button class="chip" data-act="backhome">${ic('back')}Back</button></div><h2 class="g">${esc(name)}</h2><div id="artist-res"><p class="ld">Loading…</p></div>`;
    (id ? src.getArtist(id) : Promise.resolve([])).then(tracks => {
      if (st.view === 'artist') $('#artist-res').innerHTML = list(tracks, 'artist');
    }).catch(() => {
      if (st.view === 'artist') $('#artist-res').innerHTML = '<p class="er">Couldn’t load songs.</p>';
    });
  }
};
const NAV = [['home', 'home', 'Home'], ['search', 'search', 'Search'], ['library', 'library', 'Library'], ['favorites', 'heart', 'Favorites'], ['playlists', 'list', 'Playlists']];
function go(v) { st.view = v; st.open = null; $('#nav').innerHTML = NAV.map(([k, i, n]) => `<button data-go="${k}" class="${k === v ? 'on' : ''}"><i>${ic(i)}</i>${n}</button>`).join(''); V[v](); scrollTo(0, 0); }

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

let loadSequence = 0;
function play(tracks, index, radioContext = null) {
  if (!Array.isArray(tracks) || !tracks.length || !tracks[index]) return;
  st.queue = uniqueTracks(tracks);
  st.idx = Math.max(0, st.queue.findIndex(x => trackKey(x) === trackKey(tracks[index])));
  st.radio = radioContext || { kind: 'track', seed: st.queue[st.idx], artists: [st.queue[st.idx]?.artist].filter(Boolean) };
  st.radioSeen = st.queue.map(trackKey);
  st.fetching = false; st.pendingAdvance = false; st.prefetchAtIdx = -1; st.err = '';
  load();
}
async function load() {
  const track = st.queue[st.idx]; if (!track) return;
  const sequence = ++loadSequence; st.err = ''; msMeta(track);
  try {
    const url = src.streamUrl(track); if (!url) throw new Error('No playable URL');
    au.src = url; drawP(); await au.play();
    if (sequence !== loadSequence) return;
    st.recent = [track, ...st.recent.filter(item => trackKey(item) !== trackKey(track))].slice(0, 40); S('recent', st.recent);
    recordTaste(track, 'plays'); drawP();
  } catch (error) {
    if (sequence !== loadSequence) return;
    if (error?.name !== 'AbortError') st.err = 'Couldn’t play this song. It may be unavailable from the selected source.';
    drawP();
  }
}
async function autoFetchMore(advanceAfter = false) {
  if (st.fetching) { st.pendingAdvance = st.pendingAdvance || advanceAfter; return; }
  const current = st.queue[st.idx]; if (!current) return;
  st.fetching = true; st.pendingAdvance = advanceAfter; st.err = 'Finding more music for you…'; drawP();
  const oldLength = st.queue.length;
  try {
    const context = st.radio || { kind: 'track', seed: current, artists: [current.artist].filter(Boolean) };
    const artistNames = [...new Set([...(context.artists || []), current.artist].filter(Boolean))].slice(0, 5);
    const jobs = [];
    // Egyptian artists and Egypt chart discovery take priority over general discovery.
    if (context.kind === 'mix' && context.name?.toLowerCase().includes('egypt')) {
      for (const name of artistNames.length ? artistNames : EGYPTIAN_ARTISTS.slice(0, 8)) jobs.push(src.search(name));
      jobs.push(src.search('MIX:' + EGYPTIAN_ARTISTS.slice(0, 8).join(',')));
    } else {
      if (current.artistId) jobs.push(src.getArtist(current.artistId));
      if (artistNames.length) {
        jobs.push(src.search(artistNames[0]));
        jobs.push(src.search('RECOMMEND:' + artistNames.join(',')));
      }
      // Add Egyptian discovery as a soft preference, not a hard filter.
      jobs.push(src.search('MIX:' + EGYPTIAN_ARTISTS.slice(0, 6).join(',')));
    }
    const settled = await Promise.allSettled(jobs);
    let candidates = uniqueTracks(settled.flatMap(x => x.status === 'fulfilled' && Array.isArray(x.value) ? x.value : []));
    const queued = new Set(st.queue.map(trackKey));
    let fresh = candidates.filter(t => !queued.has(trackKey(t)));
    const egyptian = fresh.filter(t => isEgyptianArtist(t.artist));
    if (context.kind === 'mix' && context.name?.toLowerCase().includes('egypt')) fresh = egyptian.concat(fresh.filter(t => !egyptian.includes(t)));
    else fresh = egyptian.slice(0, 8).concat(fresh.filter(t => !egyptian.includes(t)));
    fresh = shuffleArray(uniqueTracks(fresh)).slice(0, 20);
    if (fresh.length) {
      st.queue.push(...fresh); st.radioSeen.push(...fresh.map(trackKey)); st.err = '';
      if (st.pendingAdvance) { st.idx = oldLength; st.pendingAdvance = false; load(); }
      else drawP();
    } else {
      st.err = 'Couldn’t find more related songs right now.';
      if (st.pendingAdvance) { st.pendingAdvance = false; drawP(); }
      else drawP();
    }
  } catch (error) {
    st.err = 'Couldn’t load more songs. Check your connection.'; drawP();
  } finally { st.fetching = false; }
}
function next(auto) {
  if (!st.queue.length) return;
  const current = st.queue[st.idx];
  if (current && au.currentTime < Math.min(30, (au.duration || 30) * 0.3)) recordTaste(current, 'skips');
  if (auto && st.rep === 2) { au.currentTime = 0; au.play().catch(() => {}); return; }
  const nextIndex = st.shuf ? Math.floor(Math.random() * st.queue.length) : st.idx + 1;
  if (nextIndex >= st.queue.length) {
    if (st.rep === 1 || !auto) { st.idx = 0; load(); }
    else autoFetchMore(true);
    return;
  }
  st.idx = nextIndex; load();
}
function prev() { if (!st.queue.length) return; if (au.currentTime > 3) { au.currentTime = 0; return; } st.idx = (st.idx - 1 + st.queue.length) % st.queue.length; load(); }
au.onended = () => { const current = st.queue[st.idx]; if (current) recordTaste(current, 'completed'); next(true); };
au.onerror = () => { st.err = 'This song isn’t available right now.'; drawP(); };
au.onplay = au.onpause = au.onloadedmetadata = () => drawP();
au.ontimeupdate = () => {
  const p = $('#mpb'); if (p) p.style.width = (au.duration ? au.currentTime / au.duration * 100 : 0) + '%';
  const s = $('#seek'); if (s) { s.max = au.duration || 0; s.value = au.currentTime; $('#ct').textContent = fmt(au.currentTime); $('#dt').textContent = fmt(au.duration); }
  if (ms && isFinite(au.duration) && au.duration > 0) { try { ms.setPositionState({ duration: au.duration, playbackRate: au.playbackRate || 1, position: Math.min(au.currentTime, au.duration) }); } catch {} }
  // Fetch the next batch before the current queue runs out.
  if (!st.fetching && st.queue.length - st.idx <= 2 && au.duration > 0 && au.currentTime > 2 && st.prefetchAtIdx !== st.idx) { st.prefetchAtIdx = st.idx; autoFetchMore(false); }
};
function drawP() {
  const t = st.queue[st.idx], m = $('#mini'); m.hidden = !t; if (!t) return;
  if (ms) ms.playbackState = au.paused ? 'paused' : 'playing';
  const pl = ic(au.paused ? 'play' : 'pause'), w = au.duration ? au.currentTime / au.duration * 100 : 0;
  m.innerHTML = `<img src="${esc(t.cover)}" alt=""><div class="mt" data-act="expand"><b>${esc(t.title)}</b><small>${st.err ? esc(st.err) : esc(t.artist)}</small></div><button data-act="pp">${pl}</button><button data-act="next">${ic('next')}</button><div class="mp"><i id="mpb" style="width:${w}%"></i></div>`;
  if (!$('#full').hidden) $('#full').innerHTML = `<button data-act="close" class="cl">${ic('down')}</button><img class="big" src="${esc(t.cover)}" alt=""><h2>${esc(t.title)}</h2><small>${esc(t.artist)}</small>${st.err ? `<p class="er">${esc(st.err)}</p>` : ''}<input id="seek" type="range" min="0" max="${au.duration || 0}" step="1" value="${au.currentTime}" dir="ltr"><div class="tm" dir="ltr"><span id="ct">${fmt(au.currentTime)}</span><span id="dt">${fmt(au.duration)}</span></div><div class="ctl" dir="ltr"><button data-act="shuf" class="${st.shuf ? 'on' : ''}">${ic('shuf')}</button><button data-act="prev">${ic('prev')}</button><button class="pp" data-act="pp">${pl}</button><button data-act="next">${ic('next')}</button><button data-act="rep" class="${st.rep ? 'on' : ''}">${ic(st.rep === 2 ? 'rep1' : 'rep')}</button></div><div class="vol" dir="ltr"><button data-act="mute">${ic(au.muted ? 'mute' : 'vol')}</button><input id="vol" type="range" min="0" max="1" step=".05" value="${au.volume}"></div><h2>Queue</h2>` + st.queue.map((x, i) => `<div class="q ${i === st.idx ? 'cur' : ''}" data-act="qplay" data-i="${i}">${esc(x.title)} — ${esc(x.artist)}</div>`).join('');
}

document.addEventListener('click', e => {
  const artistEl = e.target.closest('[data-artist]');
  if (artistEl) {
    e.stopPropagation(); st.view = 'artist';
    document.querySelectorAll('#nav button').forEach(b => b.classList.remove('on'));
    V.artist(artistEl.dataset.artist, artistEl.dataset.artistid); return;
  }

  const b = e.target.closest('[data-act],[data-go]'); if (!b) return;
  const d = b.dataset, a = d.act; if (d.go && !a) return go(d.go);
  const t = lists[d.c]?.[d.i];
  
  if (a === 'backhome') { return go('home'); }

  // زرار تشغيل التوصيات
  if (a === 'chartplay') {
    const chartTrack = lists[d.list]?.[Number(d.i)]; if (!chartTrack) return;
    el.innerHTML = `<div class="chips"><button class="chip" data-act="backhome">${ic('back')}Back</button></div><h2 class="g">${esc(chartTrack.title)}</h2><p class="ld">Finding this exact track in your available music sources…</p>`;
    resolveChartTrack(chartTrack, src.search).then(track => {
      if (track) { play([track], 0, { kind: 'track', seed: track, artists: [chartTrack.artist, track.artist].filter(Boolean), chartSeed: chartTrack }); go('home'); }
      else el.innerHTML = `<p class="er">This chart track wasn’t found in the connected playback sources. Try searching its title manually.</p><button class="chip" data-act="q" data-q="${esc(chartTrack.title + ' ' + chartTrack.artist)}">Search this track</button><button class="chip" data-act="backhome">Back</button>`;
    }).catch(() => { el.innerHTML = '<p class="er">Couldn’t search the connected playback sources.</p><button class="chip" data-act="backhome">Back</button>'; });
    return;
  }

  if (a === 'rec') {
    const topArtists = preferredArtists();
    const seedArtists = [...new Set([...topArtists, ...EGYPTIAN_ARTISTS.slice(0, 4)])].slice(0, 8);
    el.innerHTML = `<div class="chips"><button class="chip" data-act="backhome">${ic('back')}Back</button></div><h2 class="g">Daily Mix</h2><p class="ld">Building your personal mix with Egyptian music first…</p>`;
    const jobs = seedArtists.map(name => src.search(name));
    jobs.push(src.search('RECOMMEND:' + topArtists.join(',')));
    Promise.allSettled(jobs).then(results => {
      const tracks = uniqueTracks(results.flatMap(x => x.status === 'fulfilled' ? x.value : []));
      if (tracks.length) {
        const egypt = tracks.filter(t => isEgyptianArtist(t.artist));
        const ordered = shuffleArray(egypt).concat(shuffleArray(tracks.filter(t => !egypt.includes(t))));
        play(ordered, 0, { kind: 'personal', name: 'Daily Mix', artists: seedArtists });
        go('home');
      } else { el.innerHTML = '<p class="er">No matching recommendations are available right now.</p><button class="chip" data-act="backhome">Back</button>'; }
    }).catch(() => { el.innerHTML = '<p class="er">Couldn’t build your mix. Please try again.</p><button class="chip" data-act="backhome">Back</button>'; });
    return;
  }

  if (a === 'mix') {
    const mixName = d.mix;
    const queries = ALL_MIXES[mixName] || [];
    el.innerHTML = `<div class="chips"><button class="chip" data-act="backhome">${ic('back')}Back</button></div><h2 class="g">${esc(mixName)}</h2><p class="ld">Building a full mix…</p>`;
    const jobs = queries.map(name => src.search(name));
    if (mixName.toLowerCase().includes('egypt')) jobs.push(getEgyptTopSongs().then(chart => mapLimit(chart.slice(0, 24), 4, item => resolveChartTrack(item, src.search))));
    Promise.allSettled(jobs).then(results => {
      let tracks = uniqueTracks(results.flatMap(x => x.status === 'fulfilled' ? (Array.isArray(x.value) ? x.value : []) : []));
      if (tracks.length < 18) return src.search('MIX:' + queries.join(',')).then(extra => { tracks = uniqueTracks(tracks.concat(extra)); return tracks; });
      return tracks;
    }).then(tracks => {
      if (tracks.length) {
        const egyptFirst = mixName.toLowerCase().includes('egypt');
        const egypt = tracks.filter(t => isEgyptianArtist(t.artist));
        const ordered = egyptFirst ? shuffleArray(egypt).concat(shuffleArray(tracks.filter(t => !egypt.includes(t)))) : shuffleArray(tracks);
        play(ordered, 0, { kind: 'mix', name: mixName, artists: queries });
        go('home');
      } else { el.innerHTML = '<p class="er">No tracks were found for this mix. Try again later.</p><button class="chip" data-act="backhome">Back</button>'; }
    }).catch(() => { el.innerHTML = '<p class="er">Couldn’t build this mix. Please try again.</p><button class="chip" data-act="backhome">Back</button>'; });
    return;
  }

  const A = {
    play: () => play(lists[d.c], +d.i),
    fav: () => { st.fav = isFav(t) ? st.fav.filter(x => x.id !== t.id) : [t, ...st.fav]; S('fav', st.fav); b.innerHTML = ic(isFav(t) ? 'heartF' : 'heart'); b.classList.toggle('on', isFav(t)); },
    add: () => { const k = (prompt('Playlist name') || '').trim(); if (!k) return; st.pl[k] = st.pl[k] || []; if (!st.pl[k].some(x => x.id === t.id)) st.pl[k].push(t); S('pl', st.pl); b.innerHTML = ic('check'); b.classList.add('on'); },
    rm: () => { st.pl[d.c.slice(3)].splice(+d.i, 1); S('pl', st.pl); V.playlists(); },
    q: () => { st.q = d.q; go('search'); },
    plnew: () => { const k = (prompt('New playlist name') || '').trim(); if (k) { st.pl[k] = st.pl[k] || []; S('pl', st.pl); V.playlists(); } },
    plopen: () => { st.open = d.n; V.playlists(); },
    pldel: () => { if (confirm('Delete this playlist?')) { delete st.pl[d.n]; S('pl', st.pl); st.open = null; V.playlists(); } },
    back: () => { st.open = null; V.playlists(); },
    expand: () => { $('#full').hidden = false; drawP(); },
    close: () => { $('#full').hidden = true; },
    pp: () => { if (au.src) au.paused ? au.play().catch(() => {}) : au.pause(); },
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
  if (t.id === 'q') { st.q = t.value.trim(); ch(); clearTimeout(dt); dt = setTimeout(() => run(st.q), 400); }
  else if (t.id === 'seek') au.currentTime = t.value;
  else if (t.id === 'vol') { au.volume = t.value; au.muted = false; }
});
document.addEventListener('change', e => { if (e.target.id === 'q' && st.q.length > 1) { st.hist = [st.q, ...st.hist.filter(h => h !== st.q)].slice(0, 15); S('hist', st.hist); } });
go('home');
