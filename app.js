import * as src from './musicSourceAdapter.js';
const $ = s => document.querySelector(s), el = $('#view');
const L = (k, d) => { try { return JSON.parse(localStorage.getItem('am_' + k)) ?? d; } catch { return d; } };
const S = (k, v) => { try { localStorage.setItem('am_' + k, JSON.stringify(v)); } catch {} };
const st = { fav: L('fav', []), recent: L('recent', []), pl: L('pl', {}), hist: L('hist', []), queue: [], idx: -1, shuf: false, rep: 0, view: 'home', open: null, q: '', err: '' };
const au = new Audio(); au.preload = 'none';
const lists = {};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = s => isFinite(s) && s > 0 ? Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') : '0:00';
const isFav = t => st.fav.some(x => x.id === t.id);

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
const greet = () => new Date().getHours() < 12 ? 'صباح الخير' : 'مساء الخير';

const row = (t, c, i) => {
  const a = `data-c="${esc(c)}" data-i="${i}"`, f = isFav(t);
  return `<div class="row"><img src="${esc(t.cover)}" alt="" loading="lazy"><div class="m" data-act="play" ${a}><b>${esc(t.title)}</b><small>${esc(t.artist)}${t.album ? ' · ' + esc(t.album) : ''}</small></div><button data-act="fav" ${a} class="${f ? 'on' : ''}" aria-label="المفضلة">${ic(f ? 'heartF' : 'heart')}</button>${c.startsWith('pl:') ? `<button data-act="rm" ${a} aria-label="حذف من القائمة">${ic('x')}</button>` : `<button data-act="add" ${a} aria-label="إضافة إلى قائمة">${ic('plus')}</button>`}</div>`;
};
const list = (a, c) => { lists[c] = a; return a.length ? a.map((t, i) => row(t, c, i)).join('') : '<p class="e">لا شيء هنا بعد. اضغط على القلب بجانب أي أغنية لحفظها.</p>'; };
const chip = n => `<button class="chip" data-act="q" data-q="${esc(n)}">${esc(n)}</button>`;

let tok = 0;
async function run(q) {
  const r = $('#res'), n = ++tok; if (!r) return;
  if (q.length < 2) { r.innerHTML = ''; return; }
  r.innerHTML = '<p class="ld">جارٍ البحث…</p>';
  try {
    let a = await src.search(q); if (n !== tok) return;
    const seen = new Set(); a = a.filter(t => { const k = (t.title + t.artist).toLowerCase(); return seen.has(k) ? false : seen.add(k); });
    r.innerHTML = a.length ? list(a, 's') : `<p class="e">لا نتائج لـ «${esc(q)}». جرّب كلمات أخرى.</p>`;
  } catch { if (n === tok) r.innerHTML = '<p class="er">تعذر الاتصال بمصدر الموسيقى. تحقق من الإنترنت وحاول مرة أخرى.</p>'; }
}
const ch = () => { const c = $('#ch'); if (c) c.innerHTML = st.hist.filter(h => h.includes($('#q').value)).slice(0, 8).map(chip).join(''); };

const V = {
  home() {
    const rc = st.recent.slice(0, 6); lists.rc = rc;
    el.innerHTML = `<h2 class="g">${greet()}</h2>` +
      (rc.length ? '<div class="grid">' + rc.map((t, i) => `<div class="gc" data-act="play" data-c="rc" data-i="${i}"><img src="${esc(t.cover)}" alt="" loading="lazy"><b>${esc(t.title)}</b></div>`).join('') + '</div>' : '') +
      (st.fav.length ? '<h2>مفضلتك</h2>' + list(st.fav.slice(0, 3), 'hf') : '') +
      '<h2>الفنانون الرائجون</h2><div class="chips" id="ar"></div><h2>الأكثر رواجًا</h2><div id="tr"><p class="ld">جارٍ التحميل…</p></div>';
    src.trending().then(a => { if (st.view !== 'home') return; $('#ar').innerHTML = [...new Set(a.map(t => t.artist))].slice(0, 10).map(chip).join(''); $('#tr').innerHTML = list(a.slice(0, 20), 'tr'); })
      .catch(() => { if (st.view === 'home') $('#tr').innerHTML = '<p class="er">تعذر تحميل الأغاني. تحقق من الاتصال.</p>'; });
  },
  search() { el.innerHTML = `<h2 class="g">بحث</h2><input id="q" type="search" placeholder="ماذا تريد أن تسمع؟" value="${esc(st.q)}" enterkeyhint="search" autocomplete="off"><div class="chips" id="ch"></div><div id="res"></div>`; ch(); run(st.q); },
  library() { el.innerHTML = `<h2 class="g">مكتبتي</h2><div class="chips"><button class="chip" data-go="favorites">المفضلة (${st.fav.length})</button><button class="chip" data-go="playlists">القوائم (${Object.keys(st.pl).length})</button></div><h2>تم تشغيله مؤخرًا</h2>` + list(st.recent, 'rc'); },
  favorites() { el.innerHTML = '<h2 class="g">المفضلة</h2>' + list(st.fav, 'fv'); },
  playlists() {
    const n = st.open;
    if (n && st.pl[n]) el.innerHTML = `<div class="chips"><button class="chip" data-act="back">${ic('back')}رجوع</button><button class="chip" data-act="pldel" data-n="${esc(n)}">حذف القائمة</button></div><h2 class="g">${esc(n)}</h2>` + list(st.pl[n], 'pl:' + n);
    else el.innerHTML = '<h2 class="g">القوائم</h2><button class="chip" data-act="plnew">' + ic('plus') + 'قائمة جديدة</button>' + (Object.keys(st.pl).map(k => `<div class="row" data-act="plopen" data-n="${esc(k)}"><div class="ph">${ic('list')}</div><div class="m"><b>${esc(k)}</b><small>${st.pl[k].length} أغنية</small></div></div>`).join('') || '<p class="e">أنشئ قائمتك الأولى، أو اضغط على + بجانب أي أغنية.</p>');
  }
};
const NAV = [['home', 'home', 'الرئيسية'], ['search', 'search', 'بحث'], ['library', 'library', 'مكتبتي'], ['favorites', 'heart', 'المفضلة'], ['playlists', 'list', 'القوائم']];
function go(v) { st.view = v; st.open = null; $('#nav').innerHTML = NAV.map(([k, i, n]) => `<button data-go="${k}" class="${k === v ? 'on' : ''}"><i>${ic(i)}</i>${n}</button>`).join(''); V[v](); scrollTo(0, 0); }

const ms = navigator.mediaSession;
function msMeta(t) {
  if (!ms) return;
  try { ms.metadata = new MediaMetadata({ title: t.title, artist: t.artist, album: t.album || 'BODO', artwork: t.cover ? [{ src: new URL(t.cover, location.href).href, sizes: '512x512' }] : [] }); } catch {}
}
if (ms) {
  const h = (a, f) => { try { ms.setActionHandler(a, f); } catch {} };
  h('play', () => au.play().catch(() => {}));
  h('pause', () => au.pause());
  h('nexttrack', () => next(false));
  h('previoustrack', () => prev());
  h('seekbackward', null);
  h('seekforward', null);
  h('seekto', d => { if (d.seekTime != null) au.currentTime = d.seekTime; });
}

function play(l, i) { st.queue = l.slice(); st.idx = i; load(); }
async function load() {
  const t = st.queue[st.idx]; if (!t) return; st.err = '';
  msMeta(t);
  try { au.src = src.streamUrl(t); drawP(); await au.play(); } catch (e) { if (e.name !== 'AbortError') st.err = 'تعذر تشغيل هذه الأغنية. جرّب أغنية أخرى.'; }
  st.recent = [t, ...st.recent.filter(x => x.id !== t.id)].slice(0, 30); S('recent', st.recent); drawP();
}
function next(auto) {
  const n = st.queue.length; if (!n) return;
  if (auto && st.rep === 2) { au.currentTime = 0; au.play(); return; }
  let i = st.shuf ? Math.floor(Math.random() * n) : st.idx + 1;
  if (i >= n) { if (st.rep || !auto) i = 0; else { au.pause(); return; } }
  st.idx = i; load();
}
function prev() { if (!st.queue.length) return; if (au.currentTime > 3) { au.currentTime = 0; return; } st.idx = (st.idx - 1 + st.queue.length) % st.queue.length; load(); }
au.onended = () => next(true);
au.onerror = () => { st.err = 'هذه الأغنية غير متاحة حاليًا.'; drawP(); };
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
  m.innerHTML = `<img src="${esc(t.cover)}" alt=""><div class="mt" data-act="expand"><b>${esc(t.title)}</b><small>${st.err ? esc(st.err) : esc(t.artist)}</small></div><button data-act="pp" aria-label="تشغيل أو إيقاف">${pl}</button><button data-act="next" aria-label="التالي">${ic('next')}</button><div class="mp"><i id="mpb" style="width:${w}%"></i></div>`;
  if (!$('#full').hidden) $('#full').innerHTML = `<button data-act="close" class="cl" aria-label="إغلاق">${ic('down')}</button><img class="big" src="${esc(t.cover)}" alt=""><h2>${esc(t.title)}</h2><small>${esc(t.artist)}</small>${st.err ? `<p class="er">${esc(st.err)}</p>` : ''}<input id="seek" type="range" min="0" max="${au.duration || 0}" step="1" value="${au.currentTime}" dir="ltr"><div class="tm" dir="ltr"><span id="ct">${fmt(au.currentTime)}</span><span id="dt">${fmt(au.duration)}</span></div><div class="ctl" dir="ltr"><button data-act="shuf" class="${st.shuf ? 'on' : ''}" aria-label="عشوائي">${ic('shuf')}</button><button data-act="prev" aria-label="السابق">${ic('prev')}</button><button class="pp" data-act="pp" aria-label="تشغيل أو إيقاف">${pl}</button><button data-act="next" aria-label="التالي">${ic('next')}</button><button data-act="rep" class="${st.rep ? 'on' : ''}" aria-label="تكرار">${ic(st.rep === 2 ? 'rep1' : 'rep')}</button></div><div class="vol" dir="ltr"><button data-act="mute" aria-label="كتم">${ic(au.muted ? 'mute' : 'vol')}</button><input id="vol" type="range" min="0" max="1" step=".05" value="${au.volume}"></div><h2>قائمة التشغيل</h2>` + st.queue.map((x, i) => `<div class="q ${i === st.idx ? 'cur' : ''}" data-act="qplay" data-i="${i}">${esc(x.title)} — ${esc(x.artist)}</div>`).join('');
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act],[data-go]'); if (!b) return;
  const d = b.dataset, a = d.act; if (d.go && !a) return go(d.go);
  const t = lists[d.c]?.[d.i];
  const A = {
    play: () => play(lists[d.c], +d.i),
    fav: () => { st.fav = isFav(t) ? st.fav.filter(x => x.id !== t.id) : [t, ...st.fav]; S('fav', st.fav); b.innerHTML = ic(isFav(t) ? 'heartF' : 'heart'); b.classList.toggle('on', isFav(t)); },
    add: () => { const k = (prompt('اسم القائمة' + (Object.keys(st.pl).length ? '\nالقوائم: ' + Object.keys(st.pl).join('، ') : '')) || '').trim(); if (!k) return; st.pl[k] = st.pl[k] || []; if (!st.pl[k].some(x => x.id === t.id)) st.pl[k].push(t); S('pl', st.pl); b.innerHTML = ic('check'); b.classList.add('on'); },
    rm: () => { st.pl[d.c.slice(3)].splice(+d.i, 1); S('pl', st.pl); V.playlists(); },
    q: () => { st.q = d.q; go('search'); },
    plnew: () => { const k = (prompt('اسم القائمة الجديدة') || '').trim(); if (k) { st.pl[k] = st.pl[k] || []; S('pl', st.pl); V.playlists(); } },
    plopen: () => { st.open = d.n; V.playlists(); },
    pldel: () => { if (confirm('حذف هذه القائمة؟')) { delete st.pl[d.n]; S('pl', st.pl); st.open = null; V.playlists(); } },
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
