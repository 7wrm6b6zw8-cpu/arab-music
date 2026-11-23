import * as albumaty from './albumaty.js';
import { similarArtistsRaw } from './albumatySearch.js';

// Albumaty is the only enabled search, discovery and playback source in BODO.
const valid = tracks => (Array.isArray(tracks) ? tracks : []).filter(track =>
  track && track.title && track.audioUrl && track.source === 'albumaty'
);

export const search = async query => {
  const q = String(query || '').trim();
  if (!q || !albumaty.isEnabled()) return [];
  try { return valid(await albumaty.search(q)); } catch { return []; }
};

export const trending = async () => {
  if (!albumaty.isEnabled()) return [];
  try { return valid(await albumaty.trending()); } catch { return []; }
};

export const getArtist = async id => {
  if (!albumaty.isEnabled() || !String(id || '').startsWith('alb_')) return [];
  try { return valid(await albumaty.getArtist(id)); } catch { return []; }
};

export const streamUrl = track => track?.source === 'albumaty' ? albumaty.streamUrl(track) : null;

export const similarArtists = async artist => {
  const name = String(artist || '').trim();
  if (!name) return [];
  try { return (await similarArtistsRaw(name)).filter(x => typeof x === 'string' && x.trim()).slice(0, 8); }
  catch { return []; }
};
