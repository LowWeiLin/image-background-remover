<script lang="ts">
  import type { ProcessingStage } from "../types";

  export let originalSrc: string;
  export let cutoutSrc: string | undefined;
  export let stage: ProcessingStage;

  $: revealing = stage === "revealing" && Boolean(cutoutSrc);
</script>

<div class="overlay-shell checkerboard">
  {#if cutoutSrc}
    <img
      class="overlay-image base"
      src={cutoutSrc}
      alt="Processed cutout preview"
    />
  {/if}

  <div class:revealing class="overlay-original">
    <img
      class="overlay-image"
      src={originalSrc}
      alt="Source during processing"
    />
  </div>

  <div
    class:reveal-hidden={Boolean(cutoutSrc)}
    class="processing-wave"
    aria-hidden="true"
  ></div>
</div>

<style>
  .overlay-shell {
    position: relative;
    height: 100%;
    overflow: hidden;
    border-radius: 22px;
    border: 1px solid var(--line);
    background: var(--surface-strong);
  }

  .overlay-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    margin: 0 auto;
  }

  .base,
  .overlay-original,
  .processing-wave {
    position: absolute;
    inset: 0;
  }

  .overlay-original {
    transition: clip-path 720ms cubic-bezier(0.22, 1, 0.36, 1);
    clip-path: inset(0 0 0 0);
  }

  .overlay-original.revealing {
    clip-path: inset(0 0 0 100%);
  }

  .processing-wave {
    background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255, 255, 255, 0.12) 45%,
        rgba(255, 255, 255, 0.3) 52%,
        transparent 62%
      ),
      linear-gradient(120deg, rgba(232, 103, 55, 0.12), transparent 44%);
    animation: sweep 1.8s linear infinite;
    mix-blend-mode: screen;
  }

  .processing-wave.reveal-hidden {
    opacity: 0;
  }

  @keyframes sweep {
    from {
      transform: translateX(-30%);
    }

    to {
      transform: translateX(130%);
    }
  }
</style>
