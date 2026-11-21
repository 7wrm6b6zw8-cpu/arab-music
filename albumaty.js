// Albumaty adapter: DISABLED until an official, documented, authorized access method exists.
// To activate: fill albumatySearch.js and albumatyParser.js from official docs, then set enabled:true.
import { searchRaw, trendingRaw } from './albumatySearch.js';
import { parseTracks } from './albumatyParser.js';
export const CONFIG = { enabled: false };
export const isEnabled = () => CONFIG.enabled;
export const search = async q => parseTracks(await searchRaw(q));
export const trending = async () => parseTracks(await trendingRaw());
export const streamUrl = t => t.audioUrl;
