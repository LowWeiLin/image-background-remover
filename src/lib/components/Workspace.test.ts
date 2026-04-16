import { render, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import Workspace from "./Workspace.svelte";
import { appStore, initialAppStore } from "../stores/appStore";

describe("Workspace", () => {
  afterEach(() => {
    appStore.set({ ...initialAppStore, notices: [] });
  });

  it("does not show the ready-state copy before processing starts", () => {
    appStore.set({
      ...initialAppStore,
      appState: "ready",
      selection: {
        source: "sample",
        fileName: "portrait.png",
        originalBlob: new Blob(["original"], { type: "image/png" }),
        originalUrl: "blob:original",
        originalWidth: 1200,
        originalHeight: 900,
        inferenceBlob: new Blob(["inference"], { type: "image/png" }),
        inferenceWidth: 1200,
        inferenceHeight: 900,
        downscaled: false,
      },
    });

    render(Workspace);

    expect(
      screen.queryByText(
        /your source image is normalized and ready for inference/i,
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /remove background/i }),
    ).toBeInTheDocument();
  });
});
