import * as albumaty from './albumaty.js';
import * as audius from './audius.js';

const unique = tracks => {
  const seen = new Set();
  return (Array.isArray(tracks) ? tracks : []).filter(track => {
    if (!track?.id || !track?.title) return false;
    const key = `${String(track.title).toLowerCase()}|${String(track.artist || '').toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

async function call(source, method, ...args) {
  if (!source || typeof source[method] !== 'function') return [];
  return source[method](...args);
}

async function first(method, ...args) {
  let lastError = null;
  for (const source of [albumaty, audius]) {
    if (typeof source.isEnabled === 'function' && !source.isEnabled()) continue;
    if (typeof source[method] !== 'function') continue;
    try {
      const result = await call(source, method, ...args);
      if (Array.isArray(result) && result.length) return unique(result);
    } catch (error) { lastError = error; }
  }
  if (lastError) throw lastError;
  return [];
}

export async function search(query) {
  const q = String(query || '').trim();
  if (!q) return [];

  // The existing Worker understands these two commands. If it returns no tracks,
  // fall back to searching each artist separately on the legal Audius catalog.
  const special = /^(MIX|RECOMMEND):/i.exec(q);
  if (special) {
    let albumatyResult = [];
    try { albumatyResult = await call(albumaty, 'search', q); } catch (error) { console.warn('Albumaty mix lookup:', error); }
    if (Array.isArray(albumatyResult) && albumatyResult.length) return unique(albumatyResult);

    const names = q.slice(q.indexOf(':') + 1).split(',').map(x => x.trim()).filter(Boolean).slice(0, 8);
    const batches = await Promise.allSettled(names.map(name => call(audius, 'search', name)));
    return unique(batches.flatMap(result => result.status === 'fulfilled' ? result.value : [])).slice(0, 40);
  }
  return first('search', q);
}

export const trending = () => first('trending');
export async function getArtist(id) {
  if (!id) return [];
  return first('getArtist', String(id));
}
export function streamUrl(track) {
  if (!track || typeof track !== 'object') throw new Error('Invalid track');
  if (track.source === 'albumaty' && track.audioUrl) return track.audioUrl;
  if (track.source === 'audius' && track.audiusId) return audius.streamUrl(track);
  throw new Error('No supported playback source for this track');
}
