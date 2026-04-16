export interface SampleImageAsset {
  id: string;
  fileName: string;
  label: string;
  url: string;
}

export function humanizeSampleLabel(stem: string) {
  const normalized = stem.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "Sample image";
  }

  return normalized.replace(/\b\w/g, (character) => character.toUpperCase());
}

export function buildSampleImages(modules: Record<string, string>) {
  return Object.entries(modules)
    .sort(([leftPath], [rightPath]) =>
      leftPath.localeCompare(rightPath, undefined, { numeric: true }),
    )
    .map(([path, url]) => {
      const fileName = path.split("/").pop() ?? "sample.png";
      const stem = fileName.replace(/\.[^.]+$/, "");

      return {
        id: stem,
        fileName,
        label: humanizeSampleLabel(stem),
        url,
      } satisfies SampleImageAsset;
    });
}

const sampleImageModules = import.meta.glob(
  "../../assets/samples/*.{png,jpg,jpeg,webp,avif,gif}",
  {
    eager: true,
    import: "default",
  },
) as Record<string, string>;

export const sampleImages = buildSampleImages(sampleImageModules);
