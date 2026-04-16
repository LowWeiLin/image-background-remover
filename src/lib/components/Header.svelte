<script lang="ts">
  import Icon from "@iconify/svelte";
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
      <p class="eyebrow">Image</p>
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
      <Icon
        class="topbar-icon"
        icon="mdi:github"
        width="20"
        height="20"
        aria-hidden="true"
      />
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

  .topbar-link :global(.topbar-icon) {
    width: 20px;
    height: 20px;
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
