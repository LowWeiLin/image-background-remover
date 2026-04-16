<script lang="ts">
  import type { ViewMode } from "../types";

  export let originalSrc: string;
  export let cutoutSrc: string;
  export let maskSrc: string;
  export let viewMode: ViewMode = "compare";

  let split = 54;
</script>

{#if viewMode === "compare"}
  <div class="compare-shell checkerboard">
    <img class="compare-base" src={cutoutSrc} alt="Processed cutout" />
    <div
      class="compare-overlay"
      style={`clip-path: inset(0 ${100 - split}% 0 0);`}
    >
      <img src={originalSrc} alt="Original source for comparison" />
    </div>

    <div class="compare-divider" style={`left: ${split}%;`} aria-hidden="true">
      <span></span>
    </div>

    <input
      class="compare-input"
      type="range"
      min="0"
      max="100"
      step="1"
      bind:value={split}
      aria-label="Comparison slider"
    />
  </div>
{:else}
  <div class="single-view checkerboard">
    <img
      src={viewMode === "original" ? originalSrc : maskSrc}
      alt={viewMode === "original" ? "Original image" : "Mask preview"}
    />
  </div>
{/if}

<style>
  .compare-shell,
  .single-view {
    position: relative;
    overflow: hidden;
    border-radius: 22px;
    border: 1px solid var(--line);
    min-height: 360px;
    background: var(--surface-strong);
  }

  .compare-base,
  .compare-overlay img,
  .single-view img {
    width: 100%;
    max-height: 520px;
    object-fit: contain;
    margin: 0 auto;
  }

  .compare-overlay,
  .compare-input,
  .compare-divider {
    position: absolute;
    inset: 0;
  }

  .compare-divider {
    width: 0;
    border-left: 2px solid white;
    box-shadow: 0 0 0 1px rgba(32, 22, 19, 0.2);
  }

  .compare-divider span {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 42px;
    height: 42px;
    transform: translate(-50%, -50%);
    border-radius: 999px;
    background: var(--surface-strong);
    border: 1px solid var(--line-strong);
    box-shadow: var(--shadow);
  }

  .compare-divider span::before,
  .compare-divider span::after {
    content: "";
    position: absolute;
    top: 50%;
    width: 9px;
    height: 9px;
    border-top: 2px solid var(--accent);
    border-right: 2px solid var(--accent);
  }

  .compare-divider span::before {
    left: 10px;
    transform: translateY(-50%) rotate(225deg);
  }

  .compare-divider span::after {
    right: 10px;
    transform: translateY(-50%) rotate(45deg);
  }

  .compare-input {
    appearance: none;
    background: transparent;
    width: 100%;
    height: 100%;
    margin: 0;
    cursor: ew-resize;
  }

  .compare-input::-webkit-slider-thumb {
    appearance: none;
    width: 42px;
    height: 42px;
    opacity: 0;
  }

  .compare-input::-moz-range-thumb {
    width: 42px;
    height: 42px;
    opacity: 0;
    border: none;
  }
</style>
