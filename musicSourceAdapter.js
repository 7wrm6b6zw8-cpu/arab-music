// The ONLY file the UI talks to. Track shape: {id,source,title,artist,album,cover,duration,...}
// Providers are tried in this order; a provider that is not enabled is skipped.
import * as albumaty from './albumaty.js';
import * as audius from './audius.js';
const sources = { albumaty, audius };
const ORDER = ['albumaty', 'audius']; // Albumaty first: it takes over automatically once enabled
async function first(fn, q) {
  let err;
  for (const n of ORDER) {
    const s = sources[n];
    if (!s.isEnabled()) continue;
    try { const r = await s[fn](q); if (r.length) return r; } catch (e) { err = e; console.warn(n, e); }
  }
  if (err) throw err;
  return [];
}
export const search = q => first('search', q);
export const trending = () => first('trending');
export const streamUrl = t => sources[t.source].streamUrl(t);
