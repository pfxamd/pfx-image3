# PFx Image3

Browser-first image conversion core for **JPG, PNG and WEBP**.

`Core v0.1` is focused only on the conversion engine. The application UI is intentionally separate.

## Core v0.1

- local browser processing
- no backend and no image upload
- JPEG via MozJPEG
- PNG via OxiPNG / PNG codec
- WebP via libwebp
- lazy WASM codec loading
- typed codec registry
- deterministic conversion pipeline
- bounded, memory-aware scheduling
- image-dimension preflight
- batch conversion
- progress reporting
- cancellation and retry policies
- worker replacement after cancellation or worker failure
- typed errors
- framework-independent core

## Pipeline

```text
Input
  -> signature validation
  -> dimension preflight
  -> decode
  -> RGBA normalization
  -> conversion policies
  -> target codec
  -> encoded ArrayBuffer
  -> output metadata
```

## Stable public API

Runtime exports frozen for v0.1:

```text
Image3Core
Image3WorkerPool
Image3CoreError
CodecRegistry
createOutputBlob
```

Public TypeScript contracts are exported from `src/index.ts`.

Internal scheduling, memory, retry and pipeline helpers are intentionally not part of the stable public surface.

## Structure

```text
src/
  codecs/     codec contracts, registry and adapters
  errors/     typed core errors
  memory/     dimension parsing and working-set estimation
  output/     output helpers
  pipeline/   format detection and conversion
  queue/      bounded weighted scheduler
  retry/      retry policy
  types/      public core types
  workers/    worker protocol and lifecycle
```

## Validation

The core is checked with:

- strict TypeScript type checking
- unit tests
- build validation
- full 9-path JPG/PNG/WebP conversion matrix
- Chromium and Firefox browser tests
- alpha and quality tests
- worker cancellation and recovery tests
- corrupted-file tests
- batch stress tests
- memory-budget tests
- codec benchmark reporting

## Development

```bash
npm install
npm run check
npm run test:browser
```

## Scope

The next phase can consume this core to build the PFx Image3 GitHub Pages interface without coupling UI code to codec or scheduling internals.
