# 🧱 Component Design & Architecture

## 🗂️ Directory Structure
```text
src/
├── assets/
│   └── samples/
│       ├── portrait.webp
│       ├── full-body.webp
│       └── product.webp
├── lib/
│   ├── components/
│   │   ├── Header.svelte
│   │   ├── ImageUploader.svelte
│   │   ├── Workspace.svelte
│   │   ├── CompareSlider.svelte
│   │   ├── ViewToggle.svelte
│   │   ├── ExportControls.svelte
│   │   ├── RevealOverlay.svelte
│   │   └── AboutDialog.svelte
│   ├── stores/
│   │   └── appStore.ts          # Typed Svelte stores
│   ├── workers/
│   │   └── inferenceWorker.ts   # Transformers.js Web Worker
│   ├── utils/
│   │   └── imageUtils.ts        # Downscale, normalization, mask application logic
│   └── types.ts                 # Shared TypeScript interfaces
├── App.svelte
└── main.ts
```

## 🧭 Shared State & Message Contracts

### App State
- `idle`: No image selected yet.
- `ready`: Image selected and normalized; waiting for inference or retry.
- `model_loading`: Worker is downloading or initializing model assets.
- `processing`: Worker is actively producing a mask.
- `completed`: Cutout and mask are available.
- `error`: Recoverable failure that should be surfaced to the user.

### Store Shape
`appStore.ts` should centralize:
- current app state
- model readiness and progress
- current theme and persisted preference
- original image metadata: file name, width, height, object URL
- inference payload metadata: downscaled dimensions and transferable buffer lifecycle
- generated artifacts: mask URL, cutout URL, export blobs if already prepared
- worker/backend status and warnings
- recoverable error message

### Worker Messages
`inferenceWorker.ts` and `App.svelte` communicate through typed messages only:
- `worker_ready`
- `model_progress`
- `model_loaded`
- `status`
- `result`
- `cancelled`
- `error`

Each message should include a numeric `requestId` generated in `App.svelte` from a monotonic counter so stale responses from prior runs can be ignored after cancellation or re-upload.

### Timing Rules
- Model initialization timeout: 180 seconds.
- Inference timeout per request: 120 seconds.
- Reduced-motion reveal duration: 0 ms for the completion sweep and 0 ms for the processing wave loop.

### Timeout Enforcement
- `App.svelte` starts a guard timer for each outstanding worker request so the UI can recover even if the worker becomes unresponsive.
- `inferenceWorker.ts` also enforces internal timeout boundaries around model initialization and inference work, then posts `error` before aborting the active task.
- The main-thread timer is the final safety net; the worker timer is the primary enforcement mechanism.

### Backend Fallback
- `inferenceWorker.ts` attempts model creation with WebGPU first.
- If WebGPU initialization throws or capability detection fails, the worker retries the same request with WASM before reporting failure.
- The worker includes the resolved backend in `worker_ready`, `model_loaded`, and `result` messages so the main thread can show or clear the degraded-performance warning banner.

## 🧱 Component Breakdown

### 1. `App.svelte` (The Orchestrator)
**Responsibilities:**
- Initializes the Web Worker on mount and stores the reference in `appStore`.
- Listens for messages from the Worker (`model_progress`, `status`, `result`, `error`) and updates the Svelte stores accordingly.
- Handles theme switching (System/Dark/Light) by applying/removing the `dark` class on the `<html>` element.
- Provides the Cancel action: posts `{ type: 'cancel' }` to the worker.
- Renders the overall layout: `Header`, main content area, and `AboutDialog`.
- Owns request lifecycle coordination so a second upload invalidates older worker responses.
- Converts worker failures into a consistent UI error state and retry path.
- Applies `prefers-reduced-motion` handling to animation-heavy child components through props or derived store state.
- Initializes Plausible only when the configured domain variable is present.

### 2. `Header.svelte`
**Props/State:** None (uses `appStore` for theme).
**Responsibilities:**
- Renders the App Title on the left.
- Renders the System/Dark/Light mode toggle (using shadcn-svelte `ToggleGroup`) and GitHub icon/link on the right.
- Simple, fixed top bar.
- Persists theme selection and reflects System mode changes.

### 3. `ImageUploader.svelte`
**Responsibilities:**
- **Idle State UI:** Displays a large dashed dropzone area.
- **Interactions:**
  - Drag-and-drop handling (`ondragover`, `ondrop`).
  - Hidden `<input type="file">` triggered by a button.
  - Paste from clipboard (`window.addEventListener('paste', ...)`).
  - Sample image thumbnails (click to load).
- **Validation & Processing:**
  - Checks file type and size before proceeding.
  - Normalizes EXIF orientation before preview or inference.
  - **Memory Safety:** If the image exceeds 2048px, it uses an offscreen canvas to produce a downscaled inference image while retaining the original image separately for export.
  - **Data Transfer:** Reads the potentially downscaled image as an `ArrayBuffer` and transfers it to the worker with `postMessage(..., [arrayBuffer])`.
  - Stores the original full-resolution image as a main-thread object URL or Blob reference so it remains available for preview and final export after the inference payload is transferred.
  - Ignores non-image clipboard content and unsupported file formats.
  - Extracts only the first frame of GIF input and discards animation metadata.

### 4. `Workspace.svelte`
**Responsibilities:**
- The main "card" container below the uploader.
- Conditionally renders based on `appState`:
  - **idle:** Prompt to upload or choose a sample.
  - **ready:** Shows the normalized original preview and allows processing to start or restart.
  - **model_loading:** Shows the original preview, a linear progress bar with percentage text, backend status, and a Cancel action.
  - **processing:** Shows the original image overlaid with `RevealOverlay.svelte`, plus progress copy and a Cancel action.
  - **completed:** Renders the `CompareSlider.svelte`.
  - **error:** Keeps the last useful preview visible while surfacing retry controls and an error toast.
- Contains `ViewToggle.svelte` and `ExportControls.svelte` inline below the image area, per layout requirements.
- Hosts the hardware-acceleration warning banner when the worker reports a degraded backend.

### 5. `RevealOverlay.svelte` (The "Wow" Factor)
**Props:** `originalSrc`, `cutoutSrc`, `appState`.
**Responsibilities:**
- **Bottom Layer:** Renders the Cutout Image (once available) with a CSS `repeating-conic-gradient` checkerboard behind it.
- **Top Layer:** Renders the Original Image.
- **Animation Logic:**
  - Uses a Svelte `tweened` store (0 to 100) representing the wave position percentage.
  - When `appState` becomes `'processing'`, applies a sweeping wave animation to indicate work is happening.
  - When `appState` becomes `'done'`, animates the `--wave-pos` variable from 0% to 100%.
  - Applies this variable to a CSS `mask-image` on the Top Layer:
    ```css
    mask-image: linear-gradient(90deg, transparent 0%, transparent var(--wave-pos), black calc(var(--wave-pos) + 5%), black 100%);
    ```
  - As the gradient sweeps, the original image vanishes left-to-right, leaving the bottom cutout layer fully visible.
- Falls back to a non-animated instant reveal when reduced motion is requested or `mask-image` support is insufficient.

### 6. `CompareSlider.svelte`
**Props:** `originalSrc`, `cutoutSrc`, `viewMode`.
**Responsibilities:**
- Renders the checkerboard background.
- **If `viewMode === 'compare'`:**
  - Renders original image on the left, cutout on the right.
  - Draggable vertical divider line.
  - Handles `pointerdown`, `pointermove`, `pointerup` events to adjust the split percentage.
  - Uses CSS `clip-path: inset(0 X% 0 0)` on the top image to reveal the bottom one based on slider position.
- **If `viewMode === 'original'` or `'mask'`:** renders the respective image full-width without a slider.
- **Note:** Click-to-toggle is explicitly omitted to prevent pointer event collisions with the slider drag.
- Exposes slider semantics for accessibility: `role="slider"`, `aria-label`, `aria-valuenow`, keyboard arrow handling, and Home/End shortcuts.

### 7. `ViewToggle.svelte`
**State:** Local UI state for the active view, synced with a global store if needed.
**Responsibilities:**
- Three toggle buttons: "Compare" (Slider), "Original", "Mask".
- Emits the selected `viewMode` to `Workspace.svelte` to dictate how `CompareSlider` renders.

### 8. `ExportControls.svelte`
**Props:** `cutoutSrc`, `maskSrc`, `originalFileName`.
**Responsibilities:**
- "Download Cutout (PNG)" button.
- "Download Mask (PNG)" button.
- Creates export blobs from the original image plus the generated mask so the final PNG preserves the original dimensions.
- Names output files from the original file stem, for example `photo_removed.png` and `photo_mask.png`.
- Uses native browser download behavior via object URLs and revokes them after use.

### 9. `AboutDialog.svelte`
**Responsibilities:**
- A shadcn-svelte Dialog/Modal.
- Triggered by an "About" or "How it works" link.
- Explains that processing happens 100% client-side using Xenova/modnet via Transformers.js, ensuring user privacy.

## 📦 Platform Integration

### PWA / Workbox
- Configure `vite-plugin-pwa` in the Vite layer, not in application runtime code.
- Precache the app shell, local fonts, icons, sample assets, and same-origin static files.
- Do not register a Workbox `runtimeCaching` entry for `huggingface.co` or `cdn-lfs.huggingface.co`.
- Keep model fetching entirely under Transformers.js and the browser cache so service-worker behavior cannot corrupt model downloads.

### Analytics
- Read the Plausible domain from a build-time environment variable.
- Initialize analytics once in `App.svelte` after mount when the variable is present.
- Track coarse events only: upload start, sample selection, processing success, processing failure, cutout export, and mask export.

## ⚙️ Utility Responsibilities

### `imageUtils.ts`
- Normalize EXIF orientation.
- Create a bounded-size inference bitmap with width and height metadata preserved.
- Upscale and smooth the returned mask to the original dimensions.
- Compose the original image with a straight-alpha mask to create the final cutout PNG.
- Export the grayscale mask PNG.

## 🧪 Failure Handling

- Worker initialization failure posts `error` and leaves the app recoverable.
- Each inference request has a timeout guard so a hung model does not block the UI indefinitely.
- Cancelling or replacing an image increments `requestId` and invalidates stale worker responses.
- If `postMessage` transfer fails on the main thread, the app shows a processing error toast and returns to `ready` without discarding the selected image.
- Aborting model download or inference returns the UI to `ready` when an image is still selected, otherwise `idle`. Already downloaded model artifacts may remain in browser cache for future runs.
- Object URLs, canvases, and temporary blobs are released when superseded to prevent memory growth across repeated runs.
