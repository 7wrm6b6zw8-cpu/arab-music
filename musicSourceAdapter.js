import * as albumaty from './albumaty.js';
import * as audius from './audius.js';

const sources = { albumaty, audius };
const norm = value => String(value || '')
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[\u064B-\u065F\u0670]/g, '')
  .replace(/[أإآ]/g, 'ا')
  .replace(/ى/g, 'ي')
  .replace(/[^a-z0-9\u0600-\u06FF]+/g, ' ')
  .trim()
  .replace(/\s+/g, ' ');

function mergeTracks(groups) {
  const seen = new Set();
  const merged = [];
  for (const group of groups) {
    for (const track of Array.isArray(group) ? group : []) {
      if (!track?.title || !track?.artist) continue;
      const key = `${norm(track.title)}|${norm(track.artist)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(track);
    }
  }
  return merged;
}

async function settledCalls(calls) {
  const results = await Promise.allSettled(calls.map(call => call()));
  return results.map(result => result.status === 'fulfilled' ? result.value : []);
}

export const search = async query => {
  const q = String(query || '').trim();
  if (!q) return [];

  // MIX/RECOMMEND are custom commands understood by the Cloudflare Worker.
  if (/^(MIX|RECOMMEND):/i.test(q)) {
    try { return await albumaty.search(q); }
    catch { return []; }
  }

  const groups = await settledCalls([
    () => albumaty.isEnabled() ? albumaty.search(q) : [],
    () => audius.isEnabled() ? audius.search(q) : []
  ]);
  return mergeTracks(groups);
};

export const trending = async () => {
  const groups = await settledCalls([
    () => albumaty.isEnabled() ? albumaty.trending() : [],
    () => audius.isEnabled() ? audius.trending() : []
  ]);
  return mergeTracks(groups);
};

export const getArtist = async id => {
  if (String(id || '').startsWith('alb_') && albumaty.isEnabled()) {
    return albumaty.getArtist(id);
  }
  return [];
};

export const streamUrl = track => {
  const source = sources[track?.source];
  if (!source || typeof source.streamUrl !== 'function') return null;
  return source.streamUrl(track);
};
