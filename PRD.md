# 📝 PRD: In-Browser Image Background Remover

## 1. Project Overview
A static, client-side web application hosted on GitHub Pages that allows users to remove image backgrounds directly in the browser using ML models (e.g., Xenova/modnet). The app prioritizes privacy, offline capabilities, and a highly polished user experience with smooth, descriptive animations.

## 2. Functional Requirements

### 2.1 Image Input
- **Upload Methods:** File Picker, Drag-and-Drop, Paste from Clipboard.
- **Sample Images:** Curated set of local sample images for quick testing.
- **Supported Formats:** JPEG, PNG, WebP, BMP, GIF (first frame only).
- **Constraints & Safety:** To prevent browser Out-Of-Memory (OOM) crashes, images exceeding 2048px on the longest side will be **silently downscaled** before inference. The resulting mask will be upscaled via high-quality canvas smoothing and applied to the *original* image to fulfill the output resolution requirement.

### 2.2 Processing & ML Pipeline
- **Model Loading:** Initialize asynchronously when the page loads. Show a progress bar *only* if the model is not fully loaded when the user attempts to process an image.
- **Execution:** Run inference in a **Web Worker** to prevent UI blocking.
- **Data Transfer:** Use `ArrayBuffer` with Transferable Objects for zero-overhead, near-instantaneous data passing to the worker.
- **Cancellation:** Supported via `AbortController`. The `abort_signal` is passed directly to Transformers.js. Aborting resets the app to `idle`.
- **Backend Priority:** WebGPU → WASM → Fallback. Yellow warning banner if hardware acceleration is unavailable.

### 2.3 Output & Export
- **Output Resolution:** Match the original input resolution (achieved by applying the upscaled mask to the original full-res image).
- **Primary Export:** Download PNG with transparent background.
- **Secondary Export:** Download the raw Alpha Mask.
- **Naming Convention:** Auto-generate filenames (e.g., `image_removed.png`, `image_mask.png`).

### 2.4 Visualization & Comparison
- **Comparison Slider:** Horizontal (left/right) slider. Touch/swipe friendly.
- **Transparency Indicator:** Semi-transparent checkerboard pattern behind the cutout.
- **View Modes:** Explicit toggle buttons for: "Compare" (Slider), "Original" (Full), "Mask" (Full).

## 3. UI/UX & Animation Requirements

### 3.1 Layout & Theme
- **Layout:** Single-page, centered card layout.
- **Header:** Title on the left. GitHub icon/link and System/Dark/Light mode toggle on the top right.
- **Controls:** Inline below image.
- **Theme:** System (default), Dark, Light modes.

### 3.2 Animations & Transitions (The "Wow" Factor)
- **Processing Indicator:** Animated checkerboard pattern moving in a wave left-to-right over the original image.
- **Completion Reveal Animation:** 
  - **Bottom Layer:** Cutout image (with CSS checkerboard behind it).
  - **Top Layer:** Original image.
  - **The Animation:** Apply a CSS `mask-image` to the *Top Layer* (Original Image). The mask is a `linear-gradient` that moves left-to-right, transitioning from `transparent` to `black`. As the wave sweeps across, the original image becomes transparent, revealing the cutout beneath it. This perfectly isolates the background removal visually.

### 3.3 Error Handling & Feedback
- **Error States:** Clear toasts for unsupported format, OOM, processing failed, browser incompatible.
- **Hardware Warning:** Yellow banner if WASM-only (slow) mode is detected.

## 4. Non-Functional Requirements

### 4.1 Technical Stack & Quality
- **Language:** TypeScript (strict mode).
- **Linting:** ESLint (recommended config + Svelte/TS plugins).
- **Framework:** Svelte + Vite.

### 4.2 Performance & Caching
- **Model Caching:** Handled natively by Transformers.js (Cache API). **Do not** intercept HuggingFace CDN requests via Service Worker.
- **App Caching:** Implement as a PWA using `vite-plugin-pwa` (Workbox) to cache the app shell/assets for offline use.

### 4.3 Analytics
- Implement privacy-friendly analytics (e.g., Umami or Plausible) to track usage patterns.

### 4.4 Informational
- Include an "About" or "How it works" section explaining the ML model and that processing happens 100% client-side.

---

## 🎨 Design System

Use **Tailwind CSS** coupled with the **shadcn-svelte** design system.

- **Tailwind CSS:** Makes building the responsive, mobile-friendly layout and dark mode toggle trivial.
- **shadcn-svelte:** Provides beautifully styled, accessible components (Buttons, Sliders, Toggles, Dialogs for the "About" section) that fit perfectly into a Svelte + Vite workflow.
- **Color Scheme:** A minimalist monochrome base (slate/gray) with a vibrant accent color (like Indigo or Violet) for primary actions (Upload, Download, Start). This ensures the user's *image* is always the focal point of the app.

