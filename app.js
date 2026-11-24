import * as api from './bodoApi.js?v=4';
import * as off from './offline.js?v=4';
const $ = s => document.querySelector(s), el = $('#view');
if (api.BUILD !== 4 || typeof api.resolve !== 'function') { el.innerHTML = '<p class="er">The file bodoApi.js on the site is an old version. Upload the newest bodoApi.js to GitHub, wait a minute, then open the site again.</p>'; throw new Error('old bodoApi.js'); }
off.config({ WORKER: api.WORKER, resolve: api.resolve });
const L = (k, d) => { try { return JSON.parse(localStorage.getItem('am_' + k)) ?? d; } catch { return d; } };
const S = (k, v) => { try { localStorage.setItem('am_' + k, JSON.stringify(v)); } catch {} };
const st = { fav: L('fav', []), recent: L('recent', []), pl: L('pl', {}), hist: L('hist', []), ap: L('ap', {}), queue: [], idx: -1, shuf: false, rep: 0, view: 'home', arg: null, tab: 'home', stack: [], open: null, q: '', err: '', ext: false, fails: 0, mood: 'all', src: '', sleep: 0, sleepMin: 0 };
const au = new Audio(); au.preload = 'none';
const lists = {}, labels = {}, byId = new Map(), mixReg = new Map();
const dl = { q: [], busy: false, cur: null, done: 0, total: 0, fail: 0, pct: 0, stop: false };
let rtok = 0;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = s => isFinite(s) && s > 0 ? Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') : '0:00';
const mb = n => n >= 1e9 ? (n / 1e9).toFixed(1) + ' GB' : Math.max(1, Math.round(n / 1e6)) + ' MB';
const isFav = t => st.fav.some(x => x.id === t.id);
const isCur = t => st.queue[st.idx]?.id === t.id;
const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
let tt; const toast = m => { let e = $('#toast'); if (!e) { e = document.createElement('div'); e.id = 'toast'; document.body.append(e); } e.textContent = m; e.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => e.classList.remove('show'), 2600); };

/* ---------- colors: burgundy, black and wine tones only ---------- */
const PAL = [['#6B1A33', '#2B0A15'], ['#45121F', '#190509'], ['#8E1B3D', '#3A0A18'], ['#2E2E33', '#0F0F11'], ['#5A1530', '#220810'], ['#7A2A45', '#2A0E18'], ['#4A1426', '#1A0610']];
const hue = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 997; return h; };
const grad = s => PAL[hue(s) % PAL.length], pcol = s => grad(s)[0];
const initial = s => (String(s || '').trim().match(/[\p{L}\p{N}]/u) || ['♪'])[0].toUpperCase();

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
  next: '<path d="M5 5v14l11-7z"/><rect x="17" y="5" width="2.5" height="14" rx="1"/>', prev: '<path d="M19 5v14L8 12z"/><rect x="4.5" y="5" width="2.5" height="14" rx="1"/>',
  dots: '<circle cx="5.5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18.5" cy="12" r="1.4"/>',
  download: '<path d="M12 4v11m0 0 4-4m-4 4-4-4M5 20h14"/>', dlok: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  share: '<path d="M12 15V4M8 8l4-4 4 4M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6"/>',
  infinity: '<path d="M7.5 8a4 4 0 1 0 0 8c3 0 6-8 9-8a4 4 0 1 1 0 8c-3 0-6-8-9-8z"/>',
  trash: '<path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  queueadd: '<path d="M4 7h11M4 12h7M4 17h7M17 14v6M14 17h6"/>',
  rain: '<path d="M7 15a4.5 4.5 0 1 1 .9-8.9 5.5 5.5 0 0 1 10.6 2A3.5 3.5 0 0 1 18 15zM9 18l-1 2M13 18l-1 2M17 18l-1 2"/>',
  flame: '<path d="M12 3s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-8z"/>',
  disc: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/>',
  wifioff: '<path d="M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 12.5a10 10 0 0 1 3-2M12 20h.01M19 12.5a10 10 0 0 0-8-3"/>'
};
P.heartF = P.heart; P.rep1 = P.rep + '<path d="M11 10.5l1.2-1v6" stroke-width="1.6"/>';
const FILLED = new Set(['play', 'pause', 'next', 'prev', 'heartF', 'dots']);
const ic = n => `<svg viewBox="0 0 24 24" class="ic${FILLED.has(n) ? ' f' : ''}" aria-hidden="true">${P[n]}</svg>`;
$('#hs').innerHTML = ic('search');

/* ---------- building blocks ---------- */
const art = t => t.cover ? `<img src="${esc(t.cover)}" alt="" loading="lazy">` : `<div class="ph" style="--p:${pcol(t.title)}" data-lz="${t.id}">${initial(t.title)}</div>`;
const av = (a, ring) => `<div class="av${ring ? ' ring' : ''}" data-act="artist" data-id="${a.id}">${a.cover ? `<img class="c" src="${esc(a.cover)}" alt="">` : `<div class="ph c" style="--p:${pcol(a.name)}" data-az="${a.id}" data-cls="c">${initial(a.name)}</div>`}<span>${esc(a.name)}</span></div>`;
const ac = a => `<div class="ac" data-act="album" data-id="${a.id}">${a.cover ? `<img src="${esc(a.cover)}" alt="" loading="lazy">` : `<div class="ph" style="--p:${pcol(a.title)}">${initial(a.title)}</div>`}<b>${esc(a.title)}</b><small>${esc([a.year, a.artist].filter(Boolean).join(' · '))}</small></div>`;
const mixCard = s => { mixReg.set(s.key, s); const g = grad(s.key); return `<div class="mc" data-act="mixopen" data-k="${esc(s.key)}" style="--c1:${g[0]};--c2:${g[1]}"><b>${esc(s.title)}</b><small>${esc(s.sub || '')}</small></div>`; };
const heroCard = (s, badge) => { mixReg.set(s.key, s); const g = grad(s.key); return `<div class="hero2" data-act="mixopen" data-k="${esc(s.key)}" style="--c1:${g[0]};--c2:${g[1]}"><span class="badge">${ic('sparkle')}${esc(badge)}</span><h2>${esc(s.title)}</h2><p>${esc(s.sub || '')}</p><div class="hact"><button class="pbtn" data-act="mixplay" data-k="${esc(s.key)}" aria-label="Play">${ic('play')}</button><button class="sbtn" data-act="mixshuf" data-k="${esc(s.key)}" aria-label="Shuffle">${ic('shuf')}</button><span class="cnt">About 40 songs</span></div></div>`; };
const row = (t, c, i, o) => {
  const a = `data-c="${esc(c)}" data-i="${i}"`, f = isFav(t);
  const who = t.artistId ? `<span class="lnk" data-act="artist" data-id="${t.artistId}">${esc(t.artist)}</span>` : esc(t.artist);
  const dlm = off.has(t.id) ? `<i class="dlm">${ic('dlok')}</i>` : '';
  return `<div class="row${isCur(t) ? ' cur' : ''}" data-id="${t.id}">${o.num ? `<span class="n">${i + 1}</span>` : ''}${art(t)}<div class="m" data-act="play" ${a}><b>${esc(t.title)}</b><small>${dlm}${who}${t.album ? ' · ' + esc(t.album) : ''}</small></div><span class="eq" aria-hidden="true"><i></i><i></i><i></i></span><button data-act="fav" ${a} class="${f ? 'on' : ''}" aria-label="Favorite">${ic(f ? 'heartF' : 'heart')}</button><button data-act="more" ${a} aria-label="More">${ic('dots')}</button></div>`;
};
const list = (a, c, o = {}) => { lists[c] = a; labels[c] = o.label || ''; a.forEach(t => byId.set(t.id, t)); return a.length ? a.map((t, i) => row(t, c, i, o)).join('') : `<p class="e">${o.empty || 'Nothing here yet. Tap the heart next to any song to save it.'}</p>`; };
const chip = n => `<button class="chip" data-act="q" data-q="${esc(n)}">${esc(n)}</button>`;
const backBar = () => `<button class="chip" data-act="goback">${ic('back')}Back</button>`;
const acts = (c, extra = '') => `<div class="acts"><button class="big" data-act="playall" data-c="${esc(c)}" aria-label="Play all">${ic('play')}</button><button class="chip" data-act="shufall" data-c="${esc(c)}">${ic('shuf')}Shuffle</button><button class="chip" data-act="dlall" data-c="${esc(c)}">${ic('download')}Download</button>${extra}</div>`;
const tracksOf = metas => metas.map(m => ({ id: m.id, title: m.title, artist: m.artist, artistId: m.artistId, album: m.album, duration: m.duration, plays: 0, cover: '', mp3: null }));

// covers and artist photos load only when they scroll into view
const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return; const n = e.target; io.unobserve(n);
  const swap = u => { if (!u || !n.isConnected) return; const im = new Image(); im.src = u; im.alt = ''; im.className = n.dataset.cls || ''; n.replaceWith(im); };
  if (n.dataset.lz) { const t = byId.get(+n.dataset.lz); if (t && navigator.onLine) api.resolve(t).then(() => swap(t.cover)).catch(() => {}); }
  else if (n.dataset.az && navigator.onLine) api.artist(+n.dataset.az).then(a => swap(a.cover)).catch(() => {});
}), { rootMargin: '250px' });
const lazy = () => document.querySelectorAll('.ph[data-lz],.ph[data-az]').forEach(n => { if (!n.__o) { n.__o = 1; io.observe(n); } });
new MutationObserver(lazy).observe(el, { childList: true, subtree: true });
document.addEventListener('error', e => { // a picture that can't load (offline) becomes a colored tile
  const n = e.target; if (!n || n.tagName !== 'IMG' || n.dataset.bad) return; n.dataset.bad = 1;
  const d = document.createElement('div'); d.className = 'ph' + (n.className ? ' ' + n.className : ''); d.style.setProperty('--p', pcol(n.src)); d.textContent = '♪'; n.replaceWith(d);
}, true);

/* ---------- downloads (offline) ---------- */
function drawDl() {
  const b = $('#dlbar'); b.hidden = !dl.busy; if (!dl.busy) return;
  b.innerHTML = `<i style="width:${Math.round(((dl.done + dl.pct) / Math.max(1, dl.total)) * 100)}%"></i><span>${ic('download')}Downloading ${Math.min(dl.done + 1, dl.total)} of ${dl.total}</span><button data-act="dlstop" aria-label="Stop downloads">${ic('x')}</button>`;
}
function markDl(id) { document.querySelectorAll(`.row[data-id="${id}"] .m small`).forEach(s => { if (!s.querySelector('.dlm')) s.insertAdjacentHTML('afterbegin', `<i class="dlm">${ic('dlok')}</i>`); }); }
function unmarkDl(id) { document.querySelectorAll(`.row[data-id="${id}"] .dlm`).forEach(n => n.remove()); }
function enqueue(tracks) {
  if (!navigator.onLine) return toast('You’re offline. Connect to the internet to download songs.');
  const add = tracks.filter(t => !off.has(t.id) && dl.cur?.id !== t.id && !dl.q.some(x => x.id === t.id));
  if (!add.length) return toast(tracks.length ? 'Already downloaded' : 'Nothing to download');
  dl.q.push(...add); dl.total += add.length; off.persist(); drawDl(); toast(`Downloading ${add.length} song${add.length > 1 ? 's' : ''}…`);
  if (!dl.busy) runDl();
}
async function runDl() {
  dl.busy = true; dl.stop = false;
  while (dl.q.length && !dl.stop) {
    const t = dl.cur = dl.q.shift(); dl.pct = 0; drawDl();
    try { await off.save(t, p => { dl.pct = p; drawDl(); }); dl.done++; markDl(t.id); }
    catch (e) { dl.fail++; if (/quota|storage/i.test(e.name + e.message)) { toast('Your phone storage is full'); dl.q.length = 0; } }
  }
  const msg = dl.stop ? 'Downloads stopped' : dl.done ? `Downloaded ${dl.done} song${dl.done > 1 ? 's' : ''}${dl.fail ? ' (' + dl.fail + ' failed)' : ''}. Ready offline.` : 'Download failed. Check your connection and try again.';
  Object.assign(dl, { q: [], cur: null, busy: false, done: 0, total: 0, fail: 0, pct: 0, stop: false }); drawDl(); toast(msg);
  if (st.view === 'downloads') go('downloads', null, { back: 1, y: scrollY });
}

/* ---------- bottom sheet (song menu) ---------- */
let sheetT = null, sheetC = '', sheetI = 0;
function openSheet(t, c, i) {
  sheetT = t; sheetC = c; sheetI = +i;
  const has = off.has(t.id), busy = dl.cur?.id === t.id || dl.q.some(x => x.id === t.id);
  const item = (a, icn, label, sub) => `<button class="si" data-act="sheetact" data-a="${a}">${ic(icn)}<span>${label}${sub ? `<small>${sub}</small>` : ''}</span></button>`;
  $('#sheet').innerHTML = `<div class="scrim" data-act="sclose"></div><div class="panel"><div class="shead">${art(t)}<div><b>${esc(t.title)}</b><small>${esc(t.artist)}</small></div></div>`
    + item('dl', has ? 'dlok' : 'download', has ? 'Downloaded · tap to remove' : busy ? 'Downloading…' : 'Download for offline', has ? 'Plays without internet' : 'Listen without internet')
    + item('pl', 'plus', 'Add to playlist') + item('next', 'queueadd', 'Play next') + item('queue', 'list', 'Add to queue')
    + (t.artistId ? item('artist', 'user', 'Go to artist', esc(t.artist)) : '') + item('share', 'share', 'Share')
    + (sheetC.startsWith('pl:') ? item('rm', 'x', 'Remove from this playlist') : '') + '</div>';
  const s = $('#sheet'); s.hidden = false; requestAnimationFrame(() => s.classList.add('open'));
}
const closeSheet = () => { const s = $('#sheet'); s.classList.remove('open'); setTimeout(() => { if (!s.classList.contains('open')) s.hidden = true; }, 230); };
function addToPlaylist(t) {
  const k = (prompt('Playlist name' + (Object.keys(st.pl).length ? '\nPlaylists: ' + Object.keys(st.pl).join(', ') : '')) || '').trim(); if (!k) return;
  st.pl[k] = st.pl[k] || []; if (!st.pl[k].some(x => x.id === t.id)) st.pl[k].push(t); S('pl', st.pl); toast('Added to ' + k);
}
function queueAdd(t, next) {
  if (!st.queue.length) { play([t], 0, 'Your queue'); return; }
  if (next) st.queue.splice(st.idx + 1, 0, t); else st.queue.push(t);
  toast(next ? 'Playing next' : 'Added to queue'); if (!$('#full').hidden) drawP();
}
async function share(t) {
  const d = { title: t.title, text: `${t.title} — ${t.artist} on BODO`, url: location.origin };
  try { if (navigator.share) await navigator.share(d); else { await navigator.clipboard.writeText(`${d.text} ${d.url}`); toast('Link copied'); } } catch {}
}
function toggleFav(t) { st.fav = isFav(t) ? st.fav.filter(x => x.id !== t.id) : [t, ...st.fav]; S('fav', st.fav); }

/* ---------- sleep timer ---------- */
let sleepT = 0;
const sleepLeft = () => st.sleep ? Math.max(1, Math.ceil((st.sleep - Date.now()) / 6e4)) : 0;
function cycleSleep() {
  const o = [0, 15, 30, 60]; st.sleepMin = o[(o.indexOf(st.sleepMin) + 1) % o.length]; clearTimeout(sleepT);
  st.sleep = st.sleepMin ? Date.now() + st.sleepMin * 6e4 : 0;
  if (st.sleepMin) sleepT = setTimeout(sleepEnd, st.sleepMin * 6e4);
  toast(st.sleepMin ? `Music will stop in ${st.sleepMin} minutes` : 'Sleep timer off'); drawP();
}
function sleepEnd() { if (!st.sleep) return; st.sleep = 0; st.sleepMin = 0; au.pause(); toast('Sleep timer ended. Good night'); drawP(); }
setInterval(() => { if (st.sleep && Date.now() >= st.sleep) sleepEnd(); else if (st.sleep && !$('#full').hidden) drawP(); }, 30000);

/* ---------- search ---------- */
let tok = 0;
async function run(q) {
  const r = $('#res'), n = ++tok; if (!r) return;
  if (q.length < 2) { r.innerHTML = '<h2>Browse all</h2><div class="bgrid">' + api.MOODS.map(mixCard).join('') + '</div>'; return; }
  if (!navigator.onLine) { r.innerHTML = `<div class="offb">${ic('wifioff')}<span>Search needs internet. Your downloads still play offline.</span></div>`; return; }
  r.innerHTML = '<p class="ld">Searching…</p>';
  try {
    const x = await api.search(q); if (n !== tok || !$('#res')) return;
    const top = x.topArtist;
    r.innerHTML = (top ? `<div class="trc" data-act="artist" data-id="${top.id}">${top.cover ? `<img class="c" src="${esc(top.cover)}" alt="">` : `<div class="ph c" style="--p:${pcol(top.name)}">${initial(top.name)}</div>`}<div><b>${esc(top.name)}</b><small>Artist · ${top.count} songs · all songs and albums</small></div>${ic('fwd')}</div>` : '')
      + (x.popular.length ? '<h2>Popular songs</h2>' + list(x.popular, 'sp', { label: top.name }) + `<button class="chip" data-act="artist" data-id="${top.id}">See all ${top.count} songs</button>` : '')
      + (x.latest.length ? '<h2>Latest releases</h2>' + list(x.latest, 'sl', { label: top.name }) : '')
      + (x.artists.length > 1 || (x.artists.length && !top) ? '<h2>Artists</h2><div class="hs">' + x.artists.map(a => av(a)).join('') + '</div>' : '')
      + (x.songs.length ? '<h2>' + (top ? 'More songs' : 'Songs') + '</h2>' + list(x.songs, 's', { label: 'Search results' }) : '')
      + (x.albums.length ? '<h2>Albums</h2><div class="hs">' + x.albums.map(ac).join('') + '</div>' : '')
      + (top || x.artists.length || x.songs.length ? '' : `<p class="e">No results for “${esc(q)}”. Try different words.</p>`);
  } catch { if (n === tok && $('#res')) $('#res').innerHTML = '<p class="er">Couldn’t reach the music source. Check your connection and try again.</p>'; }
}
const ch = () => { const c = $('#ch'); if (c) c.innerHTML = st.hist.filter(h => h.includes($('#q').value)).slice(0, 8).map(chip).join(''); };
const topIds = () => [...new Set([...Object.entries(st.ap).sort((a, b) => b[1] - a[1]).map(([k]) => +k), ...st.fav.map(f => f.artistId).filter(Boolean)])];

/* ---------- views ---------- */
const MOOD_CHIPS = [['all', 'All', ''], ['romantic', 'Romantic', 'heart'], ['sad', 'Sad', 'rain'], ['party', 'Party', 'flame'], ['chill', 'Chill', 'moon'], ['golden', 'Classics', 'disc']];
const V = {
  home() {
    const offline = !navigator.onLine, rc = st.recent.slice(0, 6); lists.rc = rc; labels.rc = 'Recently played'; rc.forEach(t => byId.set(t.id, t));
    const head = `<div class="hello"><small>${greet().toUpperCase()}</small><h2>What are we playing?</h2></div><div class="moods">${MOOD_CHIPS.map(([k, l, i]) => `<button class="mchip${st.mood === k ? ' on' : ''}" data-act="mood" data-k="${k}">${i ? ic(i) : ''}${l}</button>`).join('')}</div>`;
    const grid = rc.length ? '<div class="grid">' + rc.map((t, i) => `<div class="gc" data-act="play" data-c="rc" data-i="${i}">${art(t)}<b>${esc(t.title)}</b></div>`).join('') + '</div>' : '';
    if (offline) {
      const d = tracksOf(off.all());
      el.innerHTML = head + `<div class="offb">${ic('wifioff')}<span>You’re offline. Your downloaded songs are ready below.</span></div>` + (d.length ? '<h2>Downloaded</h2>' + list(d, 'dv', { label: 'Downloads' }) : '<p class="e">No downloads yet. Download songs while you have internet and they’ll play here without it.</p>') + (grid ? '<h2>Recently played</h2>' + grid : '');
      return;
    }
    const k = rtok, ok = () => k === rtok && st.view === 'home';
    if (st.mood !== 'all') {
      const m = api.MOODS.find(x => x.key === st.mood) || api.MOODS[0];
      el.innerHTML = head + heroCard(m, 'Mood mix') + '<div id="ml"><p class="ld">Building your mix…</p></div>';
      api.buildMix(m).then(l => { if (ok() && $('#ml')) $('#ml').innerHTML = list(l, 'mx', { label: m.title }); }).catch(() => { if (ok() && $('#ml')) $('#ml').innerHTML = '<p class="er">Couldn’t build this mix. Check your connection.</p>'; });
      return;
    }
    el.innerHTML = head + '<div id="hr"><div class="hero2 sk"></div></div>' + grid + '<div id="t10"></div><div id="pa"></div><div id="mx"></div><h2>Moods and genres</h2><div class="hs">' + api.MOODS.map(mixCard).join('') + '</div><div id="na"></div>' + (st.fav.length ? '<h2>Your favorites</h2>' + list(st.fav.slice(0, 3), 'hf', { label: 'Favorites' }) : '');
    api.mixSpecs(topIds()).then(sp => { if (!ok()) return; const first = sp[0] || api.MOODS[0]; $('#hr').innerHTML = heroCard(first, 'Made for you · refreshed today'); if (sp.length > 1) $('#mx').innerHTML = '<h2>Made for you</h2><div class="hs">' + sp.slice(1).map(mixCard).join('') + '</div>'; })
      .catch(() => { if (ok()) $('#hr').innerHTML = heroCard(api.MOODS[0], 'Mood mix'); });
    api.home().then(h => { if (!ok()) return; const top = api.dedupe(h.songs).slice(0, 10); if (top.length) $('#t10').innerHTML = '<h2>Top 10 today</h2>' + list(top, 't10', { num: true, label: 'Top 10 today' }); if (h.albums.length) $('#na').innerHTML = '<h2>New albums</h2><div class="hs">' + h.albums.slice(0, 10).map(ac).join('') + '</div>'; })
      .catch(() => { if (ok()) $('#t10').innerHTML = '<p class="er">Couldn’t load songs. Check your connection.</p>'; });
    api.directory().then(d => {
      if (!ok() || !d.length) return; const by = new Map(d.map(a => [a.id, a]));
      let arts = topIds().map(id => by.get(id)).filter(Boolean).slice(0, 10); const loved = arts.length;
      if (arts.length < 8) arts = arts.concat(d.slice(0, 14).filter(a => !arts.some(x => x.id === a.id))).slice(0, 12);
      $('#pa').innerHTML = `<h2>${loved ? 'Artists you love' : 'Popular artists'}</h2><div class="hs">` + arts.map((a, i) => av(a, i < loved)).join('') + '</div>';
    }).catch(() => {});
  },
  search() { el.innerHTML = `<h2 class="g">Search</h2><input id="q" type="search" dir="auto" placeholder="Artists, songs or albums" value="${esc(st.q)}" enterkeyhint="search" autocomplete="off"><div class="chips" id="ch"></div><div id="res"></div>`; ch(); run(st.q); },
  async artist(id) {
    el.innerHTML = backBar() + '<p class="ld">Loading…</p>'; const k = rtok;
    try {
      const a = await api.artist(id); if (k !== rtok) return;
      const pop = a.songs.slice().sort((x, y) => y.plays - x.plays).slice(0, 10), late = a.songs.slice().sort((x, y) => y.id - x.id).filter(s => !pop.some(p => p.id === s.id)).slice(0, 5);
      el.innerHTML = backBar() + `<div class="hero">${a.cover ? `<img class="c" src="${esc(a.cover)}" alt="">` : `<div class="ph c" style="--p:${pcol(a.name)}">${initial(a.name)}</div>`}<div><small>ARTIST</small><h2>${esc(a.name)}</h2><small>${a.songs.length} songs${a.albums.length ? ' · ' + a.albums.length + ' albums' : ''}</small></div></div>`
        + acts('ar') + '<h2>Popular</h2>' + list(pop, 'ap', { label: a.name }) + (late.length ? '<h2>Latest releases</h2>' + list(late, 'al2', { label: a.name }) : '') + (a.albums.length ? '<h2>Albums</h2><div class="hs">' + a.albums.map(ac).join('') + '</div>' : '') + '<h2>All songs</h2>' + list(a.songs, 'ar', { label: a.name });
    } catch { if (k === rtok) el.innerHTML = backBar() + '<p class="er">Couldn’t load this artist. Check your connection.</p>'; }
  },
  async album(id) {
    el.innerHTML = backBar() + '<p class="ld">Loading…</p>'; const k = rtok;
    try {
      const a = await api.album(id); if (k !== rtok) return;
      el.innerHTML = backBar() + `<div class="hero">${a.cover ? `<img src="${esc(a.cover)}" alt="">` : `<div class="ph" style="--p:${pcol(a.title)}">${initial(a.title)}</div>`}<div><small>ALBUM${a.year ? ' · ' + a.year : ''}</small><h2>${esc(a.title)}</h2>${a.artistId ? `<small class="lnk" data-act="artist" data-id="${a.artistId}">${esc(a.artist)}</small>` : `<small>${esc(a.artist)}</small>`}</div></div>` + acts('al') + list(a.songs, 'al', { label: a.title });
    } catch { if (k === rtok) el.innerHTML = backBar() + '<p class="er">Couldn’t load this album. Check your connection.</p>'; }
  },
  async mix(s) {
    const k = rtok, g = grad(s.key), hero = `<div class="mhero" style="--c1:${g[0]};--c2:${g[1]}"><small>MIX</small><h2>${esc(s.title)}</h2><small>${esc(s.sub || '')}</small></div>`;
    el.innerHTML = backBar() + hero + '<p class="ld">Building your mix…</p>';
    try {
      const l = await api.buildMix(s); if (k !== rtok) return;
      el.innerHTML = backBar() + hero + acts('mx', s.kind === 'new' ? '' : `<button class="chip" data-act="remix" data-k="${esc(s.key)}">${ic('sparkle')}Refresh</button>`) + (l.length ? list(l, 'mx', { label: s.title }) : '<p class="e">Couldn’t find songs for this mix right now.</p>');
    } catch { if (k === rtok) el.innerHTML = backBar() + hero + '<p class="er">Couldn’t build this mix. Check your connection.</p>'; }
  },
  library() {
    el.innerHTML = `<h2 class="g">Your library</h2><div class="chips"><button class="chip" data-go="downloads">${ic('download')}Downloads (${off.all().length})</button><button class="chip" data-go="favorites">${ic('heart')}Favorites (${st.fav.length})</button><button class="chip" data-go="playlists">${ic('list')}Playlists (${Object.keys(st.pl).length})</button></div><h2>Recently played</h2>` + list(st.recent, 'rc', { label: 'Recently played' });
  },
  favorites() { el.innerHTML = '<h2 class="g">Favorites</h2>' + (st.fav.length ? acts('fv') : '') + list(st.fav, 'fv', { label: 'Favorites' }); },
  async downloads() {
    const k = rtok, metas = off.all(), tr = tracksOf(metas);
    await Promise.all(tr.map(async (t, i) => { if (metas[i].cover) t.cover = await off.coverURL(t.id).catch(() => ''); }));
    if (k !== rtok) return;
    const used = off.bytes();
    el.innerHTML = backBar() + `<h2 class="g">Downloads</h2><p class="sub">${tr.length} song${tr.length === 1 ? '' : 's'} · ${mb(used)} on this phone</p>`
      + (tr.length ? `<div class="acts"><button class="big" data-act="playall" data-c="dv" aria-label="Play all">${ic('play')}</button><button class="chip" data-act="shufall" data-c="dv">${ic('shuf')}Shuffle</button><button class="chip" data-act="rmalldl">${ic('trash')}Remove all</button></div>` : '')
      + list(tr, 'dv', { label: 'Downloads', empty: 'No downloads yet. Tap ⋯ on any song, then “Download for offline”.' });
  },
  playlists() {
    const n = st.open;
    if (n && st.pl[n]) el.innerHTML = `<div class="chips"><button class="chip" data-act="back">${ic('back')}Back</button><button class="chip" data-act="pldel" data-n="${esc(n)}">Delete playlist</button></div><h2 class="g">${esc(n)}</h2>` + (st.pl[n].length ? acts('pl:' + n) : '') + list(st.pl[n], 'pl:' + n, { label: n });
    else el.innerHTML = '<h2 class="g">Playlists</h2><button class="chip" data-act="plnew">' + ic('plus') + 'New playlist</button>' + (Object.keys(st.pl).map(k => `<div class="row" data-act="plopen" data-n="${esc(k)}"><div class="ph" style="--p:${pcol(k)}">${ic('list')}</div><div class="m"><b>${esc(k)}</b><small>${st.pl[k].length} songs</small></div></div>`).join('') || '<p class="e">Create your first playlist, or tap ⋯ on any song and choose “Add to playlist”.</p>');
  }
};
const NAV = [['home', 'home', 'Home'], ['search', 'search', 'Search'], ['library', 'library', 'Library'], ['favorites', 'heart', 'Favorites'], ['playlists', 'list', 'Playlists']];
const NAVV = NAV.map(n => n[0]), SUBV = ['artist', 'album', 'mix', 'downloads'];
const renderNav = () => { $('#nav').innerHTML = NAV.map(([k, i, n]) => `<button data-go="${k}" class="${k === st.tab ? 'on' : ''}" aria-label="${n}">${ic(i)}</button>`).join(''); };
function go(v, arg, o = {}) {
  if (!o.back) { if (SUBV.includes(v)) st.stack.push({ v: st.view, a: st.arg, y: scrollY }); else st.stack = []; }
  st.view = v; st.arg = arg; st.open = null; rtok++;
  if (NAVV.includes(v)) st.tab = v; else if (v === 'downloads') st.tab = 'library';
  renderNav(); V[v](arg);
  if (o.y != null) requestAnimationFrame(() => scrollTo(0, o.y)); else scrollTo(0, 0);
}
const back = () => { const p = st.stack.pop(); if (p) go(p.v, p.a, { back: 1, y: p.y }); else go(st.tab || 'home'); };

/* ---------- lock screen / media session ---------- */
const ms = navigator.mediaSession;
function msMeta(t, cov) {
  if (!ms) return;
  const c = cov || t.cover; let src = ''; try { src = c ? new URL(c, location.href).href : ''; } catch {}
  try { ms.metadata = new MediaMetadata({ title: t.title, artist: t.artist, album: t.album || 'BODO', artwork: src ? [{ src, sizes: '512x512' }] : [] }); } catch {}
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
au.addEventListener('playing', () => { const t = st.queue[st.idx]; if (t) msMeta(t, t._lc); bindMS(); });

/* ---------- player ---------- */
const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=';
const isReal = () => !au.src.startsWith('data:');
let unlocked = false; // lets iOS play audio after a short wait
document.addEventListener('click', () => { if (unlocked) return; unlocked = true; if (!au.src) { au.src = SILENT; au.play().then(() => { if (!isReal()) au.pause(); }).catch(() => {}); } }, { capture: true });

function play(l, i, label) { st.queue = l.slice(); st.idx = i; st.fails = 0; st.src = label || 'Your queue'; load(); }
let lt = 0;
async function load() {
  const t = st.queue[st.idx]; if (!t) return; const my = ++lt; st.err = ''; msMeta(t, t._lc); drawP();
  try {
    let src = '';
    if (off.has(t.id)) { const u = await off.url(t.id); if (u) { src = u.audio; t._lc = u.cover; } }
    if (!src) {
      if (!(t.mp3 && t._r)) { if (!navigator.onLine) throw new Error('offline'); await api.resolve(t); }
      src = t.mp3;
    }
    if (my !== lt) return;
    msMeta(t, t._lc); au.src = src; drawP(); await au.play(); st.fails = 0;
  } catch (e) {
    if (my !== lt || e.name === 'AbortError') return;
    st.err = e.message === 'offline' ? 'You’re offline. Play a downloaded song instead.' : 'Couldn’t play this song. Skipping…'; drawP();
    if (e.message !== 'offline' && ++st.fails <= 3) setTimeout(() => { if (my === lt) next(true); }, 1200);
    return;
  }
  if (my !== lt) return;
  st.recent = [t, ...st.recent.filter(x => x.id !== t.id)].slice(0, 30); S('recent', st.recent.map(({ _lc, ...r }) => r));
  if (t.artistId) { st.ap[t.artistId] = (st.ap[t.artistId] || 0) + 1; S('ap', st.ap); }
  drawP();
  const nx = st.queue[st.idx + 1]; if (nx && !nx._r && navigator.onLine && !off.has(nx.id)) api.resolve(nx).catch(() => {}); // get the next song ready
  if (st.queue.length - st.idx <= 3) extend();
}

// endless play: when the queue runs low, add songs by the same artist, your favorites and trending (or your downloads when offline)
async function radioTracks() {
  const key = t => api.norm(t.title) + '|' + (t.artistId || t.artist), have = new Set(st.queue.map(key)), out = [];
  if (!navigator.onLine) return api.shuffle(tracksOf(off.all()).filter(t => !have.has(key(t)))).slice(0, 15);
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
  const r = $('#mpr'); if (r) r.style.strokeDashoffset = 119.38 * (1 - (au.duration ? au.currentTime / au.duration : 0));
  const s = $('#seek'); if (s) { s.max = au.duration || 0; s.value = au.currentTime; $('#ct').textContent = fmt(au.currentTime); $('#dt').textContent = fmt(au.duration); }
  if (st.sleep && Date.now() >= st.sleep) sleepEnd();
  if (ms && isFinite(au.duration) && au.duration > 0) { try { ms.setPositionState({ duration: au.duration, playbackRate: au.playbackRate || 1, position: Math.min(au.currentTime, au.duration) }); } catch {} }
};
function drawP() {
  const t = st.queue[st.idx], m = $('#mini'); m.hidden = !t; if (!t) return;
  if (ms) ms.playbackState = au.paused ? 'paused' : 'playing';
  document.body.classList.toggle('playing', !au.paused);
  document.querySelectorAll('.row.cur').forEach(n => n.classList.remove('cur'));
  document.querySelectorAll(`.row[data-id="${t.id}"]`).forEach(n => n.classList.add('cur'));
  const cover = (!navigator.onLine && t._lc) || t.cover || t._lc || '';
  const pl = ic(au.paused ? 'play' : 'pause'), w = au.duration ? au.currentTime / au.duration : 0;
  const cv = cover ? `<img src="${esc(cover)}" alt="">` : `<div class="ph" style="--p:${pcol(t.title)}">${initial(t.title)}</div>`;
  m.innerHTML = `<div class="vinyl${au.paused ? '' : ' spin'}">${cv}<i class="hole"></i></div><div class="mt" data-act="expand"><b>${esc(t.title)}</b><small>${st.err ? esc(st.err) : esc(t.artist)}</small></div><div class="ring"><svg viewBox="0 0 44 44" aria-hidden="true"><circle class="trk" cx="22" cy="22" r="19"/><circle id="mpr" class="prg" cx="22" cy="22" r="19" style="stroke-dashoffset:${119.38 * (1 - w)}"/></svg><button data-act="pp" aria-label="Play or pause">${pl}</button></div><button class="nx" data-act="next" aria-label="Next">${ic('next')}</button>`;
  if (!$('#full').hidden) {
    const f = isFav(t), nx = st.queue[st.idx + 1], left = sleepLeft(), has = off.has(t.id);
    $('#full').innerHTML = `<div class="fbg">${cover ? `<img src="${esc(cover)}" alt="">` : ''}</div><div class="fc">`
      + `<div class="ftop"><button data-act="close" class="cl" aria-label="Close">${ic('down')}</button><div><small>PLAYING FROM</small><b>${esc(st.src || 'Your queue')}</b></div><button class="cl" data-act="share" aria-label="Share">${ic('share')}</button></div>`
      + (cover ? `<img class="big" src="${esc(cover)}" alt="">` : `<div class="ph big" style="--p:${pcol(t.title)}">${initial(t.title)}</div>`)
      + `<div class="ftitle"><div><h2>${esc(t.title)}</h2><small>${t.artistId ? `<span class="lnk" data-act="artist" data-id="${t.artistId}">${esc(t.artist)}</span>` : esc(t.artist)}</small></div><button data-act="favnow" class="${f ? 'on' : ''}" aria-label="Favorite">${ic(f ? 'heartF' : 'heart')}</button></div>`
      + (st.err ? `<p class="er">${esc(st.err)}</p>` : '')
      + `<input id="seek" type="range" min="0" max="${au.duration || 0}" step="1" value="${au.currentTime}" dir="ltr"><div class="tm" dir="ltr"><span id="ct">${fmt(au.currentTime)}</span><span id="dt">${fmt(au.duration)}</span></div>`
      + `<div class="ctl" dir="ltr"><button data-act="shuf" class="${st.shuf ? 'on' : ''}" aria-label="Shuffle">${ic('shuf')}</button><button data-act="prev" aria-label="Previous">${ic('prev')}</button><button class="pp" data-act="pp" aria-label="Play or pause">${pl}</button><button data-act="next" aria-label="Next">${ic('next')}</button><button data-act="rep" class="${st.rep ? 'on' : ''}" aria-label="Repeat">${ic(st.rep === 2 ? 'rep1' : 'rep')}</button></div>`
      + `<div class="fchips"><button class="fchip${left ? ' gold' : ''}" data-act="sleep">${ic('moon')}${left ? left + ' min left' : 'Sleep timer'}</button><button class="fchip${has ? ' on' : ''}" data-act="dlnow">${ic(has ? 'dlok' : 'download')}${has ? 'Downloaded' : 'Download'}</button><button class="fchip" data-act="toqueue">${ic('list')}Queue</button></div>`
      + (nx ? `<div class="upn"><div class="th" style="background:${pcol(nx.title)}"></div><div><small>Up next · Autoplay</small><b>${esc(nx.title)}${nx.artist ? ' · ' + esc(nx.artist) : ''}</b></div>${ic('infinity')}</div>` : '')
      + '<h2 id="qh">Queue</h2>' + st.queue.map((x, i) => `<div class="q ${i === st.idx ? 'cur' : ''}" data-act="qplay" data-i="${i}">${esc(x.title)} — ${esc(x.artist)}</div>`).join('') + '</div>';
  }
}

/* ---------- events ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act],[data-go]'); if (!b) return;
  const d = b.dataset, a = d.act; if (d.go && !a) return go(d.go);
  const t = lists[d.c]?.[d.i], cur = st.queue[st.idx];
  const mixOf = () => mixReg.get(d.k);
  const buildPlay = shuffle => { const s = mixOf(); if (!s) return; toast('Building ' + s.title + '…'); api.buildMix(s).then(l => l.length ? play(shuffle ? api.shuffle(l) : l, 0, s.title) : toast('Couldn’t build this mix')).catch(() => toast('Couldn’t build this mix')); };
  const A = {
    play: () => play(lists[d.c], +d.i, labels[d.c]),
    fav: () => { toggleFav(t); b.innerHTML = ic(isFav(t) ? 'heartF' : 'heart'); b.classList.toggle('on', isFav(t)); },
    more: () => openSheet(t, d.c, d.i),
    sclose: () => closeSheet(),
    sheetact: () => {
      const x = sheetT; closeSheet(); if (!x) return;
      ({
        dl: () => { if (off.has(x.id)) { if (confirm('Remove this download?')) off.remove(x.id).then(() => { unmarkDl(x.id); toast('Download removed'); if (st.view === 'downloads') go('downloads', null, { back: 1, y: scrollY }); }); } else enqueue([x]); },
        pl: () => addToPlaylist(x), next: () => queueAdd(x, true), queue: () => queueAdd(x, false),
        artist: () => { $('#full').hidden = true; go('artist', x.artistId); }, share: () => share(x),
        rm: () => { st.pl[sheetC.slice(3)].splice(sheetI, 1); S('pl', st.pl); V.playlists(); }
      }[d.a] || (() => {}))();
    },
    q: () => { st.q = d.q; go('search'); },
    mood: () => { st.mood = d.k; go('home'); },
    plnew: () => { const k = (prompt('New playlist name') || '').trim(); if (k) { st.pl[k] = st.pl[k] || []; S('pl', st.pl); V.playlists(); } },
    plopen: () => { st.open = d.n; V.playlists(); },
    pldel: () => { if (confirm('Delete this playlist?')) { delete st.pl[d.n]; S('pl', st.pl); st.open = null; V.playlists(); } },
    back: () => { st.open = null; V.playlists(); },
    goback: () => back(),
    artist: () => { $('#full').hidden = true; go('artist', +d.id); },
    album: () => go('album', +d.id),
    mixopen: () => { const s = mixOf(); if (s) go('mix', s); },
    mixplay: () => buildPlay(false), mixshuf: () => buildPlay(true),
    remix: () => { const s = mixOf(); if (s) { s.seed = Date.now(); go('mix', s, { back: 1 }); } },
    playall: () => { const l = lists[d.c]; if (l?.length) play(l, 0, labels[d.c]); },
    shufall: () => { const l = lists[d.c]; if (l?.length) play(api.shuffle(l), 0, labels[d.c]); },
    dlall: () => { const l = lists[d.c] || []; if (!l.length) return; if (l.length > 30 && !confirm(`Download ${l.length} songs? This may use about ${Math.round(l.length * 4.5)} MB of storage.`)) return; enqueue(l); },
    dlstop: () => { dl.stop = true; dl.q.length = 0; },
    rmalldl: () => { if (confirm('Remove all downloaded songs from this phone?')) off.clear().then(() => { toast('All downloads removed'); go('downloads', null, { back: 1 }); }); },
    expand: () => { $('#full').hidden = false; drawP(); },
    close: () => { $('#full').hidden = true; },
    pp: () => { if (au.src && isReal()) au.paused ? au.play().catch(() => {}) : au.pause(); },
    next: () => next(false), prev,
    shuf: () => { st.shuf = !st.shuf; drawP(); },
    rep: () => { st.rep = (st.rep + 1) % 3; drawP(); },
    sleep: () => cycleSleep(),
    share: () => cur && share(cur),
    favnow: () => { if (cur) { toggleFav(cur); drawP(); } },
    dlnow: () => { if (!cur) return; if (off.has(cur.id)) { if (confirm('Remove this download?')) off.remove(cur.id).then(() => { unmarkDl(cur.id); drawP(); }); } else enqueue([cur]); },
    toqueue: () => $('#qh')?.scrollIntoView({ behavior: 'smooth' }),
    qplay: () => { st.idx = +d.i; load(); }
  };
  (A[a] || (() => {}))();
});
let dt;
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'q') { st.q = t.value.trim(); ch(); clearTimeout(dt); dt = setTimeout(() => run(st.q), 450); }
  else if (t.id === 'seek') au.currentTime = t.value;
});
document.addEventListener('change', e => { if (e.target.id === 'q' && st.q.length > 1) { st.hist = [st.q, ...st.hist.filter(h => h !== st.q)].slice(0, 15); S('hist', st.hist); } });
addEventListener('offline', () => { toast('You’re offline. Downloaded songs still play.'); if (st.view === 'home') go('home'); });
addEventListener('online', () => { toast('Back online'); if (st.view === 'home') go('home'); });
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
off.init().catch(() => {}).finally(() => go('home'));
