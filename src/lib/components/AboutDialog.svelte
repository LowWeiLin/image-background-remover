<script lang="ts">
  import type { BackendType } from "../types";

  export let open = false;
  export let backend: BackendType = "unknown";
  export let onClose: () => void = () => {};
</script>

{#if open}
  <div class="dialog-backdrop" role="presentation" on:click={onClose}></div>
  <div
    class="dialog-shell"
    aria-modal="true"
    role="dialog"
    aria-labelledby="about-title"
  >
    <div class="dialog-header">
      <div>
        <p class="eyebrow">About</p>
        <h2 id="about-title">How the pipeline works</h2>
      </div>
      <button class="ghost-button" type="button" on:click={onClose}
        >Close</button
      >
    </div>

    <div class="dialog-body">
      <p>
        This app keeps image processing on-device. It runs a Transformers.js
        background-removal pipeline inside a dedicated worker, so the UI stays
        responsive while model files download and inference runs.
      </p>

      <ul>
        <li>
          The current backend is <strong
            >{backend === "unknown"
              ? "still initializing"
              : backend.toUpperCase()}</strong
          >.
        </li>
        <li>
          Large images are inferred at a bounded size, then composited back to
          the original dimensions for export.
        </li>
        <li>
          The browser caches model files natively. The PWA caches the app shell,
          not Hugging Face model downloads.
        </li>
        <li>
          Exports include a transparent cutout PNG and a grayscale foreground
          mask.
        </li>
      </ul>
    </div>
  </div>
{/if}

<style>
  .dialog-backdrop {
    position: fixed;
    inset: 0;
    z-index: 30;
    background: rgba(23, 19, 17, 0.45);
    backdrop-filter: blur(8px);
  }

  .dialog-shell {
    position: fixed;
    z-index: 31;
    top: 50%;
    left: 50%;
    width: min(680px, calc(100% - 24px));
    transform: translate(-50%, -50%);
    border-radius: 28px;
    border: 1px solid var(--line);
    background: var(--surface-strong);
    box-shadow: var(--shadow);
    padding: 22px;
  }

  .dialog-header {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: flex-start;
  }

  .dialog-header h2 {
    margin: 10px 0 0;
    font: 700 2rem/1 var(--font-display);
    letter-spacing: -0.04em;
  }

  .dialog-body {
    color: var(--muted);
    margin-top: 18px;
  }

  .dialog-body ul {
    margin: 16px 0 0;
    padding-left: 1.2rem;
  }

  .dialog-body li + li {
    margin-top: 10px;
  }
</style>
