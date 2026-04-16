<script lang="ts">
  import type { ToastNotice } from "../types";

  export let notices: ToastNotice[] = [];
  export let onDismiss: (id: number) => void = () => {};
</script>

<div class="toast-stack" aria-live="polite" aria-atomic="true">
  {#each notices as notice (notice.id)}
    <article class={`toast ${notice.kind}`}>
      <p>{notice.message}</p>
      <button type="button" on:click={() => onDismiss(notice.id)}
        >Dismiss</button
      >
    </article>
  {/each}
</div>

<style>
  .toast-stack {
    position: fixed;
    right: 20px;
    bottom: 20px;
    z-index: 40;
    display: grid;
    gap: 10px;
    width: min(360px, calc(100vw - 28px));
  }

  .toast {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: flex-start;
    border-radius: 18px;
    border: 1px solid var(--line);
    background: var(--surface-strong);
    box-shadow: var(--shadow);
    padding: 12px 14px;
  }

  .toast.error {
    border-color: color-mix(in srgb, var(--danger) 36%, transparent);
  }

  .toast.warning {
    border-color: color-mix(in srgb, var(--warning) 36%, transparent);
  }

  .toast.success {
    border-color: color-mix(in srgb, var(--success) 36%, transparent);
  }

  .toast p {
    margin: 0;
  }

  .toast button {
    border: none;
    background: transparent;
    color: var(--muted);
  }
</style>
