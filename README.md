# Image Background Remover

Client-side image background removal built with Svelte, TypeScript, Vite, and Transformers.js. Images stay in the browser, inference runs inside a dedicated worker, and exports include both a transparent PNG cutout and a grayscale foreground mask.

## Features

- Private in-browser processing with no server upload
- `background-removal` pipeline powered by `@huggingface/transformers`
- WebGPU-first execution with WASM fallback
- Worker-based model loading and inference to keep the UI responsive
- Upload, drag-and-drop, paste, and bundled sample-image flows
- PWA app shell with offline caching for the client bundle
- Theme persistence, compare slider, and export controls

## Scripts

- `npm run dev` starts the Vite development server
- `npm run check` runs `svelte-check` and TypeScript validation
- `npm run build` creates a production build
- `npm run preview` serves the production build locally

## Analytics

Plausible is loaded only when `VITE_PLAUSIBLE_DOMAIN` is defined.

Example:

```bash
VITE_PLAUSIBLE_DOMAIN=example.com npm run dev
```

## Notes

- Very large images are normalized and may be downscaled for inference safety before being composited back to their original export size.
- Model assets are fetched remotely by Transformers.js and are intentionally not runtime-cached by the app shell.
