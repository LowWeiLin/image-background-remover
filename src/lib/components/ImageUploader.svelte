<script lang="ts">
  import portraitSample from "../../assets/samples/portrait.svg";
  import fullBodySample from "../../assets/samples/full-body.svg";
  import productSample from "../../assets/samples/product.svg";
  import type { ImageSelectionRequest } from "../types";

  export let disabled = false;
  export let onError: (message: string) => void = () => {};
  export let onSelect: (
    request: ImageSelectionRequest,
  ) => Promise<void> | void = () => {};

  let fileInput: HTMLInputElement | null = null;
  let isDragging = false;
  const MAX_INPUT_BYTES = 100 * 1024 * 1024;

  const sampleImages = [
    {
      label: "Portrait",
      caption: "Soft light against a warm backdrop",
      url: portraitSample,
      fileName: "sample-portrait.png",
    },
    {
      label: "Full body",
      caption: "Standing pose for edge-detail checks",
      url: fullBodySample,
      fileName: "sample-full-body.png",
    },
    {
      label: "Product",
      caption: "Hard edges and reflective surfaces",
      url: productSample,
      fileName: "sample-product.png",
    },
  ];

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
</script>

<svelte:window on:paste={handlePaste} />

<section class="uploader-shell">
  <div class="uploader-heading">
    <div>
      <h3 class="section-heading">Start with an image</h3>
      <p class="section-copy">
        The upload pipeline normalizes EXIF orientation, extracts the first GIF
        frame, and downscales only for inference safety.
      </p>
    </div>
    <span class="badge"
      ><span class="status-dot"></span>First-frame GIF support</span
    >
  </div>

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
      <span class="dropzone-hint">or press Ctrl/Cmd + V</span>
    </div>

    <input
      bind:this={fileInput}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/bmp,image/gif"
      hidden
      on:change={handleInputChange}
    />
  </div>

  <div class="sample-grid">
    {#each sampleImages as sample}
      <button
        class="sample-card"
        type="button"
        {disabled}
        on:click={() => handleSampleClick(sample)}
      >
        <img src={sample.url} alt="" />
        <span>{sample.label}</span>
        <small>{sample.caption}</small>
      </button>
    {/each}
  </div>
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

  .sample-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .sample-card {
    display: grid;
    gap: 10px;
    text-align: left;
    border-radius: 20px;
    border: 1px solid var(--line);
    background: var(--surface-strong);
    padding: 10px;
  }

  .sample-card img {
    width: 100%;
    aspect-ratio: 1.18;
    object-fit: cover;
    border-radius: 14px;
    border: 1px solid var(--line);
    background: color-mix(in srgb, var(--paper) 88%, transparent);
  }

  .sample-card span {
    font-weight: 700;
  }

  .sample-card small {
    color: var(--muted);
  }

  @media (max-width: 920px) {
    .uploader-shell {
      padding: 18px;
    }

    .dropzone {
      padding: 20px;
    }

    .sample-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
