// Audius catalog source. Playback is limited to tracks served by Audius.
const BASE = 'https://api.audius.co/v1';
const APP = 'app_name=BODO';
const mapTrack = track => ({
  id: `au${track.id}`,
  source: 'audius',
  audiusId: track.id,
  title: String(track.title || ''),
  artist: String(track.user?.name || ''),
  album: '',
  cover: track.artwork?.['480x480'] || track.artwork?.['150x150'] || '',
  duration: Number(track.duration) || 0
});

async function get(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Audius request failed (${response.status})`);
  const payload = await response.json();
  return (Array.isArray(payload?.data) ? payload.data : []).map(mapTrack).filter(t => t.title);
}

export const isEnabled = () => true;
export const search = query => get(`${BASE}/tracks/search?query=${encodeURIComponent(String(query || ''))}&${APP}`);
export const trending = () => get(`${BASE}/tracks/trending?${APP}`);
export const streamUrl = track => `${BASE}/tracks/${encodeURIComponent(track.audiusId)}/stream?${APP}`;
