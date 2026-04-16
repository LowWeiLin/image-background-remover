import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import ExportControls from "./ExportControls.svelte";

describe("ExportControls", () => {
  it("renders reset first and calls the reset/download callbacks", async () => {
    const onReset = vi.fn();
    const onDownload = vi.fn();
    const { container } = render(ExportControls, {
      canReset: true,
      cutoutUrl: "blob:cutout",
      maskUrl: "blob:mask",
      originalFileName: "portrait.png",
      onReset,
      onDownload,
    });

    const buttons = container.querySelectorAll("button");
    expect(buttons[0]).toHaveAccessibleName("Reset workspace");
    expect(container.querySelectorAll("svg")).toHaveLength(3);

    await fireEvent.click(
      screen.getByRole("button", { name: /reset workspace/i }),
    );
    await fireEvent.click(
      screen.getByRole("button", { name: /download cutout png/i }),
    );
    await fireEvent.click(
      screen.getByRole("button", { name: /download mask png/i }),
    );

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onDownload).toHaveBeenNthCalledWith(1, "cutout");
    expect(onDownload).toHaveBeenNthCalledWith(2, "mask");
  });

  it("disables the reset and download actions when they are unavailable", () => {
    render(ExportControls, {
      canReset: false,
      cutoutUrl: undefined,
      maskUrl: undefined,
      originalFileName: undefined,
    });

    expect(
      screen.getByRole("button", { name: /reset workspace/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /download cutout png/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /download mask png/i }),
    ).toBeDisabled();
  });
});
