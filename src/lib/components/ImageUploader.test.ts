import { fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ImageUploader from "./ImageUploader.svelte";
import { sampleImages } from "../utils/sampleImages";

describe("ImageUploader", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("renders the sample folder dynamically as a single image-only rail", () => {
    const { container } = render(ImageUploader);

    expect(container.querySelector(".sample-card")).toBeNull();
    expect(container.querySelectorAll("small")).toHaveLength(0);
    expect(screen.getAllByRole("button", { name: /use sample/i })).toHaveLength(
      sampleImages.length,
    );
  });

  it("loads a clicked sample image and forwards it to onSelect", async () => {
    const onSelect = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        blob: vi
          .fn()
          .mockResolvedValue(new Blob(["sample"], { type: "image/png" })),
      }),
    );

    render(ImageUploader, { onSelect });

    await fireEvent.click(
      screen.getAllByRole("button", { name: /use sample/i })[0],
    );

    expect(fetch).toHaveBeenCalled();
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: sampleImages[0].fileName,
        source: "sample",
        blob: expect.any(Blob),
      }),
    );
  });

  it("pauses the sample rail during interaction and resumes after idle time", async () => {
    render(ImageUploader);

    const rail = screen.getByLabelText("Sample images");
    expect(rail).toHaveAttribute("data-paused", "false");

    await fireEvent.pointerEnter(rail);
    expect(rail).toHaveAttribute("data-paused", "true");

    await fireEvent.pointerLeave(rail);
    expect(rail).toHaveAttribute("data-paused", "false");
  });
});
