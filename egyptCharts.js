// Public chart metadata for discovery. This does not provide playable audio.
const FEEDS = [
  'https://rss.marketingtools.apple.com/api/v2',
  'https://rss.applemarketingtools.com/api/v2'
];
const CACHE_KEY = 'bodo_chart_v1_';
const TTL = 6 * 60 * 60 * 1000;

function normalize(item, index) {
  const a = item || {};
  return {
    id: `chart-eg-${a.id || index}`,
    source: 'chart',
    chartRank: index + 1,
    title: String(a.name || '').trim(),
    artist: String(a.artistName || '').trim(),
    album: String(a.albumName || '').trim(),
    cover: String(a.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
    chartUrl: String(a.url || ''),
    duration: 0
  };
}

export async function getChart(storefront = 'eg') {
  const country = /^[a-z]{2}$/i.test(storefront) ? storefront.toLowerCase() : 'eg';
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY + country) || 'null');
    if (cached && Date.now() - cached.savedAt < TTL && Array.isArray(cached.items)) return cached.items;
  } catch {}

  let lastError = null;
  for (const base of FEEDS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(`${base}/${country}/music/most-played/100/songs.json`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });
      if (!response.ok) throw new Error(`Chart request failed (${response.status})`);
      const payload = await response.json();
      const items = (Array.isArray(payload?.feed?.results) ? payload.feed.results : [])
        .map(normalize).filter(x => x.title && x.artist);
      if (!items.length) throw new Error('Chart returned no tracks');
      try { localStorage.setItem(CACHE_KEY + country, JSON.stringify({ savedAt: Date.now(), items })); } catch {}
      return items;
    } catch (error) { lastError = error; }
    finally { clearTimeout(timeout); }
  }
  throw lastError || new Error('Chart feed unavailable');
}

export const getEgyptTopSongs = () => getChart('eg');
export async function getArabRegionSongs() {
  const [sa, ae] = await Promise.allSettled([getChart('sa'), getChart('ae')]);
  const merged = [...(sa.status === 'fulfilled' ? sa.value : []), ...(ae.status === 'fulfilled' ? ae.value : [])];
  const seen = new Set();
  const result = merged.filter(track => { const key = clean(track.title) + '|' + clean(track.artist); if (seen.has(key)) return false; seen.add(key); return true; });
  if (!result.length) throw new Error('Arab region charts are unavailable');
  return result.slice(0, 100).map((track, index) => ({ ...track, id: `chart-ar-${index}`, chartRank: index + 1 }));
}
export const getGlobalTopSongs = () => getChart('us');

const clean = value => String(value || '').toLocaleLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

function similarity(a, b) {
  const x = clean(a), y = clean(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.86;
  const xs = new Set(x.split(/\s+/)), ys = new Set(y.split(/\s+/));
  const overlap = [...xs].filter(v => ys.has(v)).length;
  return overlap / Math.max(xs.size, ys.size);
}

export async function resolveChartTrack(chartTrack, search) {
  const query = `${chartTrack.title} ${chartTrack.artist}`.trim();
  const results = await search(query);
  if (!Array.isArray(results) || !results.length) return null;
  let best = null, bestScore = 0;
  for (const track of results) {
    const titleScore = similarity(track.title, chartTrack.title);
    const artistScore = similarity(track.artist, chartTrack.artist);
    const score = titleScore * 0.72 + artistScore * 0.28;
    if (score > bestScore) { best = track; bestScore = score; }
  }
  // Avoid silently playing a different song from the chart listing.
  return best && bestScore >= 0.76 ? best : null;
}
