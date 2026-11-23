import { searchRaw, trendingRaw, artistRaw } from './albumatySearch.js';
import { parseTracks } from './albumatyParser.js';
export const CONFIG = { enabled: true };
export const isEnabled = () => CONFIG.enabled;
export const search = async query => parseTracks(await searchRaw(query));
export const trending = async () => parseTracks(await trendingRaw());
export const getArtist = async id => id ? parseTracks(await artistRaw(id)) : [];
export const streamUrl = track => track?.audioUrl || '';
