import { searchRaw, trendingRaw } from './albumatySearch.js';
import { parseTracks } from './albumatyParser.js';

export const CONFIG = { enabled: true };
export const isEnabled = () => CONFIG.enabled;

export const search = async (q) => parseTracks(await searchRaw(q));
export const trending = async () => parseTracks(await trendingRaw());
export const streamUrl = (t) => t.audioUrl;
