# BODO Music

A lightweight, mobile-first music discovery web app.

## What changed

- Egypt-first discovery using the Apple Music RSS chart feed.
- Arab-region discovery combines the Saudi Arabia and UAE storefront charts; the UI labels this source explicitly rather than presenting it as one official pan-Arab ranking.
- A global discovery section using the US storefront chart.
- Chart entries are metadata only. When a user taps one, BODO searches the connected playback catalogs and only plays a close title/artist match; it does not play an unrelated result.
- Personalized Daily Mix weighting now uses favorites, recent listening, play counts, and early skips stored locally on the device.
- More defensive source adapters, input validation, timeouts, empty-response handling, and explicit playback-source validation.
- Existing playlists, favorites, recent tracks, player controls, and the deployed Worker URL are retained.

## Run locally

Serve this directory over HTTP (ES modules and fetch do not work reliably from `file://`). For example:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Test

```bash
npm test
```

The test suite covers source normalization, unsupported playback sources, and chart-to-track matching. Live chart availability, browser autoplay, the deployed Cloudflare Worker, and third-party playback must still be tested in the target browser/device.

## Deployment

Upload the contents of this folder to the same static host currently serving BODO. Keep the current Cloudflare Worker deployment and its existing routes. The Worker source itself was not included as a separate uploaded file in this package, so it has not been rewritten or redeployed here.

## Data and playback notes

- Apple chart feeds are used for discovery metadata; they are not audio streams. Apple documents region-specific catalog charts and RSS resources in its developer materials.
- Audius playback is limited to tracks returned by Audius.
- Keep Albumaty playback only where you have the necessary rights and permission to use its recordings and endpoints. A URL being publicly reachable is not, by itself, proof of a license or redistribution permission.
- No API secrets or private tokens are included in this project.
