export const parseTracks = (raw) => {
  if (!raw || !raw.items) return [];
  
  return raw.items.map((x) => ({
    id: 'alb' + x.id,
    source: 'albumaty',
    title: String(x.title || ''),
    artist: String(x.artist || ''),
    album: String(x.album || ''),
    cover: x.cover || '',
    duration: Number(x.duration) || 0,
    audioUrl: x.mp3
  })).filter(t => t.title && t.audioUrl);
};
