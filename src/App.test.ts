import { fireEvent, render, screen } from "@testing-library/svelte";
import { get } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.svelte";
import { appStore, initialAppStore } from "./lib/stores/appStore";

describe("App reset flow", () => {
  beforeEach(() => {
    const workerTerminate = vi.fn();
    const workerPostMessage = vi.fn();

    vi.stubGlobal(
      "Worker",
      class {
        onmessage: ((event: MessageEvent) => void) | null = null;
        onerror: ((event: ErrorEvent) => void) | null = null;
        terminate = workerTerminate;
        postMessage = workerPostMessage;
      },
    );

    appStore.set({
      ...initialAppStore,
      appState: "completed",
      selection: {
        source: "sample",
        fileName: "1.png",
        originalBlob: new Blob(["original"], { type: "image/png" }),
        originalUrl: "blob:original",
        originalWidth: 100,
        originalHeight: 100,
        inferenceBlob: new Blob(["inference"], { type: "image/png" }),
        inferenceWidth: 100,
        inferenceHeight: 100,
        downscaled: false,
      },
      artifacts: {
        cutoutBlob: new Blob(["cutout"], { type: "image/png" }),
        cutoutUrl: "blob:cutout",
        maskBlob: new Blob(["mask"], { type: "image/png" }),
        maskUrl: "blob:mask",
        fileStem: "1",
      },
    });
  });

  afterEach(() => {
    appStore.set({ ...initialAppStore, notices: [] });
  });

  it("clears the workspace selection and generated artifacts when reset is clicked", async () => {
    render(App);

    await fireEvent.click(
      screen.getByRole("button", { name: /reset workspace/i }),
    );

    const state = get(appStore);
    expect(state.appState).toBe("idle");
    expect(state.selection).toBeNull();
    expect(state.artifacts).toBeNull();
    expect(state.viewMode).toBe("compare");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:cutout");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mask");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:original");
  });

  it("shows upload mode until a selection exists", () => {
    appStore.set({ ...initialAppStore, notices: [] });

    render(App);

    expect(
      screen.getByRole("heading", { name: /workspace/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/^choose image$/i).closest("button"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^compare$/i })).toBeNull();
    expect(
      screen.queryByRole("button", { name: /reset workspace/i }),
    ).toBeNull();
  });
});
