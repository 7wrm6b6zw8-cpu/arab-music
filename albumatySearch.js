const PROXY_URL = 'https://lingering-butterfly-5d60.7wrm6b6zw8.workers.dev';

async function request(path, params = {}) {
  const url = new URL(path, PROXY_URL);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && String(value).trim()) url.searchParams.set(key, String(value));
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Music service returned ${response.status}`);
    const data = await response.json();
    if (!data || typeof data !== 'object') throw new Error('Invalid music service response');
    if (data.error) throw new Error(String(data.error));
    return data;
  } finally { clearTimeout(timeout); }
}

export const searchRaw = q => request('/search', { q: String(q || '').trim() });
export const trendingRaw = () => request('/trending');
export const artistRaw = id => request('/artist', { id: String(id || '').replace(/^alb_/, '') });
