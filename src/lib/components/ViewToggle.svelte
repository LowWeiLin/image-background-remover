<script lang="ts">
  import { appStore, setViewMode } from "../stores/appStore";
  import type { ViewMode } from "../types";

  const modes: Array<{ label: string; value: ViewMode }> = [
    { label: "Compare", value: "compare" },
    { label: "Original", value: "original" },
    { label: "Mask", value: "mask" },
  ];
</script>

<div class="toggle-group" aria-label="View selection">
  {#each modes as mode}
    <button
      class:active={$appStore.viewMode === mode.value}
      type="button"
      on:click={() => setViewMode(mode.value)}
    >
      {mode.label}
    </button>
  {/each}
</div>

<style>
  .toggle-group {
    display: inline-flex;
    gap: 8px;
    padding: 6px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--surface-strong);
  }

  .toggle-group button {
    border: none;
    background: transparent;
    color: var(--muted);
    border-radius: 999px;
    padding: 0.55rem 0.9rem;
  }

  .toggle-group button.active {
    background: var(--accent-soft);
    color: var(--accent-strong);
  }
</style>
