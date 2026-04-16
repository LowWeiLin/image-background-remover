import { describe, expect, it } from "vitest";
import { buildSampleImages, humanizeSampleLabel } from "./sampleImages";

describe("humanizeSampleLabel", () => {
  it("formats dashed and underscored stems into title case", () => {
    expect(humanizeSampleLabel("hero-shot_test")).toBe("Hero Shot Test");
  });

  it("returns a fallback label for an empty stem", () => {
    expect(humanizeSampleLabel("   ")).toBe("Sample image");
  });
});

describe("buildSampleImages", () => {
  it("sorts numerically and derives ids, labels, and file names", () => {
    const modules = {
      "../../assets/samples/10.png": "/10.png",
      "../../assets/samples/2.png": "/2.png",
      "../../assets/samples/hero-shot.webp": "/hero-shot.webp",
    };

    expect(buildSampleImages(modules)).toEqual([
      {
        id: "2",
        fileName: "2.png",
        label: "2",
        url: "/2.png",
      },
      {
        id: "10",
        fileName: "10.png",
        label: "10",
        url: "/10.png",
      },
      {
        id: "hero-shot",
        fileName: "hero-shot.webp",
        label: "Hero Shot",
        url: "/hero-shot.webp",
      },
    ]);
  });
});
