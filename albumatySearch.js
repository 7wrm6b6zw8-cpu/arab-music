// Fill ONLY from official Albumaty documentation or a written agreement. No endpoints are assumed here.
// searchUrl: q => full URL string. trendingUrl: () => full URL string. Secrets belong in a Cloudflare Worker, never here.
export const ACCESS = { searchUrl: null, trendingUrl: null, headers: {} };
async function get(url) {
  if (!url) throw new Error('Albumaty access method is not configured');
  const r = await fetch(url, { headers: ACCESS.headers });
  if (!r.ok) throw new Error('Albumaty ' + r.status);
  return r.json();
}
export const searchRaw = q => get(ACCESS.searchUrl && ACCESS.searchUrl(q));
export const trendingRaw = () => get(ACCESS.trendingUrl && ACCESS.trendingUrl());
