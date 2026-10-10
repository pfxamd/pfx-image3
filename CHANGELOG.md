# Changelog

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
