# Existing Cloudflare Worker contract

The frontend continues to use the currently deployed Worker URL from `albumatySearch.js`.

Expected routes:

- `GET /search?q=<query>` — JSON object with an `items` array.
- `GET /trending` — JSON object with an `items` array.
- `GET /artist?id=<artist-id>` — JSON object with an `items` array.
- `GET /stream?id=<song-id>` — audio response, including range support if the upstream supports it.

The existing Worker implementation described by the project owner also recognizes `MIX:<artist,...>` and `RECOMMEND:<artist,...>` search commands. The new source adapter uses those commands first and falls back to individual Audius artist searches if the Worker returns no results.

**Important:** The Worker source was not supplied as a separate file in the uploaded project bundle. This release therefore does not change or redeploy it. Before a production rollout, upload the exact Worker `.js` source so its HTML parsing, input validation, caching, error handling, rate limits, and rights/terms compliance can be audited and tested as part of the same release.
