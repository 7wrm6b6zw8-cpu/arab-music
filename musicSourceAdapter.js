import * as albumaty from './albumaty.js';
import * as audius from './audius.js';
const sources = { albumaty, audius };
const ORDER = ['albumaty', 'audius'];

async function first(fn, ...args) {
  let err;
  for (const n of ORDER) {
    const s = sources[n];
    if (!s.isEnabled()) continue;
    try { const r = await s[fn](...args); if (r && r.length) return r; } catch (e) { err = e; console.warn(n, e); }
  }
  if (err) throw err;
  return [];
}

export const search = q => first('search', q);
export const trending = () => first('trending');
export const getArtist = id => first('getArtist', id);
export const streamUrl = t => sources[t.source].streamUrl(t);
