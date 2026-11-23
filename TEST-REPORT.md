# BODO test report

Executed in the build environment:

- `node --check` on all JavaScript modules and test files — passed.
- Node test suite — 6/6 passed.
- HTML parser check — passed.
- `manifest.json` JSON parse — passed.

Not testable from this build environment:

- Live Apple RSS requests and their browser CORS behavior on the deployed domain.
- Current Cloudflare Worker uptime and its actual response payloads.
- Playback authorization/availability for individual tracks.
- iOS Safari autoplay, background audio, and Media Session behavior on the user's device.

Those require a real browser/device and the deployed Worker. No claim of zero runtime errors is made without those checks.
