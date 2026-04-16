<script lang="ts">
  import { Download, RotateCcw } from "lucide-svelte";

  export let canReset = false;
  export let cutoutUrl: string | undefined;
  export let maskUrl: string | undefined;
  export let originalFileName: string | undefined;
  export let onReset: () => void = () => {};
  export let onDownload: (kind: "cutout" | "mask") => void = () => {};

  $: downloadDisabled = !cutoutUrl || !maskUrl || !originalFileName;
</script>

<div class="export-actions">
  <button
    aria-label="Reset workspace"
    class="ghost-button export-button"
    type="button"
    disabled={!canReset}
    on:click={onReset}
  >
    <span aria-hidden="true" class="button-icon">
      <RotateCcw class="button-icon-svg" size={16} strokeWidth={1.8} />
    </span>
    <span>Reset</span>
  </button>
  <button
    class="primary-button export-button"
    type="button"
    disabled={downloadDisabled}
    on:click={() => onDownload("cutout")}
  >
    <span aria-hidden="true" class="button-icon">
      <Download class="button-icon-svg" size={16} strokeWidth={1.8} />
    </span>
    <span>Download cutout PNG</span>
  </button>
  <button
    class="secondary-button export-button"
    type="button"
    disabled={downloadDisabled}
    on:click={() => onDownload("mask")}
  >
    <span aria-hidden="true" class="button-icon">
      <Download class="button-icon-svg" size={16} strokeWidth={1.8} />
    </span>
    <span>Download mask PNG</span>
  </button>
</div>

<style>
  .export-actions {
    display: inline-flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .export-button {
    display: inline-flex;
    align-items: center;
    gap: 0.62rem;
  }

  .button-icon {
    width: 1rem;
    height: 1rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
  }

  .button-icon :global(.button-icon-svg) {
    width: 100%;
    height: 100%;
  }
</style>
