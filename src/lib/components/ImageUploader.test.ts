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

  it("loads a clicked sample image, forwards it to onSelect, and hides the sample rail", async () => {
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
    expect(screen.queryByLabelText("Sample images")).toBeNull();
  });

  it("pauses the sample rail for 15s after user scrolling and resumes afterward", async () => {
    render(ImageUploader);

    const rail = screen.getByLabelText("Sample images");
    expect(rail).toHaveAttribute("data-paused", "false");

    await fireEvent.wheel(rail);
    expect(rail).toHaveAttribute("data-paused", "true");

    await vi.advanceTimersByTimeAsync(14_999);
    expect(rail).toHaveAttribute("data-paused", "true");

    await vi.advanceTimersByTimeAsync(1);
    expect(rail).toHaveAttribute("data-paused", "false");
  });
});
