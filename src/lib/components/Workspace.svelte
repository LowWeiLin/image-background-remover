<script lang="ts">
  import { appStore } from "../stores/appStore";
  import RevealOverlay from "./RevealOverlay.svelte";
  import CompareSlider from "./CompareSlider.svelte";
  import ViewToggle from "./ViewToggle.svelte";
  import ExportControls from "./ExportControls.svelte";

  export let onStartProcessing: () => Promise<void> | void = () => {};
  export let onCancel: () => void = () => {};
  export let onDownload: (kind: "cutout" | "mask") => void = () => {};
</script>

<section class="workspace-shell">
  <div class="workspace-head">
    <div>
      <h3 class="section-heading">Workspace</h3>
      <p class="section-copy">
        Preview the original, compare the cutout, and export the final PNG or
        grayscale mask.
      </p>
    </div>

    {#if $appStore.backend !== "unknown"}
      <span class="badge"
        ><span class="status-dot"></span>{$appStore.backend === "webgpu"
          ? "WebGPU active"
          : "WASM fallback"}</span
      >
    {/if}
  </div>

  {#if $appStore.warning}
    <aside class="warning-banner">{$appStore.warning}</aside>
  {/if}

  <div class="workspace-stage checkerboard">
    {#if !$appStore.selection}
      <div class="empty-state">
        <p class="eyebrow">Idle</p>
        <h4>Choose an image to begin the client-side pipeline.</h4>
        <p>
          Nothing leaves the browser. The worker initializes in the background
          and the UI stays responsive.
        </p>
      </div>
    {:else if $appStore.appState === "ready" || $appStore.appState === "error"}
      <div class="preview-frame">
        <img src={$appStore.selection.originalUrl} alt="Selected source" />
      </div>

      <div class="workspace-message">
        <p class="eyebrow">
          {$appStore.appState === "error" ? "Retry ready" : "Ready"}
        </p>
        <h4>
          {$appStore.appState === "error"
            ? "The last run failed, but your source image is still loaded."
            : "Your source image is normalized and ready for inference."}
        </h4>
        <p>
          {$appStore.errorMessage ||
            ($appStore.selection.downscaled
              ? "This image will be inferred at a bounded size and composited back to its original dimensions."
              : "This image can run at its current dimensions.")}
        </p>
        <div class="workspace-actions">
          <button
            class="primary-button"
            type="button"
            on:click={onStartProcessing}>Remove background</button
          >
        </div>
      </div>
    {:else if $appStore.appState === "model_loading"}
      <div class="preview-frame">
        <img
          src={$appStore.selection.originalUrl}
          alt="Source while the model loads"
        />
      </div>

      <div class="workspace-message">
        <p class="eyebrow">Model loading</p>
        <h4>The worker is downloading and initializing model assets.</h4>
        <p>{$appStore.modelStatusText}</p>
        <div class="progress-shell" aria-label="Model loading progress">
          <div class="progress-track">
            <span style={`width: ${$appStore.modelProgress}%`}></span>
          </div>
          <strong>{$appStore.modelProgress}%</strong>
        </div>
        <div class="workspace-actions">
          <button class="secondary-button" type="button" on:click={onCancel}
            >Cancel</button
          >
        </div>
      </div>
    {:else if $appStore.appState === "processing"}
      <RevealOverlay
        originalSrc={$appStore.selection.originalUrl}
        cutoutSrc={$appStore.artifacts?.cutoutUrl}
        stage={$appStore.processingStage}
      />

      <div class="workspace-message">
        <p class="eyebrow">Processing</p>
        <h4>
          {$appStore.processingStage === "revealing"
            ? "Your cutout is landing in the workspace."
            : "The worker is running on your image."}
        </h4>
        <p>{$appStore.modelStatusText}</p>
        <div class="workspace-actions">
          <button class="secondary-button" type="button" on:click={onCancel}
            >Cancel</button
          >
        </div>
      </div>
    {:else if $appStore.appState === "completed" && $appStore.artifacts}
      <CompareSlider
        originalSrc={$appStore.selection.originalUrl}
        cutoutSrc={$appStore.artifacts.cutoutUrl}
        maskSrc={$appStore.artifacts.maskUrl}
        viewMode={$appStore.viewMode}
      />
    {/if}
  </div>

  <div class="workspace-footer">
    <ViewToggle />
    <ExportControls
      cutoutUrl={$appStore.artifacts?.cutoutUrl}
      maskUrl={$appStore.artifacts?.maskUrl}
      originalFileName={$appStore.selection?.fileName}
      {onDownload}
    />
  </div>
</section>

<style>
  .workspace-shell {
    position: relative;
    z-index: 1;
    display: grid;
    gap: 16px;
    border-radius: 28px;
    padding: 22px;
  }

  .workspace-head,
  .workspace-footer,
  .workspace-actions,
  .progress-shell {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    flex-wrap: wrap;
  }

  .warning-banner {
    border-radius: 18px;
    border: 1px solid color-mix(in srgb, var(--warning) 40%, transparent);
    background: color-mix(in srgb, var(--warning) 12%, transparent);
    color: var(--warning);
    padding: 12px 14px;
  }

  .workspace-stage {
    display: grid;
    gap: 18px;
    align-items: start;
    min-height: 420px;
    border-radius: 28px;
    border: 1px solid var(--line);
    padding: 18px;
  }

  .preview-frame,
  .empty-state,
  .workspace-message {
    border-radius: 22px;
    background: var(--surface-strong);
    border: 1px solid var(--line);
  }

  .preview-frame {
    overflow: hidden;
  }

  .preview-frame img {
    width: 100%;
    max-height: 520px;
    object-fit: contain;
    background: color-mix(in srgb, var(--paper) 90%, transparent);
  }

  .empty-state,
  .workspace-message {
    padding: 20px;
  }

  .empty-state {
    display: grid;
    place-items: center;
    text-align: center;
    min-height: 360px;
  }

  .empty-state h4,
  .workspace-message h4 {
    margin: 10px 0 0;
    font: 700 clamp(1.35rem, 2vw, 1.8rem) / 1.05 var(--font-display);
    letter-spacing: -0.03em;
  }

  .empty-state p:last-child,
  .workspace-message p:last-of-type {
    color: var(--muted);
    margin-top: 12px;
  }

  .progress-shell {
    align-items: center;
  }

  .progress-track {
    position: relative;
    flex: 1 1 280px;
    height: 10px;
    border-radius: 999px;
    overflow: hidden;
    background: color-mix(in srgb, var(--line-strong) 50%, transparent);
  }

  .progress-track span {
    position: absolute;
    inset: 0 auto 0 0;
    border-radius: inherit;
    background: linear-gradient(
      90deg,
      var(--accent),
      color-mix(in srgb, var(--accent) 48%, white)
    );
  }

  .workspace-footer {
    align-items: flex-start;
  }

  @media (max-width: 920px) {
    .workspace-shell {
      padding: 18px;
    }

    .workspace-stage {
      min-height: 340px;
      padding: 14px;
    }

    .workspace-footer {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
