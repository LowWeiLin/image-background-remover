import type { GeneratedArtifacts } from "../types";

const MAX_INFERENCE_EDGE = 2048;
const CANVAS_TO_BLOB_TIMEOUT_MS = 30_000;

function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = "image/png",
  quality?: number,
) {
  return new Promise<Blob>((resolve, reject) => {
    let settled = false;
    const timeout = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(
          new Error(
            "Encoding the image took too long. Please try a smaller file.",
          ),
        );
      }
    }, CANVAS_TO_BLOB_TIMEOUT_MS);

    canvas.toBlob(
      (blob) => {
        if (settled) {
          return;
        }

        settled = true;
        window.clearTimeout(timeout);
        if (!blob) {
          reject(new Error("Unable to encode image data."));
          return;
        }

        resolve(blob);
      },
      type,
      quality,
    );
  });
}

async function createBitmap(blob: Blob) {
  return createImageBitmap(blob, {
    imageOrientation: "from-image",
  } as ImageBitmapOptions);
}

export function revokeUrl(url?: string | null) {
  if (url) {
    URL.revokeObjectURL(url);
  }
}

export function stemFromFileName(fileName: string) {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot > 0 ? fileName.slice(0, lastDot) : fileName || "image";
}

export async function normalizeSourceBlob(blob: Blob) {
  const bitmap = await createBitmap(blob);
  try {
    const canvas = createCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d", { alpha: true });

    if (!context) {
      throw new Error("Canvas 2D is not available in this browser.");
    }

    context.drawImage(bitmap, 0, 0);

    const normalizedBlob = await canvasToBlob(canvas, "image/png");
    return {
      blob: normalizedBlob,
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    bitmap.close();
  }
}

export async function createInferenceBlob(
  blob: Blob,
  maxEdge = MAX_INFERENCE_EDGE,
) {
  const bitmap = await createBitmap(blob);
  try {
    const longestEdge = Math.max(bitmap.width, bitmap.height);

    if (longestEdge <= maxEdge) {
      return {
        blob,
        width: bitmap.width,
        height: bitmap.height,
        downscaled: false,
      };
    }

    const scale = maxEdge / longestEdge;
    const targetWidth = Math.max(1, Math.round(bitmap.width * scale));
    const targetHeight = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = createCanvas(targetWidth, targetHeight);
    const context = canvas.getContext("2d", { alpha: true });

    if (!context) {
      throw new Error("Canvas 2D is not available in this browser.");
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

    const inferenceBlob = await canvasToBlob(canvas, "image/png");
    return {
      blob: inferenceBlob,
      width: targetWidth,
      height: targetHeight,
      downscaled: true,
    };
  } finally {
    bitmap.close();
  }
}

function maskCanvasFromCutoutPixels(
  cutoutPixels: Uint8ClampedArray,
  width: number,
  height: number,
) {
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d", {
    alpha: false,
    willReadFrequently: true,
  });

  if (!context) {
    throw new Error("Canvas 2D is not available in this browser.");
  }

  const imageData = context.createImageData(width, height);
  for (let index = 0; index < cutoutPixels.length; index += 4) {
    const alpha = cutoutPixels[index + 3];
    imageData.data[index] = alpha;
    imageData.data[index + 1] = alpha;
    imageData.data[index + 2] = alpha;
    imageData.data[index + 3] = 255;
  }

  context.putImageData(imageData, 0, 0);
  return canvas;
}

function upscaleMask(
  maskCanvas: HTMLCanvasElement,
  width: number,
  height: number,
) {
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d", {
    alpha: false,
    willReadFrequently: true,
  });

  if (!context) {
    throw new Error("Canvas 2D is not available in this browser.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(maskCanvas, 0, 0, width, height);
  return canvas;
}

export function downloadObjectUrl(url: string, fileName: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export async function composeArtifactsFromCutoutPixels({
  originalBlob,
  originalWidth,
  originalHeight,
  cutoutPixels,
  cutoutWidth,
  cutoutHeight,
  fileStem,
}: {
  originalBlob: Blob;
  originalWidth: number;
  originalHeight: number;
  cutoutPixels: Uint8ClampedArray;
  cutoutWidth: number;
  cutoutHeight: number;
  fileStem: string;
}): Promise<GeneratedArtifacts> {
  const originalBitmap = await createBitmap(originalBlob);
  try {
    const compositeCanvas = createCanvas(originalWidth, originalHeight);
    const compositeContext = compositeCanvas.getContext("2d", {
      alpha: true,
      willReadFrequently: true,
    });

    if (!compositeContext) {
      throw new Error("Canvas 2D is not available in this browser.");
    }

    compositeContext.drawImage(
      originalBitmap,
      0,
      0,
      originalWidth,
      originalHeight,
    );

    const originalImage = compositeContext.getImageData(
      0,
      0,
      originalWidth,
      originalHeight,
    );
    const maskCanvas = maskCanvasFromCutoutPixels(
      cutoutPixels,
      cutoutWidth,
      cutoutHeight,
    );
    const upscaledMaskCanvas = upscaleMask(
      maskCanvas,
      originalWidth,
      originalHeight,
    );
    const maskContext = upscaledMaskCanvas.getContext("2d", {
      alpha: false,
      willReadFrequently: true,
    });

    if (!maskContext) {
      throw new Error("Canvas 2D is not available in this browser.");
    }

    const maskImage = maskContext.getImageData(
      0,
      0,
      originalWidth,
      originalHeight,
    );
    for (let index = 0; index < originalImage.data.length; index += 4) {
      originalImage.data[index + 3] = maskImage.data[index];
    }
    compositeContext.putImageData(originalImage, 0, 0);

    const cutoutBlob = await canvasToBlob(compositeCanvas, "image/png");
    const maskBlob = await canvasToBlob(upscaledMaskCanvas, "image/png");
    return {
      cutoutBlob,
      cutoutUrl: URL.createObjectURL(cutoutBlob),
      maskBlob,
      maskUrl: URL.createObjectURL(maskBlob),
      fileStem,
    };
  } finally {
    originalBitmap.close();
  }
}
