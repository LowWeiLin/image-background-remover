<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import type { ImageSelectionRequest } from "../types";
  import { sampleImages } from "../utils/sampleImages";

  export let disabled = false;
  export let merged = false;
  export let showHeader = true;
  export let onError: (message: string) => void = () => {};
  export let onSelect: (
    request: ImageSelectionRequest,
  ) => Promise<void> | void = () => {};

  let fileInput: HTMLInputElement | null = null;
  let sampleViewport: HTMLDivElement | null = null;
  let isDragging = false;
  let isCarouselPaused = false;
  let animationFrame = 0;
  let lastFrameTime = 0;
  let railSamples = [...sampleImages];
  const MAX_INPUT_BYTES = 100 * 1024 * 1024;
  const SECONDS_PER_IMAGE = 3;

  const acceptedMimeTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/bmp",
    "image/gif",
  ]);

  function openFilePicker() {
    if (fileInput) {
      fileInput.value = "";
    }
    fileInput?.click();
  }

  async function emitFile(
    blob: Blob,
    fileName: string,
    source: ImageSelectionRequest["source"],
  ) {
    if (disabled) {
      return;
    }

    if (source !== "sample" && !acceptedMimeTypes.has(blob.type)) {
      throw new Error("Unsupported format. Use JPEG, PNG, WebP, BMP, or GIF.");
    }

    if (blob.size > MAX_INPUT_BYTES) {
      throw new Error(
        "That image is too large to process in-browser. Choose a file under 100 MB.",
      );
    }

    await onSelect({
      blob,
      fileName,
      source,
    });
  }

  async function handleInputChange(event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) {
      return;
    }

    try {
      await emitFile(file, file.name, "upload");
    } catch (error) {
      onError(
        error instanceof Error ? error.message : "Unable to load that image.",
      );
    } finally {
      target.value = "";
    }
  }

  async function handleSampleClick(sample: (typeof sampleImages)[number]) {
    try {
      const response = await fetch(sample.url);
      if (!response.ok) {
        throw new Error("Unable to load that sample image right now.");
      }

      const blob = await response.blob();
      await emitFile(blob, sample.fileName, "sample");
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "Unable to load that sample image right now.",
      );
    }
  }

  async function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
    const file = event.dataTransfer?.files?.[0];
    if (!file) {
      return;
    }

    try {
      await emitFile(file, file.name, "drop");
    } catch (error) {
      onError(
        error instanceof Error ? error.message : "Unable to load that image.",
      );
    }
  }

  async function handlePaste(event: ClipboardEvent) {
    if (disabled) {
      return;
    }

    const imageItem = Array.from(event.clipboardData?.items ?? []).find(
      (item) => item.type.startsWith("image/"),
    );
    const file = imageItem?.getAsFile();
    if (!file) {
      return;
    }

    try {
      await emitFile(file, file.name || "clipboard-image.png", "paste");
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "Unable to load that pasted image.",
      );
    }
  }

  function preventDefaults(event: DragEvent) {
    event.preventDefault();
  }

  function handleDragState(active: boolean) {
    if (!disabled) {
      isDragging = active;
    }
  }

  function handleDropzoneKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFilePicker();
    }
  }

  function pauseCarousel() {
    isCarouselPaused = true;
    lastFrameTime = 0;
  }

  function resumeCarousel() {
    isCarouselPaused = false;
    lastFrameTime = 0;
  }

  function updateScrollPosition(nextScrollLeft: number) {
    if (!sampleViewport) {
      return;
    }

    sampleViewport.scrollLeft = nextScrollLeft;
  }

  function getSampleStride() {
    if (!sampleViewport || railSamples.length < 2) {
      return;
    }

    const track = sampleViewport.querySelector<HTMLElement>(".sample-track");
    const firstButton = track?.querySelector<HTMLElement>(
      ".sample-image-button",
    );
    if (!track || !firstButton) {
      return;
    }

    const computedTrackStyle = window.getComputedStyle(track);
    const gap = Number.parseFloat(
      computedTrackStyle.columnGap || computedTrackStyle.gap || "0",
    );

    return firstButton.offsetWidth + gap;
  }

  function rotateSamplesForward() {
    if (railSamples.length < 2) {
      return;
    }

    railSamples = [...railSamples.slice(1), railSamples[0]];
  }

  function normalizeScrollPosition() {
    if (!sampleViewport || railSamples.length < 2) {
      return;
    }

    const stride = getSampleStride();
    if (!stride || stride <= 0) {
      return;
    }

    while (sampleViewport.scrollLeft >= stride) {
      rotateSamplesForward();
      updateScrollPosition(sampleViewport.scrollLeft - stride);
    }
  }

  function handleCarouselInteractionStart() {
    if (railSamples.length < 2) {
      return;
    }

    pauseCarousel();
  }

  function handleCarouselInteractionEnd() {
    if (railSamples.length < 2) {
      return;
    }

    resumeCarousel();
  }

  function handleCarouselScroll() {
    normalizeScrollPosition();
  }

  function tick(timestamp: number) {
    if (sampleViewport && railSamples.length > 1 && !isCarouselPaused) {
      if (!lastFrameTime) {
        lastFrameTime = timestamp;
      }

      const delta = timestamp - lastFrameTime;
      const stride = getSampleStride();
      if (stride && stride > 0) {
        const pixelsPerSecond = stride / SECONDS_PER_IMAGE;
        updateScrollPosition(
          sampleViewport.scrollLeft + (delta * pixelsPerSecond) / 1000,
        );
        normalizeScrollPosition();
      }
    }

    lastFrameTime = timestamp;
    animationFrame = window.requestAnimationFrame(tick);
  }

  onMount(() => {
    if (sampleViewport) {
      sampleViewport.scrollLeft = 0;
    }

    animationFrame = window.requestAnimationFrame(tick);
  });

  onDestroy(() => {
    if (animationFrame) {
      window.cancelAnimationFrame(animationFrame);
    }
  });
</script>

<svelte:window on:paste={handlePaste} />

<section class:uploader-shell-merged={merged} class="uploader-shell">
  {#if showHeader}
    <div class="uploader-heading">
      <div>
        <h3 class="section-heading">Start with an image</h3>
        <p class="section-copy">
          The upload pipeline normalizes EXIF orientation, extracts the first
          GIF frame, and downscales only for inference safety.
        </p>
      </div>
    </div>
  {/if}

  <div
    class:dragging={isDragging}
    class="dropzone"
    role="button"
    tabindex={disabled ? -1 : 0}
    aria-disabled={disabled}
    on:dragenter|preventDefault={() => handleDragState(true)}
    on:dragleave|preventDefault={() => handleDragState(false)}
    on:dragover={preventDefaults}
    on:drop={handleDrop}
    on:keydown={handleDropzoneKeydown}
  >
    <div class="dropzone-copy">
      <p class="eyebrow">Drop zone</p>
      <h4>Drag a photo here, or paste straight from your clipboard.</h4>
      <p>
        Supported: JPEG, PNG, WebP, BMP, GIF. Oversized inputs are safely
        downscaled before inference.
      </p>
    </div>

    <div class="dropzone-actions">
      <button
        class="primary-button"
        type="button"
        {disabled}
        on:click={openFilePicker}>Choose image</button
      >
      <span class="dropzone-hint"
        >or paste with Ctrl/Cmd + V, or pick from the samples.</span
      >
    </div>

    <input
      bind:this={fileInput}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/bmp,image/gif"
      hidden
      on:change={handleInputChange}
    />
  </div>

  {#if sampleImages.length > 0}
    <div class="sample-rail-shell">
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <div
        bind:this={sampleViewport}
        aria-label="Sample images"
        class="sample-rail"
        data-paused={isCarouselPaused ? "true" : "false"}
        role="region"
        on:focusin={handleCarouselInteractionStart}
        on:focusout={handleCarouselInteractionEnd}
        on:mousedown={handleCarouselInteractionStart}
        on:mouseup={handleCarouselInteractionEnd}
        on:pointerenter={handleCarouselInteractionStart}
        on:pointerleave={handleCarouselInteractionEnd}
        on:scroll={handleCarouselScroll}
        on:touchend={handleCarouselInteractionEnd}
        on:touchstart={handleCarouselInteractionStart}
        on:wheel={handleCarouselInteractionStart}
      >
        <div class="sample-track">
          {#each railSamples as sample, index (sample.id)}
            <button
              aria-label={`Use sample ${sample.label}`}
              class="sample-image-button"
              type="button"
              {disabled}
              on:click={() => handleSampleClick(sample)}
              on:touchend={() => handleSampleClick(sample)}
            >
              <img
                loading={index < 4 ? "eager" : "lazy"}
                src={sample.url}
                alt=""
              />
            </button>
          {/each}
        </div>
      </div>
    </div>
  {/if}
</section>

<style>
  .uploader-shell {
    position: relative;
    z-index: 1;
    display: grid;
    gap: 16px;
    border-radius: 28px;
    padding: 22px;
  }

  .uploader-shell.uploader-shell-merged {
    gap: 14px;
    padding: 0;
    border-radius: 0;
    border: none;
    background: transparent;
    box-shadow: none;
    backdrop-filter: none;
  }

  .uploader-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  .dropzone {
    display: grid;
    gap: 16px;
    border-radius: 24px;
    border: 1.5px dashed var(--line-strong);
    background: linear-gradient(145deg, var(--surface-strong), transparent);
    padding: 28px;
    transition:
      border-color 160ms ease,
      background-color 160ms ease,
      transform 160ms ease;
  }

  .dropzone.dragging {
    border-color: var(--accent);
    background: rgba(232, 103, 55, 0.08);
    transform: translateY(-1px);
  }

  .dropzone-copy h4 {
    margin: 10px 0 0;
    font: 700 clamp(1.5rem, 2vw, 2rem) / 1.02 var(--font-display);
    letter-spacing: -0.04em;
  }

  .dropzone-copy p:last-child {
    margin-top: 12px;
    color: var(--muted);
  }

  .dropzone-actions {
    display: flex;
    gap: 14px;
    align-items: center;
    flex-wrap: wrap;
  }

  .dropzone-hint {
    color: var(--muted);
    font-size: 0.94rem;
  }

  .sample-rail-shell {
    position: relative;
    min-width: 0;
  }

  .sample-rail {
    width: 100%;
    max-width: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    padding-bottom: 8px;
    scrollbar-width: none;
    scrollbar-color: transparent transparent;
    -webkit-overflow-scrolling: touch;
  }

  .sample-rail:hover,
  .sample-rail:focus-within {
    scrollbar-width: thin;
    scrollbar-color: color-mix(in srgb, var(--line-strong) 90%, transparent)
      transparent;
  }

  .sample-rail::-webkit-scrollbar {
    height: 0;
  }

  .sample-rail:hover::-webkit-scrollbar,
  .sample-rail:focus-within::-webkit-scrollbar {
    height: 10px;
  }

  .sample-rail::-webkit-scrollbar-track {
    background: transparent;
  }

  .sample-rail::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: transparent;
  }

  .sample-rail:hover::-webkit-scrollbar-thumb,
  .sample-rail:focus-within::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--line-strong) 90%, transparent);
  }

  .sample-track {
    display: flex;
    gap: 12px;
    width: max-content;
    flex-wrap: nowrap;
  }

  .sample-image-button {
    flex: 0 0 clamp(144px, 17vw, 188px);
    padding: 0;
    border: none;
    background: transparent;
    border-radius: 22px;
    overflow: hidden;
    box-shadow: 0 10px 24px rgba(32, 22, 19, 0.12);
    transition:
      transform 160ms ease,
      box-shadow 160ms ease,
      opacity 160ms ease;
  }

  .sample-image-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 16px 30px rgba(32, 22, 19, 0.18);
  }

  .sample-image-button img {
    width: 100%;
    aspect-ratio: 0.78;
    object-fit: cover;
    background: color-mix(in srgb, var(--paper) 88%, transparent);
  }

  @media (max-width: 920px) {
    .uploader-shell {
      padding: 18px;
    }

    .uploader-shell.uploader-shell-merged {
      padding: 0;
    }

    .dropzone {
      padding: 20px;
    }

    .sample-image-button {
      flex-basis: clamp(126px, 38vw, 168px);
    }
  }
</style>
