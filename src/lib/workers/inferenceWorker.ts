/// <reference lib="webworker" />

import { env, pipeline } from "@huggingface/transformers";
import type {
  BackgroundRemovalPipeline,
  RawImage,
} from "@huggingface/transformers";
import type {
  BackendType,
  InferenceWorkerIncomingMessage,
  InferenceWorkerOutgoingMessage,
} from "../types";

const workerScope = self as DedicatedWorkerGlobalScope;
const MODEL_TIMEOUT_MS = 180_000;
const INFERENCE_TIMEOUT_MS = 120_000;

env.allowLocalModels = false;
env.allowRemoteModels = true;
if (env.backends.onnx?.wasm) {
  env.backends.onnx.wasm.proxy = false;
}

let backgroundRemovalPipeline: BackgroundRemovalPipeline | null = null;
let pipelinePromise: Promise<BackgroundRemovalPipeline> | null = null;
let activeRequestId = 0;
let resolvedBackend: BackendType = "unknown";

function post(
  message: InferenceWorkerOutgoingMessage,
  transfer?: Transferable[],
) {
  workerScope.postMessage(message, transfer ?? []);
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
) {
  return Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);
}

function progressLabel(data: { status?: string; file?: string }) {
  if (data.status === "download" || data.status === "progress") {
    return data.file
      ? `Downloading ${data.file}…`
      : "Downloading model assets…";
  }

  if (data.status === "done") {
    return "Finalizing model assets…";
  }

  return "Preparing model…";
}

async function loadPipeline(requestId: number) {
  if (backgroundRemovalPipeline) {
    return backgroundRemovalPipeline;
  }

  if (pipelinePromise) {
    return pipelinePromise;
  }

  const hasWebGPU = "gpu" in self.navigator;
  const preferredDevice: "webgpu" | "wasm" = hasWebGPU ? "webgpu" : "wasm";

  pipelinePromise = (async () => {
    const progress_callback = (data: {
      progress?: number;
      loaded?: number;
      total?: number;
      status?: string;
      file?: string;
    }) => {
      const progress =
        typeof data.progress === "number"
          ? data.progress
          : data.loaded && data.total
            ? (data.loaded / data.total) * 100
            : 0;

      post({
        type: "model_progress",
        requestId,
        progress,
        label: progressLabel(data),
      });
    };

    try {
      const loadedPipeline = await withTimeout(
        pipeline("background-removal", "Xenova/modnet", {
          device: preferredDevice,
          dtype: "fp32",
          progress_callback,
        }) as Promise<BackgroundRemovalPipeline>,
        MODEL_TIMEOUT_MS,
        "Model loading timed out in the worker.",
      );

      backgroundRemovalPipeline = loadedPipeline;
      resolvedBackend = preferredDevice;
      post({ type: "worker_ready", backend: resolvedBackend });
      post({ type: "model_loaded", requestId, backend: resolvedBackend });
      return loadedPipeline;
    } catch (primaryError) {
      if (preferredDevice !== "webgpu") {
        pipelinePromise = null;
        throw primaryError instanceof Error
          ? primaryError
          : new Error("Unable to initialize the background-removal model.");
      }

      try {
        const loadedPipeline = await withTimeout(
          pipeline("background-removal", "Xenova/modnet", {
            device: "wasm",
            dtype: "fp32",
            progress_callback,
          }) as Promise<BackgroundRemovalPipeline>,
          MODEL_TIMEOUT_MS,
          "Model loading timed out in the worker.",
        );

        backgroundRemovalPipeline = loadedPipeline;
        resolvedBackend = "wasm";
        post({ type: "worker_ready", backend: resolvedBackend });
        post({ type: "model_loaded", requestId, backend: resolvedBackend });
        return loadedPipeline;
      } catch (fallbackError) {
        pipelinePromise = null;
        throw fallbackError instanceof Error
          ? fallbackError
          : new Error("Unable to initialize the background-removal model.");
      }
    }
  })();

  return pipelinePromise;
}

workerScope.onmessage = async (
  event: MessageEvent<InferenceWorkerIncomingMessage>,
) => {
  const message = event.data;

  if (message.type === "init") {
    try {
      await loadPipeline(message.requestId);
    } catch (error) {
      post({
        type: "error",
        requestId: message.requestId,
        stage: "init",
        message:
          error instanceof Error
            ? error.message
            : "Unable to initialize the model.",
      });
    }
    return;
  }

  if (message.type !== "infer") {
    return;
  }

  activeRequestId = message.requestId;

  try {
    const segmenter = await loadPipeline(message.requestId);
    if (activeRequestId !== message.requestId) {
      post({ type: "cancelled", requestId: message.requestId });
      return;
    }

    post({
      type: "status",
      requestId: message.requestId,
      label: "Running inference on the selected image…",
    });

    const blob = new Blob([message.buffer], { type: message.mimeType });
    const result = (await withTimeout(
      segmenter(blob),
      INFERENCE_TIMEOUT_MS,
      "Inference timed out in the worker.",
    )) as RawImage;
    if (activeRequestId !== message.requestId) {
      post({ type: "cancelled", requestId: message.requestId });
      return;
    }

    const rgbaPixels =
      result.data instanceof Uint8ClampedArray
        ? result.data
        : new Uint8ClampedArray(result.data);
    const transferablePixels = new Uint8ClampedArray(rgbaPixels);
    const buffer = transferablePixels.buffer as ArrayBuffer;

    post(
      {
        type: "result",
        requestId: message.requestId,
        backend: resolvedBackend,
        width: result.width,
        height: result.height,
        buffer,
      },
      [buffer],
    );
  } catch (error) {
    post({
      type: "error",
      requestId: message.requestId,
      stage: "infer",
      message:
        error instanceof Error ? error.message : "Background removal failed.",
    });
  }
};
