export const parseTracks = raw => {
  const items = Array.isArray(raw?.items) ? raw.items : [];
  return items.map(item => ({
    id: item?.id != null ? `alb${item.id}` : '',
    source: 'albumaty',
    title: String(item?.title || '').trim(),
    artist: String(item?.artist || '').trim(),
    album: String(item?.album || '').trim(),
    cover: String(item?.cover || ''),
    duration: Number(item?.duration) || 0,
    audioUrl: typeof item?.mp3 === 'string' ? item.mp3 : '',
    artistId: item?.singerId ? `alb_${item.singerId}` : null
  })).filter(track => track.id && track.title && track.audioUrl);
};
