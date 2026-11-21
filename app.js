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
const row = (t, c, i) => { const a = `data-c="${esc(c)}" data-i="${i}"`; return `<div class="row"><img src="${esc(t.cover)}" alt="" loading="lazy"><div class="m" data-act="play" ${a}><b>${esc(t.title)}</b><small>${esc(t.artist)}${t.album ? ' · ' + esc(t.album) : ''}</small></div><button data-act="fav" ${a}>${isFav(t) ? '♥' : '♡'}</button>${c.startsWith('pl:') ? `<button data-act="rm" ${a}>✕</button>` : `<button data-act="add" ${a}>＋</button>`}</div>`; };
const list = (a, c) => { lists[c] = a; return a.length ? a.map((t, i) => row(t, c, i)).join('') : '<p class="e">لا شيء هنا بعد. اضغط ♡ على أي أغنية لحفظها.</p>'; };
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
    const rc = st.recent.slice(0, 5);
    el.innerHTML = `<button class="sb" data-go="search">🔍 ابحث عن أغنية أو فنان أو ألبوم</button>` + (rc.length ? '<h2>تم تشغيله مؤخرًا</h2>' + list(rc, 'rc') : '') + (st.fav.length ? '<h2>مفضلتك</h2>' + list(st.fav.slice(0, 3), 'hf') : '') + '<h2>الفنانون الرائجون</h2><div class="chips" id="ar"></div><h2>الأكثر رواجًا</h2><div id="tr"><p class="ld">جارٍ التحميل…</p></div>';
    src.trending().then(a => { if (st.view !== 'home') return; $('#ar').innerHTML = [...new Set(a.map(t => t.artist))].slice(0, 10).map(chip).join(''); $('#tr').innerHTML = list(a.slice(0, 20), 'tr'); })
      .catch(() => { if (st.view === 'home') $('#tr').innerHTML = '<p class="er">تعذر تحميل الأغاني. تحقق من الاتصال.</p>'; });
  },
  search() { el.innerHTML = `<input id="q" type="search" placeholder="ابحث عن أغنية أو فنان أو ألبوم" value="${esc(st.q)}" enterkeyhint="search" autocomplete="off"><div class="chips" id="ch"></div><div id="res"></div>`; ch(); run(st.q); },
  library() { el.innerHTML = `<h2>مكتبتي</h2><div class="chips"><button class="chip" data-go="favorites">المفضلة (${st.fav.length})</button><button class="chip" data-go="playlists">القوائم (${Object.keys(st.pl).length})</button></div><h2>تم تشغيله مؤخرًا</h2>` + list(st.recent, 'rc'); },
  favorites() { el.innerHTML = '<h2>المفضلة</h2>' + list(st.fav, 'fv'); },
  playlists() {
    const n = st.open;
    if (n && st.pl[n]) el.innerHTML = `<button class="chip" data-act="back">‹ رجوع</button> <button class="chip" data-act="pldel" data-n="${esc(n)}">حذف القائمة</button><h2>${esc(n)}</h2>` + list(st.pl[n], 'pl:' + n);
    else el.innerHTML = '<button class="chip" data-act="plnew">＋ قائمة جديدة</button>' + (Object.keys(st.pl).map(k => `<div class="row" data-act="plopen" data-n="${esc(k)}"><div class="m"><b>${esc(k)}</b><small>${st.pl[k].length} أغنية</small></div></div>`).join('') || '<p class="e">أنشئ قائمتك الأولى، أو اضغط ＋ بجانب أي أغنية.</p>');
  }
};
const NAV = [['home', '🏠', 'الرئيسية'], ['search', '🔍', 'بحث'], ['library', '📚', 'مكتبتي'], ['favorites', '♥', 'المفضلة'], ['playlists', '🎶', 'القوائم']];
function go(v) { st.view = v; st.open = null; $('#nav').innerHTML = NAV.map(([k, i, n]) => `<button data-go="${k}" class="${k === v ? 'on' : ''}"><i>${i}</i>${n}</button>`).join(''); V[v](); scrollTo(0, 0); }

function play(l, i) { st.queue = l.slice(); st.idx = i; load(); }
async function load() {
  const t = st.queue[st.idx]; if (!t) return; st.err = '';
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
function prev() { if (au.currentTime > 3) { au.currentTime = 0; return; } st.idx = (st.idx - 1 + st.queue.length) % st.queue.length; load(); }
au.onended = () => next(true);
au.onerror = () => { st.err = 'هذه الأغنية غير متاحة حاليًا.'; drawP(); };
au.onplay = au.onpause = au.onloadedmetadata = () => drawP();
au.ontimeupdate = () => { const s = $('#seek'); if (s) { s.max = au.duration || 0; s.value = au.currentTime; $('#ct').textContent = fmt(au.currentTime); $('#dt').textContent = fmt(au.duration); } };
function drawP() {
  const t = st.queue[st.idx], m = $('#mini'); m.hidden = !t; if (!t) return;
  const pl = au.paused ? '▶' : '⏸';
  m.innerHTML = `<img src="${esc(t.cover)}" alt=""><div data-act="expand"><b>${esc(t.title)}</b><small>${st.err ? esc(st.err) : esc(t.artist)}</small></div><button data-act="pp">${pl}</button><button data-act="next">⏭</button>`;
  if (!$('#full').hidden) $('#full').innerHTML = `<button data-act="close" style="font-size:26px">⌄</button><img class="big" src="${esc(t.cover)}" alt=""><h2>${esc(t.title)}</h2><small>${esc(t.artist)}</small>${st.err ? `<p class="er">${esc(st.err)}</p>` : ''}<input id="seek" type="range" min="0" max="${au.duration || 0}" step="1" value="${au.currentTime}" dir="ltr"><div class="tm" dir="ltr"><span id="ct">${fmt(au.currentTime)}</span><span id="dt">${fmt(au.duration)}</span></div><div class="ctl" dir="ltr"><button data-act="shuf" class="${st.shuf ? 'on' : ''}">🔀</button><button data-act="prev">⏮</button><button class="pp" data-act="pp">${pl}</button><button data-act="next">⏭</button><button data-act="rep" class="${st.rep ? 'on' : ''}">${st.rep === 2 ? '🔂' : '🔁'}</button></div><div class="vol" dir="ltr"><button data-act="mute">${au.muted ? '🔇' : '🔊'}</button><input id="vol" type="range" min="0" max="1" step=".05" value="${au.volume}"></div><h2>قائمة التشغيل</h2>` + st.queue.map((x, i) => `<div class="q ${i === st.idx ? 'cur' : ''}" data-act="qplay" data-i="${i}">${esc(x.title)} — ${esc(x.artist)}</div>`).join('');
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act],[data-go]'); if (!b) return;
  const d = b.dataset, a = d.act; if (d.go && !a) return go(d.go);
  const t = lists[d.c]?.[d.i];
  const A = {
    play: () => play(lists[d.c], +d.i),
    fav: () => { st.fav = isFav(t) ? st.fav.filter(x => x.id !== t.id) : [t, ...st.fav]; S('fav', st.fav); b.textContent = isFav(t) ? '♥' : '♡'; },
    add: () => { const k = (prompt('اسم القائمة' + (Object.keys(st.pl).length ? '\nالقوائم: ' + Object.keys(st.pl).join('، ') : '')) || '').trim(); if (!k) return; st.pl[k] = st.pl[k] || []; if (!st.pl[k].some(x => x.id === t.id)) st.pl[k].push(t); S('pl', st.pl); b.textContent = '✓'; },
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
