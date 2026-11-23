import * as src from './musicSourceAdapter.js';

const WORKER = 'https://lingering-butterfly-5d60.7wrm6b6zw8.workers.dev';
const cache = new Map();
const norm = value => String(value || '').toLowerCase().normalize('NFKD')
  .replace(/[\u064B-\u065F\u0670]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي')
  .replace(/[^a-z0-9\u0600-\u06FF]+/g, ' ').trim().replace(/\s+/g, ' ');

async function getChart(country) {
  const cached = cache.get(country);
  if (cached && Date.now() - cached.time < 15 * 60 * 1000) return cached.items;
  const response = await fetch(`${WORKER}/charts?country=${encodeURIComponent(country)}&limit=100`);
  if (!response.ok) throw new Error(`Chart request failed (${response.status})`);
  const data = await response.json();
  const items = Array.isArray(data.items) ? data.items : [];
  cache.set(country, { time: Date.now(), items });
  return items;
}

export const getEgyptTopSongs = () => getChart('eg');
export const getArabRegionSongs = async () => {
  const [sa, ae] = await Promise.all([getChart('sa'), getChart('ae')]);
  const seen = new Set();
  return [...sa, ...ae].filter(track => {
    const key = `${norm(track.title)}|${norm(track.artist)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 100);
};
export const getGlobalTopSongs = () => getChart('us');

export async function resolveChartTrack(chartTrack, search = src.search) {
  if (!chartTrack?.title || !chartTrack?.artist) return null;
  const queries = [
    `${chartTrack.title} ${chartTrack.artist}`,
    chartTrack.title
  ];
  for (const query of queries) {
    let matches = [];
    try { matches = await search(query); } catch { matches = []; }
    const exact = matches.find(track => {
      const title = norm(track.title), wanted = norm(chartTrack.title);
      const artist = norm(track.artist), wantedArtist = norm(chartTrack.artist);
      const artistTokens = wantedArtist.split(/[,،&]+/).map(x => x.trim()).filter(Boolean);
      const titleOk = title === wanted || (Math.min(title.length, wanted.length) > 7 && (title.includes(wanted) || wanted.includes(title)));
      const artistOk = artist === wantedArtist || artist.includes(wantedArtist) || wantedArtist.includes(artist) || artistTokens.some(token => token.length > 2 && (artist.includes(token) || token.includes(artist)));
      return titleOk && artistOk;
    });
    if (exact) return exact;
  }
  return null;
}
