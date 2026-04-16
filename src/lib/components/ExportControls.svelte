<script lang="ts">
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
      <svg viewBox="0 0 24 24">
        <path
          d="M12 5a7 7 0 1 1-6.6 9.3"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.8"
        ></path>
        <path
          d="M7.2 4.8H12v4.8"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.8"
        ></path>
      </svg>
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
      <svg viewBox="0 0 24 24">
        <path
          d="M12 4.8v9.1"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-width="1.8"
        ></path>
        <path
          d="m8.6 10.8 3.4 3.5 3.4-3.5"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.8"
        ></path>
        <path
          d="M5 17.4h14"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-width="1.8"
        ></path>
      </svg>
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
      <svg viewBox="0 0 24 24">
        <path
          d="M12 4.8v9.1"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-width="1.8"
        ></path>
        <path
          d="m8.6 10.8 3.4 3.5 3.4-3.5"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.8"
        ></path>
        <path
          d="M5 17.4h14"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-width="1.8"
        ></path>
      </svg>
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

  .button-icon svg {
    width: 100%;
    height: 100%;
  }
</style>
