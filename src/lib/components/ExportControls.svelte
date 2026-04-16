<script lang="ts">
  export let cutoutUrl: string | undefined;
  export let maskUrl: string | undefined;
  export let originalFileName: string | undefined;
  export let onDownload: (kind: "cutout" | "mask") => void = () => {};

  $: disabled = !cutoutUrl || !maskUrl || !originalFileName;
</script>

<div class="export-actions">
  <button
    class="primary-button"
    type="button"
    {disabled}
    on:click={() => onDownload("cutout")}
  >
    Download cutout PNG
  </button>
  <button
    class="secondary-button"
    type="button"
    {disabled}
    on:click={() => onDownload("mask")}
  >
    Download mask PNG
  </button>
</div>

<style>
  .export-actions {
    display: inline-flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
</style>
