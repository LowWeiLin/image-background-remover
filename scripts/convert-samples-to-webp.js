#!/usr/bin/env node
// Converts all PNG/JPG/JPEG images in src/assets/samples/ to WebP in-place,
// replacing the originals and removing the source files when the extension changes.

import sharp from "sharp";
import { readdir, unlink } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const SAMPLES_DIR = join(
  fileURLToPath(import.meta.url),
  "../../src/assets/samples",
);

const CONVERTIBLE = new Set([".png", ".jpg", ".jpeg"]);

const files = await readdir(SAMPLES_DIR);
const targets = files.filter((f) => CONVERTIBLE.has(extname(f).toLowerCase()));

if (targets.length === 0) {
  console.log("No convertible images found – nothing to do.");
  process.exit(0);
}

for (const file of targets) {
  const src = join(SAMPLES_DIR, file);
  const stem = basename(file, extname(file));
  const dest = join(SAMPLES_DIR, `${stem}.webp`);

  await sharp(src).webp({ quality: 85, effort: 6 }).toFile(dest);

  const { size: srcBytes } = await import("node:fs").then((m) =>
    m.promises.stat(src),
  );
  const { size: destBytes } = await import("node:fs").then((m) =>
    m.promises.stat(dest),
  );
  const saved = (((srcBytes - destBytes) / srcBytes) * 100).toFixed(1);

  console.log(
    `  ${file} → ${stem}.webp  (${(srcBytes / 1024).toFixed(0)} KB → ${(destBytes / 1024).toFixed(0)} KB, -${saved}%)`,
  );

  if (src !== dest) {
    await unlink(src);
  }
}

console.log(`\nConverted ${targets.length} image(s) to WebP.`);
