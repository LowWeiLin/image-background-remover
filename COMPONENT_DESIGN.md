# 🧱 Component Design & Architecture

## 🗂️ Directory Structure
```text
src/
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
│   │   └── imageUtils.ts        # Downscale, Mask Application logic
│   └── types.ts                 # Shared TypeScript interfaces
├── App.svelte
└── main.ts
```

## 🧱 Component Breakdown

### 1. `App.svelte` (The Orchestrator)
**Responsibilities:**
- Initializes the Web Worker on mount and stores the reference in `appStore`.
- Listens for messages from the Worker (`model_progress`, `status`, `result`, `error`) and updates the Svelte stores accordingly.
- Handles theme switching (System/Dark/Light) by applying/removing the `dark` class on the `<html>` element.
- Provides the Cancel action: posts `{ type: 'cancel' }` to the worker.
- Renders the overall layout: `Header`, main content area, and `AboutDialog`.

### 2. `Header.svelte`
**Props/State:** None (uses `appStore` for theme).
**Responsibilities:**
- Renders the App Title on the left.
- Renders the System/Dark/Light mode toggle (using shadcn-svelte `ToggleGroup`) and GitHub icon/link on the right.
- Simple, fixed top bar.

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
  - **Memory Safety:** If the image exceeds 2048px, it uses an offscreen canvas to downscale it.
  - **Data Transfer:** Reads the (potentially downscaled) file as an `ArrayBuffer` and transfers it to the worker: `worker.postMessage({ type: 'infer', buffer: arrayBuffer }, [arrayBuffer])`.
  - Stores the *original* full-resolution ImageBitmap/DataURL in a separate store variable so it can be used later for the final high-res export.

### 4. `Workspace.svelte`
**Responsibilities:**
- The main "card" container below the uploader.
- Conditionally renders based on `appState`:
  - **idle:** Prompt to upload.
  - **model_loading / processing:** Shows the original image, overlaid with `RevealOverlay.svelte`.
  - **done:** Renders the `CompareSlider.svelte`.
  - **error:** Displays the error message via a toast.
- Contains `ViewToggle.svelte` and `ExportControls.svelte` inline below the image area, per layout requirements.

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
- Uses `<a download={autoGeneratedName} href={data}>` to trigger the browser download natively.

### 9. `AboutDialog.svelte`
**Responsibilities:**
- A shadcn-svelte Dialog/Modal.
- Triggered by an "About" or "How it works" link.
- Explains that processing happens 100% client-side using Xenova/modnet via Transformers.js, ensuring user privacy.
