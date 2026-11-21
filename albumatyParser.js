// Maps the provider's documented response to the shared Track shape. Edit FIELDS to match the real response.
export const FIELDS = { list: 'items', id: 'id', title: 'title', artist: 'artist', album: 'album', cover: 'cover', audio: 'audioUrl', duration: 'duration' };
export const parseTracks = raw => {
  const a = Array.isArray(raw) ? raw : raw?.[FIELDS.list] || [];
  return a.filter(x => x?.[FIELDS.audio] && x[FIELDS.title]).map(x => ({
    id: 'alb' + x[FIELDS.id], source: 'albumaty', title: String(x[FIELDS.title]), artist: String(x[FIELDS.artist] || ''),
    album: String(x[FIELDS.album] || ''), cover: x[FIELDS.cover] || '', duration: +x[FIELDS.duration] || 0, audioUrl: x[FIELDS.audio]
  }));
};
