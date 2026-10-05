# PFx Image3

Browser-first image conversion core for **JPG, PNG and WEBP**.

This repository is currently focused on the conversion engine only. No application UI is part of the core phase.

## Core goals

- browser-only processing
- no backend or upload requirement
- independent codec adapters
- lazy WASM loading
- deterministic conversion pipeline
- bounded concurrency and memory-aware scheduling
- cancellable jobs and progress events
- typed errors and stable public contracts
- framework-independent core

## Pipeline

```text
Input
  -> format validation
  -> decode
  -> RGBA normalization
  -> conversion policies
  -> target codec
  -> encoded ArrayBuffer
  -> output metadata
```

## Codecs

- JPEG: MozJPEG through `@jsquash/jpeg`
- PNG: decode through `@jsquash/png`, encode/optimise through OxiPNG
- WebP: libwebp through `@jsquash/webp`

The codec packages are loaded only when requested.

## Structure

```text
src/
  codecs/     codec contracts, registry and adapters
  errors/     typed core errors
  memory/     working-set estimation
  output/     filenames and Blob helpers
  pipeline/   validation, format detection and conversion
  queue/      bounded weighted scheduler
  types/      public core types
  workers/    worker protocol and worker-pool primitives
```

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

## Current scope

`0.1.0` establishes the core contracts and execution pipeline. Browser integration tests and the final GitHub Pages application are separate phases after the core is stable.
