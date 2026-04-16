import { get } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  appStore,
  dismissNotice,
  initialAppStore,
  pushNotice,
  setAboutOpen,
  setTheme,
  setViewMode,
} from "./appStore";

describe("appStore helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
    appStore.set({ ...initialAppStore, notices: [] });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    appStore.set({ ...initialAppStore, notices: [] });
  });

  it("pushes and auto-dismisses notices", () => {
    pushNotice("success", "Finished");
    expect(get(appStore).notices).toHaveLength(1);

    vi.advanceTimersByTime(6000);

    expect(get(appStore).notices).toHaveLength(0);
  });

  it("dismisses a notice manually", () => {
    const id = pushNotice("warning", "Watch out");

    dismissNotice(id);

    expect(get(appStore).notices).toEqual([]);
  });

  it("persists theme and updates view/about state", () => {
    setTheme("dark");
    setViewMode("mask");
    setAboutOpen(true);

    const state = get(appStore);
    expect(window.localStorage.getItem("theme")).toBe("dark");
    expect(state.theme).toBe("dark");
    expect(state.viewMode).toBe("mask");
    expect(state.aboutOpen).toBe(true);
  });
});
