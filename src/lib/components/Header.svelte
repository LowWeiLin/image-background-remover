<script lang="ts">
  import { appStore, setAboutOpen, setTheme } from "../stores/appStore";
  import type { ThemeMode } from "../types";

  export let onOpenAbout: () => void = () => setAboutOpen(true);

  const themes: Array<{ label: string; value: ThemeMode }> = [
    { label: "System", value: "system" },
    { label: "Light", value: "light" },
    { label: "Dark", value: "dark" },
  ];
</script>

<header class="topbar">
  <div class="brand-lockup">
    <div class="brand-mark" aria-hidden="true">
      <span></span>
      <span></span>
      <span></span>
    </div>
    <div>
      <p class="eyebrow">Image craft</p>
      <h1>Background Remover</h1>
    </div>
  </div>

  <div class="topbar-actions">
    <div class="theme-switcher" aria-label="Theme mode toggle">
      {#each themes as theme}
        <button
          type="button"
          class:selected={$appStore.theme === theme.value}
          on:click={() => setTheme(theme.value)}
        >
          {theme.label}
        </button>
      {/each}
    </div>

    <button
      class="ghost-button topbar-button"
      type="button"
      on:click={onOpenAbout}>How it works</button
    >

    <a
      class="topbar-link"
      href="https://github.com/"
      target="_blank"
      rel="noreferrer"
    >
      <span class="sr-only">Open GitHub</span>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 2C6.48 2 2 6.59 2 12.24c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.5 0-.24-.01-1.05-.02-1.9-2.78.62-3.37-1.2-3.37-1.2-.46-1.2-1.11-1.52-1.11-1.52-.91-.64.07-.63.07-.63 1 .08 1.54 1.06 1.54 1.06.9 1.56 2.36 1.11 2.94.84.09-.67.35-1.11.63-1.36-2.22-.26-4.55-1.14-4.55-5.09 0-1.13.39-2.06 1.03-2.79-.1-.26-.45-1.31.1-2.73 0 0 .84-.28 2.75 1.06A9.3 9.3 0 0 1 12 6.83c.85 0 1.71.12 2.51.35 1.91-1.34 2.75-1.06 2.75-1.06.55 1.42.2 2.47.1 2.73.64.73 1.03 1.66 1.03 2.79 0 3.96-2.34 4.82-4.57 5.07.36.32.69.95.69 1.91 0 1.38-.01 2.5-.01 2.84 0 .28.18.61.69.5A10.24 10.24 0 0 0 22 12.24C22 6.59 17.52 2 12 2Z"
        />
      </svg>
    </a>
  </div>
</header>

<style>
  .topbar {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    border-radius: 28px;
    padding: 16px 18px;
    margin-bottom: 18px;
  }

  .brand-lockup {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .brand-lockup h1 {
    margin: 0;
    font: 700 1.5rem/1 var(--font-display);
    letter-spacing: -0.03em;
  }

  .brand-mark {
    display: grid;
    grid-template-columns: repeat(3, 14px);
    gap: 6px;
    width: max-content;
    padding: 10px;
    border-radius: 18px;
    background: linear-gradient(145deg, var(--surface-strong), transparent);
    border: 1px solid var(--line);
  }

  .brand-mark span {
    width: 14px;
    height: 14px;
    border-radius: 999px;
    background: var(--accent);
  }

  .brand-mark span:nth-child(2) {
    opacity: 0.55;
  }

  .brand-mark span:nth-child(3) {
    opacity: 0.2;
  }

  .topbar-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .theme-switcher {
    display: flex;
    gap: 6px;
    padding: 6px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--surface-strong);
  }

  .theme-switcher button {
    border: none;
    background: transparent;
    color: var(--muted);
    border-radius: 999px;
    padding: 0.5rem 0.8rem;
  }

  .theme-switcher button.selected {
    background: var(--accent-soft);
    color: var(--accent-strong);
  }

  .topbar-button {
    padding-inline: 1rem;
  }

  .topbar-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    border-radius: 999px;
    border: 1px solid var(--line-strong);
    background: var(--surface-strong);
  }

  .topbar-link svg {
    width: 20px;
    height: 20px;
    fill: currentColor;
  }

  @media (max-width: 920px) {
    .topbar {
      flex-direction: column;
      align-items: stretch;
    }

    .topbar-actions {
      justify-content: space-between;
    }
  }
</style>
