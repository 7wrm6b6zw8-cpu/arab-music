BODO — FINAL DISCOVERY / RADIO UPDATE
=====================================

WHAT THIS UPDATE CHANGES
- Albumaty remains the ONLY enabled audio/search playback source.
- Audius is not imported or used anywhere in the updated app/source adapter.
- Artist radio starts with exact primary-artist matches; collaborations and other singers are excluded from the artist's own first batch.
- Radio expands into related artists after the main artist batch.
- Curated mixes now use artist-radio lookups rather than loose keyword searches, reducing unrelated tracks.
- Egypt Top Songs, Arab region charts (Saudi Arabia + UAE), and US Global Top Songs are loaded from Apple Music storefront chart feeds as metadata/discovery.
- Chart order is preserved; Egyptian artists are not artificially moved ahead of the actual chart ranks.
- Queue prefetches before the end, avoids adding tracks already in the queue, and advances to newly loaded tracks when available.
- Listening, completion, skip, favorite and recent-play signals feed the local Daily Mix profile.
- Cloudflare Worker adds health, chart and similar-artist endpoints, bounded concurrency, caching, stricter matching, optional Last.fm similar-artist discovery, and Range-aware audio responses.

FILES IN THIS UPDATE
- app.js                 Replace existing GitHub app.js
- musicSourceAdapter.js  Replace existing GitHub musicSourceAdapter.js
- albumatySearch.js      Replace existing GitHub albumatySearch.js
- egyptCharts.js         Add this new file to the same folder as app.js
- styles.css             Replace existing GitHub styles.css
- worker.js              Replace the full Cloudflare Worker code

FILES TO KEEP UNCHANGED
- index.html
- albumaty.js
- albumatyParser.js
- manifest.json
- icon-180.png / icon-192.png / icon-512.png

IMPORTANT WORKER URL
The existing project uses:
https://lingering-butterfly-5d60.7wrm6b6zw8.workers.dev
Both albumatySearch.js and egyptCharts.js currently point to this URL. If you deploy the Worker under a different URL, update the PROXY_URL in albumatySearch.js and WORKER in egyptCharts.js to match.

INSTALLATION
1. In GitHub, replace app.js, musicSourceAdapter.js, albumatySearch.js and styles.css with the files in this update.
2. Add egyptCharts.js beside app.js (same directory). You can delete the old audius.js file; the updated app no longer imports it.
3. Open Cloudflare Workers & Pages > your existing Worker > Edit code.
4. Replace the entire Worker code with worker.js and click Deploy.
5. Optional but recommended: add a Cloudflare Worker secret named LASTFM_API_KEY. This enables dynamic similar-artist discovery for artists beyond the built-in Egyptian/Arabic profiles. Without it, BODO still works using the curated fallback artist map. Get an API key from Last.fm's API account page, then add it under Worker Settings > Variables and Secrets > Add secret.
6. Test these URLs:
   https://YOUR-WORKER.workers.dev/health
   https://YOUR-WORKER.workers.dev/charts?country=eg&limit=10
   https://YOUR-WORKER.workers.dev/search?q=MIX%3Asherine
   https://YOUR-WORKER.workers.dev/trending
7. Wait for Cloudflare Pages to deploy, then open BODO on Safari and refresh.

CHART ACCURACY
The Egypt/Arab/US lists in this update are Apple Music storefront Top Songs charts. They are NOT the IFPI Official Egypt Chart. IFPI's Egypt chart is a separate weekly multi-service chart using streams from major DSPs; it does not have a verified public API integrated in this build. Do not label the Apple chart as IFPI's official chart.

TEST STATUS
- JavaScript syntax checks passed for all changed JS files.
- Worker smoke tests passed with mocked upstream responses for health, exact-artist radio and chart metadata.
- These are not live end-to-end tests. Albumaty availability, upstream HTML changes, iPhone Safari playback, background playback, and real-world queue refill still need testing after deployment.

RIGHTS / PERMISSIONS
Only deploy the streaming proxy if your permission covers the specific recordings and the method of streaming/proxying through your Worker. A URL playing or downloading technically does not itself establish authorization.
