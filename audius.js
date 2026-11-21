// Temporary test source: Audius public API (free-to-stream music).
const B = 'https://api.audius.co/v1', A = 'app_name=ArabMusic';
const map = t => ({ id: 'au' + t.id, source: 'audius', audiusId: t.id, title: t.title, artist: t.user?.name || '', album: '', cover: t.artwork?.['480x480'] || t.artwork?.['150x150'] || '', duration: t.duration });
const get = async u => { const r = await fetch(u); if (!r.ok) throw new Error('Audius ' + r.status); return (await r.json()).data.map(map); };
export const isEnabled = () => true;
export const search = q => get(`${B}/tracks/search?query=${encodeURIComponent(q)}&${A}`);
export const trending = () => get(`${B}/tracks/trending?${A}`);
export const streamUrl = t => `${B}/tracks/${t.audiusId}/stream?${A}`;
