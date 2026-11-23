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
    "Egypt Top Hits": ["Amr Diab", "Tamer Hosny", "Wegz", "Sherine", "Ahmed Saad", "Ruby", "Bahaa Sultan", "Ramy Sabry", "Mohamed Hamaki", "Angham"],
    "Egyptian New & Trending": ["Ahmed Saad", "TUL8TE", "Wegz", "Marwan Pablo", "Ruby", "Muslim", "Tamer Ashour", "Amr Diab", "Shahyn", "Marwan Moussa"],
    "Egyptian Pop": ["Amr Diab", "Tamer Hosny", "Mohamed Hamaki", "Ramy Sabry", "Ahmed Saad", "Ruby", "Bahaa Sultan"],
    "Egyptian Indie": ["Cairokee", "Massar Egbari", "Sharmoofers", "Hamza Namira", "Abo Sahar"]
  }},
  { title: "Mood & Arabic Pop", mixes: {
    "Arabic Top Hits": ["Amr Diab", "Tamer Hosny", "Sherine", "Ramy Sabry", "Angham", "Bahaa Sultan", "Elissa", "Assala"],
    "Romantic Mix": ["Tamer Ashour", "Sherine", "Angham", "Assala", "Ramy Sabry", "Wael Kfoury", "Elissa", "Bahaa Sultan", "Fadel Chaker"],
    "Heartbreak Mix": ["Tamer Ashour", "Ramy Sabry", "Sherine", "Angham", "Fadel Chaker", "Wael Kfoury"],
    "Party & Dance": ["Ahmed Saad", "Mohamed Ramadan", "Tamer Hosny", "Ruby", "Wegz", "Hassan Shakosh", "Muslim", "Omar Kamal"]
  }},
  { title: "Street · Rap · Energy", mixes: {
    "Mahraganat": ["Essam Sasa", "Hassan Shakosh", "Omar Kamal", "Hamo Bika", "Oka Ortega", "Muslim"],
    "Egyptian Rap": ["Wegz", "Marwan Pablo", "Marwan Moussa", "Afroto", "Abyusif", "TUL8TE", "Shahyn"],
    "Arabic Rap": ["Wegz", "Marwan Pablo", "Afroto", "Abyusif", "Marwan Moussa", "Shahyn"],
    "Workout & Hype": ["Wegz", "Ahmed Saad", "Mohamed Ramadan", "TUL8TE", "Hassan Shakosh", "Muslim"]
  }},
  { title: "Classics · Tarab", mixes: {
    "Golden Era": ["Umm Kulthum", "Abdel Halim Hafez", "Warda", "Fairuz", "Mohamed Abdel Wahab", "Najاة الصغيرة"],
    "Arabic Tarab": ["Umm Kulthum", "Warda", "Fairuz", "Abdel Halim Hafez", "Najاة الصغيرة"]
  }},
  { title: "Your Egyptian Artists", mixes: {
    "Amr Diab Mix": ["Amr Diab"], "Tamer Hosny Mix": ["Tamer Hosny"], "Sherine Mix": ["Sherine"],
    "Wegz Mix": ["Wegz"], "Ahmed Saad Mix": ["Ahmed Saad"], "Angham Mix": ["Angham"],
    "Tamer Ashour Mix": ["Tamer Ashour"], "Ramy Sabry Mix": ["Ramy Sabry"],
    "Mohamed Hamaki Mix": ["Mohamed Hamaki"], "Ruby Mix": ["Ruby"],
    "Marwan Pablo Mix": ["Marwan Pablo"], "Hamza Namira Mix": ["Hamza Namira"]
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
const EGYPTIAN_ARTISTS = ['Amr Diab','Tamer Hosny','Wegz','Sherine','Ahmed Saad','Ruby','Ramy Sabry','Tamer Ashour','Angham','Bahaa Sultan','Marwan Pablo','Afroto','Muslim','Hassan Shakosh','Essam Sasa','Mohamed Hamaki','Hamza Namira','Cairokee','Marwan Moussa','Abyusif','Ahmed Kamel','Donia Samir Ghanem','Hamo Bika','Oka Ortega','TUL8TE','Shahyn','Massar Egbari','Sharmoofers','Mai Farouk','Assala','Elissa','Fadel Chaker'];
const EGYPTIAN_ARTIST_ALIASES = ['عمرو دياب','تامر حسني','ويجز','شيرين','احمد سعد','أحمد سعد','روبي','رامي صبري','تامر عاشور','أنغام','بهاء سلطان','مروان بابلو','أفروتو','مسلم','حسن شاكوش','عصام صاصا','محمد حماقي','حمزة نمرة','كايروكي','مروان موسى','أبيوسف','أحمد كامل','حمو بيكا','توليت','شاهين','مسار إجباري','شارموفرز','مي فاروق','أصالة','إليسا','فضل شاكر'];

const ARTIST_ALIASES = {
  'sherine':['sherine','shereen','شيرين','شيرين عبد الوهاب'], 'amr diab':['amr diab','عمرو دياب'],
  'tamer hosny':['tamer hosny','تامر حسني'], 'angham':['angham','أنغام','انغام'],
  'assala':['assala','أصالة','اصالة'], 'ramy sabry':['ramy sabry','رامي صبري'],
  'tamer ashour':['tamer ashour','تامر عاشور'], 'wegz':['wegz','ويجز'],
  'ahmed saad':['ahmed saad','أحمد سعد','احمد سعد'], 'mohamed hamaki':['mohamed hamaki','محمد حماقي'],
  'ruby':['ruby','روبي'], 'bahaa sultan':['bahaa sultan','بهاء سلطان'],
  'elissa':['elissa','elisa','إليسا','اليسا'], 'wael kfoury':['wael kfoury','وائل كفوري'],
  'marwan pablo':['marwan pablo','مروان بابلو'], 'marwan moussa':['marwan moussa','مروان موسى'],
  'afroto':['afroto','أفروتو'], 'abyusif':['abyusif','abyoussef','أبيوسف'],
  'tul8te':['tul8te','toul8te','توليت'], 'hamza namira':['hamza namira','حمزة نمرة'],
  'cairokee':['cairokee','كايروكي'], 'muslim':['muslim','مسلم'],
  'hassan shakosh':['hassan shakosh','حسن شاكوش'], 'essam sasa':['essam sasa','عصام صاصا'],
  'omar kamal':['omar kamal','عمر كمال'], 'mohamed ramadan':['mohamed ramadan','محمد رمضان'],
  'fadel chaker':['fadel chaker','فضل شاكر'], 'maha ftouni':['maha ftouni','مها فتوني']
};
function normArtist(value = '') {
  return String(value).toLowerCase().normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي')
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, ' ').trim().replace(/\s+/g, ' ');
}
function artistAliases(name) {
  const key = normArtist(name);
  const known = Object.entries(ARTIST_ALIASES).find(([k, values]) => normArtist(k) === key || values.some(v => normArtist(v) === key));
  return known ? known[1].map(normArtist) : [key];
}
// Exact primary-artist match: collaborations are deliberately excluded from an artist-only mix.
function isExactArtistTrack(track, artist) {
  const actual = normArtist(track?.artist || '');
  return !!actual && artistAliases(artist).includes(actual);
}
const SIMILAR_EGYPTIAN_ARTISTS = {
  'sherine':['Angham','Assala','Elissa','Ruby','Mai Farouk','Ramy Sabry','Tamer Ashour'],
  'amr diab':['Ramy Sabry','Tamer Hosny','Bahaa Sultan','Mohamed Hamaki','Ahmed Saad'],
  'tamer hosny':['Amr Diab','Ramy Sabry','Tamer Ashour','Ahmed Saad','Mohamed Hamaki'],
  'angham':['Sherine','Assala','Elissa','Ramy Sabry','Tamer Ashour'],
  'assala':['Sherine','Angham','Elissa','Wael Kfoury'],
  'tamer ashour':['Ramy Sabry','Sherine','Angham','Bahaa Sultan','Wael Kfoury'],
  'ramy sabry':['Tamer Ashour','Amr Diab','Sherine','Bahaa Sultan','Tamer Hosny'],
  'wegz':['Marwan Pablo','Afroto','Abyusif','TUL8TE','Marwan Moussa'],
  'marwan pablo':['Wegz','Afroto','Abyusif','Marwan Moussa'],
  'ahmed saad':['Mohamed Hamaki','Tamer Hosny','Muslim','Ruby'],
  'mohamed hamaki':['Amr Diab','Tamer Hosny','Ramy Sabry','Ahmed Saad'],
  'ruby':['Sherine','Ahmed Saad','Tamer Hosny','Angham'],
  'bahaa sultan':['Amr Diab','Ramy Sabry','Tamer Ashour','Tamer Hosny'],
  'tul8te':['Wegz','Marwan Pablo','Marwan Moussa','Afroto'],
  'marwan moussa':['Wegz','Marwan Pablo','Afroto','Abyusif'],
  'afroto':['Wegz','Marwan Pablo','Marwan Moussa','Abyusif'],
  'abyusif':['Wegz','Marwan Pablo','Afroto','Marwan Moussa'],
  'muslim':['Ahmed Saad','Omar Kamal','Hassan Shakosh','Essam Sasa'],
  'essam sasa':['Hassan Shakosh','Omar Kamal','Hamo Bika','Muslim'],
  'hassan shakosh':['Essam Sasa','Omar Kamal','Muslim','Hamo Bika'],
  'hamza namira':['Cairokee','Massar Egbari','Sharmoofers','Mohamed Hamaki'],
  'cairokee':['Hamza Namira','Massar Egbari','Sharmoofers'],
  'mohamed ramadan':['Ahmed Saad','Wegz','Hassan Shakosh','Tamer Hosny'],
  'elissa':['Sherine','Angham','Assala','Wael Kfoury'],
  'wael kfoury':['Elissa','Assala','Fadel Chaker','Tamer Ashour']
};
const ARTIST_STYLE_GROUPS = [
  ['Amr Diab','Tamer Hosny','Mohamed Hamaki','Ramy Sabry','Bahaa Sultan','Ahmed Saad'],
  ['Sherine','Angham','Assala','Elissa','Ruby','Mai Farouk'],
  ['Tamer Ashour','Ramy Sabry','Fadel Chaker','Wael Kfoury','Bahaa Sultan'],
  ['Wegz','Marwan Pablo','Marwan Moussa','Afroto','Abyusif','TUL8TE','Shahyn'],
  ['Essam Sasa','Hassan Shakosh','Omar Kamal','Hamo Bika','Oka Ortega','Muslim'],
  ['Cairokee','Hamza Namira','Massar Egbari','Sharmoofers']
];
function similarArtistsFor(name) {
  const key = Object.keys(SIMILAR_EGYPTIAN_ARTISTS).find(k => artistAliases(name).includes(normArtist(k)));
  if (key) return SIMILAR_EGYPTIAN_ARTISTS[key];
  const group = ARTIST_STYLE_GROUPS.find(items => items.some(item => normArtist(item) === normArtist(name)));
  if (group) return group.filter(item => normArtist(item) !== normArtist(name));
  return isEgyptianArtist(name) ? ['Amr Diab','Tamer Hosny','Sherine','Ahmed Saad'] : ['Amr Diab','Sherine','Wael Kfoury','Wegz'];
}
async function discoverSimilarArtists(name) {
  try {
    const dynamic = await src.similarArtists(name);
    if (dynamic.length) {
      const local = similarArtistsFor(name);
      const merged = [...new Set([...dynamic, ...local])].filter(x => normArtist(x) !== normArtist(name));
      return isEgyptianArtist(name) ? merged.sort((a,b) => Number(isEgyptianArtist(b))-Number(isEgyptianArtist(a))) : merged;
    }
  } catch {}
  return similarArtistsFor(name);
}

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
  lists[key] = sourceTracks.slice().sort((a, b) => Number(a.chartRank || 999) - Number(b.chartRank || 999));
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
      mixesHtml + '<h2>Egypt Top 100</h2><p class="chart-note">Apple Music Egypt · Daily Top Songs</p><div id="eg-chart"><p class="ld">Loading Egypt chart…</p></div><h2>Arab Region Top Songs</h2><p class="chart-note">Combined Apple Music charts · Saudi Arabia + UAE</p><div id="ar-chart"><p class="ld">Loading Arab region charts…</p></div><h2>Global Top 100</h2><p class="chart-note">Apple Music · United States Top Songs</p><div id="global-chart"><p class="ld">Loading global chart…</p></div><h2>Egypt Trending · Ready to Play</h2><p class="chart-note">Top Egypt chart tracks found in Albumaty</p><div id="tr"><p class="ld">Loading…</p></div>'; 

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
    el.innerHTML = `<div class="chips"><button class="chip" data-act="backhome">${ic('back')}Back</button><button class="chip" data-act="artistradio" data-artistname="${esc(name)}" data-artistid="${esc(id || '')}">${ic('play')}Start Artist Radio</button></div><h2 class="g">${esc(name)}</h2><div id="artist-res"><p class="ld">Loading…</p></div>`;
    (id ? src.getArtist(id) : Promise.resolve([])).then(tracks => {
      if (st.view === 'artist') { const ownTracks = tracks.filter(track => isExactArtistTrack(track, name)); $('#artist-res').innerHTML = list(ownTracks, 'artist'); }
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
    const primary = context.primaryArtist || (context.kind === 'artist' ? context.artists?.[0] : null);
    const artistNames = [...new Set([...(context.artists || []), current.artist].filter(Boolean))].slice(0, 8);
    const jobs = [];

    // Artist Radio: exhaust exact solo tracks first, then similar artists.
    if (primary) {
      const primaryTracks = st.queue.filter(t => isExactArtistTrack(t, primary));
      if (primaryTracks.length < 35) {
        const artistTrack = st.queue.find(t => t.artistId && isExactArtistTrack(t, primary));
        if (artistTrack?.artistId) jobs.push(src.getArtist(artistTrack.artistId));
        jobs.push(src.search('MIX:' + primary));
      }
      const discovered = await discoverSimilarArtists(primary);
      const relatedNames = [...new Set([...(context.similarArtists || []), ...discovered])].slice(0, 6);
      for (const name of relatedNames) jobs.push(src.search('MIX:' + name));
      
    } else if (context.kind === 'mix' && context.name?.toLowerCase().includes('egypt')) {
      for (const name of artistNames.length ? artistNames : EGYPTIAN_ARTISTS.slice(0, 8)) jobs.push(src.search('MIX:' + name));
      for (const name of EGYPTIAN_ARTISTS.slice(0, 8)) jobs.push(src.search('MIX:' + name));
      try { jobs.push(getEgyptTopSongs().then(chart => mapLimit(chart.slice(0, 30), 5, item => resolveChartTrack(item, src.search)))); } catch {}
    } else {
      if (current.artistId) jobs.push(src.getArtist(current.artistId));
      if (current.title && current.artist) jobs.push(src.search('MIX:' + current.artist));
      if (artistNames.length) {
        for (const related of (await discoverSimilarArtists(artistNames[0])).slice(0, 5)) jobs.push(src.search('MIX:' + related));
      }
      // Egypt is a ranking preference, not a reason to inject unrelated songs into every radio.
      if (context.kind === 'personal') for (const name of EGYPTIAN_ARTISTS.slice(0, 8)) jobs.push(src.search('MIX:' + name));
    }

    const settled = await Promise.allSettled(jobs);
    let candidates = uniqueTracks(settled.flatMap(x => x.status === 'fulfilled' && Array.isArray(x.value) ? x.value : []));
    const queued = new Set(st.queue.map(trackKey));
    let fresh = candidates.filter(t => !queued.has(trackKey(t)));

    if (primary) {
      const solo = fresh.filter(t => isExactArtistTrack(t, primary));
      const related = fresh.filter(t => !isExactArtistTrack(t, primary));
      // Keep the artist central; use related artists only as a measured second layer.
      fresh = solo.concat(related.slice(0, 12));
    } else {
      const egyptian = fresh.filter(t => isEgyptianArtist(t.artist));
      if (context.kind === 'mix' && context.name?.toLowerCase().includes('egypt')) {
        fresh = egyptian.concat(fresh.filter(t => !egyptian.includes(t)));
      } else if (context.kind === 'personal') {
        fresh = egyptian.slice(0, 12).concat(fresh.filter(t => !egyptian.includes(t)));
      }
    }

    fresh = (primary ? uniqueTracks(fresh) : shuffleArray(uniqueTracks(fresh))).slice(0, 25);
    if (fresh.length) {
      st.queue.push(...fresh); st.radioSeen.push(...fresh.map(trackKey)); st.err = '';
      if (st.pendingAdvance) { st.idx = oldLength; st.pendingAdvance = false; load(); }
      else drawP();
    } else {
      st.err = 'No new related tracks were found in the connected music sources.';
      if (st.pendingAdvance) { st.pendingAdvance = false; st.err = 'وصلنا لنهاية الأغاني المتاحة حاليًا. جرّب ميكس تاني أو ارجع لاحقًا.'; }
      drawP();
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
  let nextIndex = st.idx + 1;
  if (st.shuf && st.queue.length > 1) {
    const choices = st.queue.map((_, i) => i).filter(i => i !== st.idx);
    nextIndex = choices[Math.floor(Math.random() * choices.length)];
  }
  if (nextIndex >= st.queue.length) {
    if (st.rep === 1) { st.idx = 0; load(); }
    else autoFetchMore(true);
    return;
  }
  st.idx = nextIndex; load();
}
function prev() { if (!st.queue.length) return; if (au.currentTime > 3) { au.currentTime = 0; return; } st.idx = (st.idx - 1 + st.queue.length) % st.queue.length; load(); }
au.onended = () => { const current = st.queue[st.idx]; if (current) recordTaste(current, 'completed'); next(true); };
au.onerror = () => { st.err = 'This song isn’t available right now. Skipping…'; drawP(); if (st.queue.length > 1) setTimeout(() => { if (st.err.includes('Skipping')) next(true); }, 900); };
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

document.addEventListener('click', async e => {
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

  if (a === 'artistradio') {
    const artistName = d.artistname || '';
    const artistId = d.artistid || '';
    const jobs = [src.search('MIX:' + artistName)];
    if (artistId) jobs.push(src.getArtist(artistId));
    Promise.allSettled(jobs).then(results => {
      const all = uniqueTracks(results.flatMap(x => x.status === 'fulfilled' && Array.isArray(x.value) ? x.value : []));
      const solo = all.filter(t => isExactArtistTrack(t, artistName));
      const queue = solo;
      if (queue.length) {
        play(queue, 0, { kind: 'artist', primaryArtist: artistName, artists: [artistName], similarArtists: similarArtistsFor(artistName) });
        go('home');
      } else {
        const box = $('#artist-res');
        if (box) box.innerHTML = '<p class="er">No verified solo tracks found for this artist. Try a song search.</p>';
      }
    });
    return;
  }

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
    const seedArtists = [...new Set([...topArtists.slice(0, 3), ...EGYPTIAN_ARTISTS.slice(0, 3)])].slice(0, 6);
    el.innerHTML = `<div class="chips"><button class="chip" data-act="backhome">${ic('back')}Back</button></div><h2 class="g">Daily Mix</h2><p class="ld">Building your personal mix with Egyptian music first…</p>`;
    const dynamicGroups = await Promise.all(topArtists.slice(0, 3).map(discoverSimilarArtists));
    const relatedArtists = [...new Set([...topArtists.flatMap(similarArtistsFor), ...dynamicGroups.flat()])].slice(0, 5);
    const jobs = [...seedArtists, ...relatedArtists].map(name => src.search('MIX:' + name));
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
    const artistOnly = /\sMix$/i.test(mixName) && queries.length === 1;
    const primaryArtist = artistOnly ? queries[0] : null;
    el.innerHTML = `<div class="chips"><button class="chip" data-act="backhome">${ic('back')}Back</button></div><h2 class="g">${esc(mixName)}</h2><p class="ld">Building your radio with exact artist tracks first…</p>`;

    const jobs = queries.map(name => src.search('MIX:' + name));
    if (mixName.toLowerCase().includes('egypt')) {
      jobs.push(getEgyptTopSongs().then(chart => mapLimit(chart.slice(0, 35), 5, item => resolveChartTrack(item, src.search))));
    }

    Promise.allSettled(jobs).then(async results => {
      let tracks = uniqueTracks(results.flatMap(x => x.status === 'fulfilled' ? (Array.isArray(x.value) ? x.value : []) : []));
      if (artistOnly) {
        let solo = tracks.filter(t => isExactArtistTrack(t, primaryArtist));
        const artistSeed = solo.find(t => t.artistId);
        if (artistSeed?.artistId) {
          try {
            const pageTracks = await src.getArtist(artistSeed.artistId);
            solo = uniqueTracks(solo.concat(pageTracks.filter(t => isExactArtistTrack(t, primaryArtist))));
          } catch {}
        }
        // Never put a collaboration or a different singer in the artist's own section.
        // Start with the artist's verified solo catalog; the radio expands after that batch.
        const soloFinal = uniqueTracks(solo).filter(t => isExactArtistTrack(t, primaryArtist));
        const ordered = soloFinal;
        if (ordered.length) {
          play(ordered, 0, { kind: 'artist', name: mixName, primaryArtist, artists: [primaryArtist], similarArtists: similarArtistsFor(primaryArtist) });
          go('home');
        } else {
          el.innerHTML = '<p class="er">No tracks for this artist were found in the connected sources.</p><button class="chip" data-act="backhome">Back</button>';
        }
        return;
      }

      if (tracks.length < 18 && queries.length) {
        try { const more = await Promise.all(queries.map(name => src.search('MIX:' + name))); tracks = uniqueTracks(tracks.concat(more.flat())); } catch {}
      }
      if (tracks.length) {
        const egyptFirst = mixName.toLowerCase().includes('egypt');
        const egypt = tracks.filter(t => isEgyptianArtist(t.artist));
        const ordered = egyptFirst ? shuffleArray(egypt).concat(shuffleArray(tracks.filter(t => !egypt.includes(t)))) : shuffleArray(tracks);
        play(ordered, 0, { kind: 'mix', name: mixName, artists: queries });
        go('home');
      } else {
        el.innerHTML = '<p class="er">No tracks were found for this mix. Try again later.</p><button class="chip" data-act="backhome">Back</button>';
      }
    }).catch(() => {
      el.innerHTML = '<p class="er">Couldn’t build this mix. Please try again.</p><button class="chip" data-act="backhome">Back</button>';
    });
    return;
  }

  const A = {
    play: () => { const track = lists[d.c]?.[+d.i]; if (!track) return; play([track], 0, { kind: 'track', seed: track, artists: [track.artist].filter(Boolean), primaryArtist: track.artist, similarArtists: similarArtistsFor(track.artist) }); },
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
