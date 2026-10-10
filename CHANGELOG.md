# Changelog

## Alpha 0.2.2 — 2026-10-11

- Added drop-to-add across the preview while an image is already open.
- Kept the image preview free of conversion prompts, docked output actions and improved focus and active states.
- Updated the bottom status bar with image totals and conversion progress.
- Added full browser journey tests for encoding, comparison, individual downloads, batch ZIP and image drop.

## Alpha 0.2.1 — 2026-10-11

- Replaced separated dashboard cards with a connected, viewport-sized image workspace.
- Added a single light/dark appearance toggle, system preference fallback and saved selection.
- Kept image conversion, image comparison and batch export on the existing core.
- Moved overflow into file and settings regions instead of scrolling the desktop page.

## Alpha 0.2 — 2026-10-10

- Updated the workspace badge to Alpha 0.2.
- Added a single application release source and an automatic version-increment check before deployment.
- Kept the conversion core version independent.

## Unreleased

- Rebranded the browser application as PFx Image Studio.
- Preserved the existing Image3 core API and live Pages URL for compatibility.


## 0.1.0

Initial PFx Image3 core.

- JPG, PNG and WebP conversion
- MozJPEG, OxiPNG/PNG and libwebp adapters
- lazy WASM loading
- codec registry
- batch conversion
- memory-aware scheduling
- image-dimension preflight
- Web Worker pool
- hard cancellation with worker replacement
- retry policy for transient internal failures
- typed errors and progress events
- stable minimal public API
- Chromium and Firefox integration coverage
- stress, corruption, alpha, quality and benchmark tests
