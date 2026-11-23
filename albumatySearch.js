const PROXY_URL = "https://lingering-butterfly-5d60.7wrm6b6zw8.workers.dev";

export const searchRaw = async (q) => {
  const res = await fetch(`${PROXY_URL}/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error("Search failed");
  return await res.json();
};

export const trendingRaw = async () => {
  const res = await fetch(`${PROXY_URL}/trending`);
  if (!res.ok) throw new Error("Trending failed");
  return await res.json();
};

export const artistRaw = async (id) => {
  const res = await fetch(`${PROXY_URL}/artist?id=${id}`);
  if (!res.ok) throw new Error("Artist fetch failed");
  return await res.json();
};
