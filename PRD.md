# 📝 PRD: In-Browser Image Background Remover

## 1. Project Overview
A static, client-side web application hosted on GitHub Pages that allows users to remove image backgrounds directly in the browser using ML models (e.g., Xenova/modnet). The app prioritizes privacy, offline capabilities, and a highly polished user experience with smooth, descriptive animations.

## 1.1 Success Criteria
- A user can upload, paste, or select a sample image and receive a cutout without the main thread freezing.
- The app keeps all image processing on-device and clearly communicates that no image data is uploaded to a server.
- The exported PNG matches the original pixel dimensions, with the caveat that mask detail for very large images is bounded by the inference resolution.
- The UI remains usable on desktop and touch devices, including keyboard operation for core controls.

## 2. Functional Requirements

### 2.1 Image Input
- **Upload Methods:** File Picker, Drag-and-Drop, Paste from Clipboard.
- **Sample Images:** Curated set of 3 to 5 local sample images for quick testing. Ship them as optimized WebP assets from the app bundle and keep the total compressed footprint below 500 KB.
- **Supported Formats:** JPEG, PNG, WebP, BMP, GIF (first frame only).
- **Unsupported Formats:** SVG, TIFF, PDF, HEIC, and any multi-page document formats should be rejected with a clear error toast.
- **Clipboard Handling:** Only pasted image blobs are accepted. Text, HTML, and unsupported clipboard payloads are ignored.
- **Image Normalization:** Normalize EXIF orientation before inference so portrait photos are processed and exported correctly.
- **Constraints & Safety:** To prevent browser Out-Of-Memory (OOM) crashes, images exceeding 2048px on the longest side will be silently downscaled before inference. The resulting mask is then upscaled with high-quality canvas smoothing and applied to the original full-resolution image so the exported dimensions still match the input.
- **Quality Caveat:** For images above the inference ceiling, output dimensions match the original image, but edge fidelity is limited by the downscaled inference resolution. This tradeoff must be documented in the UI copy and About section.

### 2.2 Processing & ML Pipeline
- **Model Loading:** Initialize asynchronously when the page loads. Show a progress bar *only* if the model is not fully loaded when the user attempts to process an image.
- **Execution:** Run inference in a **Web Worker** to prevent UI blocking.
- **Data Transfer:** Use `ArrayBuffer` with Transferable Objects for the inference payload. The main thread retains the original image separately as a Blob or object URL for preview and export; the transferred inference buffer must be treated as moved and no longer readable on the sender side.
- **Cancellation:** Supported via `AbortController`. The abort signal is passed directly to Transformers.js. Aborting resets the app to `idle` and clears any transient processing artifacts.
- **Backend Priority:** WebGPU → WASM → Fallback. Yellow warning banner if hardware acceleration is unavailable.
- **Model Lifecycle:**
  - Start model initialization on page load.
  - If the user starts processing before the model is ready, keep the current image selection visible and show a determinate linear progress bar with percentage text inside the workspace.
  - If model loading fails, show an inline retry action and a toast with the failure reason.
  - If model loading exceeds 180 seconds or inference exceeds 120 seconds, fail gracefully and allow retry without refreshing the page.
- **Worker Error Contract:** The worker must post typed messages for progress, status, success, cancellation, and failure. All exceptions are converted into user-facing error states on the main thread.
- **Backend Resolution Rule:** Attempt WebGPU first. If unavailable or initialization fails, fall back to WASM. Show the yellow performance warning whenever the resolved backend is not WebGPU.

### 2.3 Output & Export
- **Output Resolution:** Match the original input resolution by applying the upscaled alpha mask to the original full-resolution image.
- **Primary Export:** Download PNG with transparent background.
- **Secondary Export:** Download the raw Alpha Mask.
- **Cutout Export Format:** PNG in sRGB with straight alpha. Fully removed pixels must have alpha 0.
- **Mask Export Format:** 8-bit grayscale PNG where white represents foreground and black represents background.
- **Mask Resampling:** When the inferred mask is smaller than the original, upscale it with high-quality smoothing before export and compositing.
- **Naming Convention:** Auto-generate filenames based on the source name, for example `photo_removed.png` and `photo_mask.png`.

### 2.4 Visualization & Comparison
- **Comparison Slider:** Horizontal (left/right) slider. Touch/swipe friendly.
- **Transparency Indicator:** Semi-transparent checkerboard pattern behind the cutout.
- **View Modes:** Explicit toggle buttons for: "Compare" (Slider), "Original" (Full), "Mask" (Full).
- **Accessibility:** The comparison control must expose slider semantics for keyboard and assistive technology users, including arrow-key adjustment and an accessible label.

## 3. UI/UX & Animation Requirements

### 3.1 Layout & Theme
- **Layout:** Single-page, centered card layout.
- **Header:** Title on the left. GitHub icon/link and System/Dark/Light mode toggle on the top right.
- **Controls:** Inline below image.
- **Theme:** System (default), Dark, Light modes.
- **Theme Persistence:** Persist the user's theme preference in local storage, while allowing System mode to track OS changes.

### 3.2 Animations & Transitions (The "Wow" Factor)
- **Processing Indicator:** Animated checkerboard pattern moving in a wave left-to-right over the original image.
- **Completion Reveal Animation:** 
  - **Bottom Layer:** Cutout image (with CSS checkerboard behind it).
  - **Top Layer:** Original image.
  - **The Animation:** Apply a CSS `mask-image` to the *Top Layer* (Original Image). The mask is a `linear-gradient` that moves left-to-right, transitioning from `transparent` to `black`. As the wave sweeps across, the original image becomes transparent, revealing the cutout beneath it. This perfectly isolates the background removal visually.
- **Reduced Motion:** Respect `prefers-reduced-motion` by shortening or disabling non-essential animated transitions while preserving state clarity.

### 3.3 Error Handling & Feedback
- **Error States:** Clear toasts for unsupported format, OOM, processing failed, browser incompatible.
- **Hardware Warning:** Yellow banner if WASM-only (slow) mode is detected.
- **Retry UX:** Model-load and processing failures must present a retry path without forcing a page reload.
- **Cancellation UX:** Show a visible Cancel action only while model loading or inference is active.
- **Success Feedback:** Export actions should provide lightweight confirmation feedback.

## 4. Non-Functional Requirements

### 4.1 Technical Stack & Quality
- **Language:** TypeScript (strict mode).
- **Linting:** ESLint (recommended config + Svelte/TS plugins).
- **Framework:** Svelte + Vite.
- **Accessibility Target:** WCAG 2.1 AA for interactive controls and text contrast.

### 4.2 Performance & Caching
- **Model Caching:** Handled natively by Transformers.js (Cache API). **Do not** intercept HuggingFace CDN requests via Service Worker.
- **App Caching:** Implement as a PWA using `vite-plugin-pwa` (Workbox) to cache the app shell/assets for offline use.
- **Service Worker Scope:** Cache only same-origin application assets and explicitly exclude HuggingFace model requests from Workbox runtime caching. In practice, configure Workbox with precaching for the app shell and same-origin static assets only, and do not add any `runtimeCaching` rule that matches `huggingface.co` or `cdn-lfs.huggingface.co`.
- **Performance Budget:** Keep the initial app bundle lean enough that the shell feels immediate on a normal broadband connection; prefer lazy-loading model and sample-related code paths over front-loading them.

### 4.3 Analytics
- Integrate Plausible Analytics as the default privacy-friendly analytics provider.
- Load analytics only when a site domain is configured at build time so local development and forks work without extra setup.
- Track only coarse product events such as upload start, processing success or failure, export action, and sample-image usage.

### 4.4 Informational
- Include an "About" or "How it works" section explaining the ML model and that processing happens 100% client-side.
- Document the large-image quality caveat and the current backend in the About section.

## 5. State Model

The app uses a small explicit state machine so UI, worker coordination, and error handling remain predictable.

- `idle`: No active image or processing job.
- `ready`: An image is loaded and the app is ready to start or restart processing.
- `model_loading`: The worker is downloading or initializing the model.
- `processing`: Inference is actively running.
- `completed`: The app has a generated cutout and mask available for comparison and export.
- `error`: A recoverable error occurred. The user can dismiss or retry.

Allowed state transitions:

- `idle -> ready`
- `ready -> model_loading`
- `ready -> processing`
- `model_loading -> processing`
- `model_loading -> error`
- `processing -> completed`
- `processing -> error`
- `model_loading -> idle` on cancel
- `processing -> idle` on cancel
- `error -> ready` after retryable recovery

---

## 🎨 Design System

Use **Tailwind CSS** coupled with the **shadcn-svelte** design system.

- **Tailwind CSS:** Makes building the responsive, mobile-friendly layout and dark mode toggle trivial.
- **shadcn-svelte:** Provides beautifully styled, accessible components (Buttons, Sliders, Toggles, Dialogs for the "About" section) that fit perfectly into a Svelte + Vite workflow.
- **Color Scheme:** A minimalist monochrome base (slate/gray) with a vibrant accent color (like Indigo or Violet) for primary actions (Upload, Download, Start). This ensures the user's *image* is always the focal point of the app.

