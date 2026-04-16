<script lang="ts">
  import { get } from "svelte/store";
  import { onDestroy, onMount } from "svelte";
  import Header from "./lib/components/Header.svelte";
  import ImageUploader from "./lib/components/ImageUploader.svelte";
  import Workspace from "./lib/components/Workspace.svelte";
  import AboutDialog from "./lib/components/AboutDialog.svelte";
  import ToastStack from "./lib/components/ToastStack.svelte";
  import {
    appStore,
    dismissNotice,
    initialAppStore,
    pushNotice,
    setAboutOpen,
    setTheme,
  } from "./lib/stores/appStore";
  import type {
    BackendType,
    GeneratedArtifacts,
    ImageSelectionRequest,
    InferenceWorkerIncomingMessage,
    InferenceWorkerOutgoingMessage,
    SelectedImage,
  } from "./lib/types";
  import {
    composeArtifactsFromCutoutPixels,
    createInferenceBlob,
    downloadObjectUrl,
    normalizeSourceBlob,
    revokeUrl,
    stemFromFileName,
  } from "./lib/utils/imageUtils";
  import { initAnalytics, trackEvent } from "./lib/utils/analytics";

  const MODEL_TIMEOUT_MS = 180_000;
  const INFERENCE_TIMEOUT_MS = 120_000;
  const REVEAL_DURATION_MS = 720;
  const MAX_INPUT_BYTES = 100 * 1024 * 1024;

  let worker: Worker | null = null;
  let requestCounter = 0;
  let activeRequestId = 0;
  let guardTimer: number | null = null;
  let revealTimer: number | null = null;
  let mounted = false;
  let mediaQuery: MediaQueryList | null = null;

  function updateStore(patch: Partial<typeof initialAppStore>) {
    appStore.update((state) => ({ ...state, ...patch }));
  }

  function clearGuard() {
    if (guardTimer !== null) {
      window.clearTimeout(guardTimer);
      guardTimer = null;
    }
  }

  function clearRevealTimer() {
    if (revealTimer !== null) {
      window.clearTimeout(revealTimer);
      revealTimer = null;
    }
  }

  function disposeArtifacts(artifacts: GeneratedArtifacts | null) {
    if (!artifacts) {
      return;
    }
    revokeUrl(artifacts.cutoutUrl);
    revokeUrl(artifacts.maskUrl);
  }

  function disposeSelection(selection: SelectedImage | null) {
    if (!selection) {
      return;
    }
    revokeUrl(selection.originalUrl);
  }

  function cleanupImageState() {
    const state = get(appStore);
    disposeArtifacts(state.artifacts);
    disposeSelection(state.selection);
  }

  function applyTheme(theme = get(appStore).theme) {
    const root = document.documentElement;
    const resolvedTheme =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme;

    root.dataset.theme = resolvedTheme;
    root.classList.toggle("dark", resolvedTheme === "dark");
  }

  function nextRequestId() {
    requestCounter += 1;
    return requestCounter;
  }

  function startGuard(timeoutMs: number, message: string) {
    clearGuard();
    guardTimer = window.setTimeout(() => {
      hardResetWorker(message, "error");
    }, timeoutMs);
  }

  function createWorker() {
    worker?.terminate();
    worker = new Worker(
      new URL("./lib/workers/inferenceWorker.ts", import.meta.url),
      { type: "module" },
    );
    worker.onmessage = handleWorkerMessage;
    worker.onerror = () => {
      hardResetWorker("The inference worker crashed. Please retry.", "error");
    };

    updateStore({
      modelReady: false,
      modelProgress: 0,
      modelStatusText: "Preparing model…",
      backend: "unknown",
      warning: null,
    });

    const initMessage: InferenceWorkerIncomingMessage = {
      type: "init",
      requestId: 0,
    };
    worker.postMessage(initMessage);
  }

  function bootstrapWorker() {
    createWorker();
  }

  function hardResetWorker(
    message: string,
    noticeKind: "error" | "warning" = "warning",
    restart = false,
  ) {
    clearGuard();
    clearRevealTimer();
    worker?.terminate();
    worker = null;
    activeRequestId = 0;

    const state = get(appStore);
    const hasSelection = Boolean(state.selection);
    pushNotice(noticeKind, message);

    updateStore({
      appState: hasSelection ? "ready" : "idle",
      processingStage: null,
      errorMessage: noticeKind === "error" ? message : null,
      modelReady: false,
      modelProgress: 0,
      modelStatusText: "Preparing model…",
      backend: "unknown",
      warning: null,
      currentRequestId: 0,
      pendingAutoProcess: false,
    });

    if (restart) {
      bootstrapWorker();
    }
  }

  function handleBackendStatus(backend: BackendType) {
    updateStore({
      backend,
      warning:
        backend === "wasm"
          ? "Hardware acceleration is unavailable. Running on WASM fallback, so processing may be slower."
          : null,
    });
  }

  async function processSelection(selection: SelectedImage) {
    if (!worker) {
      bootstrapWorker();
    }

    const state = get(appStore);
    if (!state.modelReady) {
      updateStore({
        appState: "model_loading",
        processingStage: "loading_model",
        modelStatusText: "Loading the background-removal model…",
        pendingAutoProcess: true,
        errorMessage: null,
      });
      startGuard(
        MODEL_TIMEOUT_MS,
        "Model loading timed out. Retry when you are ready.",
      );
      return;
    }

    const requestId = nextRequestId();
    activeRequestId = requestId;

    updateStore({
      appState: "processing",
      processingStage: "running_inference",
      modelStatusText: "Running background removal…",
      pendingAutoProcess: false,
      errorMessage: null,
      currentRequestId: requestId,
    });
    startGuard(
      INFERENCE_TIMEOUT_MS,
      "Background removal timed out. The worker was reset so you can try again.",
    );

    const buffer = await selection.inferenceBlob.arrayBuffer();
    const message: InferenceWorkerIncomingMessage = {
      type: "infer",
      requestId,
      mimeType: selection.inferenceBlob.type || "image/png",
      buffer,
    };

    worker?.postMessage(message, [buffer]);
    trackEvent("processing_start", {
      source: selection.source,
      backend: state.backend,
      downscaled: selection.downscaled ? "yes" : "no",
    });
  }

  async function handleImageSelection(request: ImageSelectionRequest) {
    clearGuard();
    clearRevealTimer();

    const previousState = get(appStore);

    try {
      if (request.blob.size > MAX_INPUT_BYTES) {
        throw new Error(
          "That image is too large to process in-browser. Choose a file under 100 MB.",
        );
      }

      if (
        request.source !== "sample" &&
        !request.blob.type.startsWith("image/")
      ) {
        throw new Error(
          "Unsupported format. Use JPEG, PNG, WebP, BMP, or GIF.",
        );
      }

      const normalized = await normalizeSourceBlob(request.blob);
      const inference = await createInferenceBlob(normalized.blob);
      const selection: SelectedImage = {
        source: request.source,
        fileName: request.fileName,
        originalBlob: normalized.blob,
        originalUrl: URL.createObjectURL(normalized.blob),
        originalWidth: normalized.width,
        originalHeight: normalized.height,
        inferenceBlob: inference.blob,
        inferenceWidth: inference.width,
        inferenceHeight: inference.height,
        downscaled: inference.downscaled,
      };

      disposeArtifacts(previousState.artifacts);
      disposeSelection(previousState.selection);

      updateStore({
        selection,
        artifacts: null,
        appState: "ready",
        processingStage: null,
        errorMessage: null,
      });

      trackEvent("image_selected", {
        source: request.source,
        downscaled: selection.downscaled ? "yes" : "no",
      });

      await processSelection(selection);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to read that image.";
      updateStore({
        appState: "error",
        processingStage: null,
        errorMessage: message,
      });
      pushNotice("error", message);
      trackEvent("processing_failure", {
        stage: "input",
      });
    }
  }

  async function startProcessing() {
    const selection = get(appStore).selection;
    if (!selection) {
      return;
    }

    await processSelection(selection);
  }

  function resetWorkspace() {
    const state = get(appStore);
    const hadSelection = Boolean(state.selection);
    const hadArtifacts = Boolean(state.artifacts);

    clearGuard();
    clearRevealTimer();
    worker?.terminate();
    worker = null;
    activeRequestId = 0;

    disposeArtifacts(state.artifacts);
    disposeSelection(state.selection);

    updateStore({
      appState: "idle",
      processingStage: null,
      modelReady: false,
      modelProgress: 0,
      modelStatusText: "Preparing model…",
      backend: "unknown",
      warning: null,
      errorMessage: null,
      selection: null,
      artifacts: null,
      currentRequestId: 0,
      pendingAutoProcess: false,
      viewMode: "compare",
    });

    bootstrapWorker();

    if (hadSelection || hadArtifacts) {
      trackEvent("workspace_reset", {
        hadSelection: hadSelection ? "yes" : "no",
        hadArtifacts: hadArtifacts ? "yes" : "no",
      });
    }
  }

  function cancelProcessing() {
    const selection = get(appStore).selection;
    hardResetWorker(
      "Processing cancelled. Your image is still ready if you want to try again.",
    );
    updateStore({
      appState: selection ? "ready" : "idle",
      errorMessage: null,
    });
    trackEvent("processing_cancel", {
      hasSelection: selection ? "yes" : "no",
    });
  }

  function handleSelectionError(message: string) {
    updateStore({
      appState: get(appStore).selection ? "ready" : "idle",
      processingStage: null,
      errorMessage: message,
    });
    pushNotice("error", message);
  }

  function validateWorkerResult(
    message: Extract<InferenceWorkerOutgoingMessage, { type: "result" }>,
    selection: SelectedImage,
  ) {
    const expectedBufferLength = message.width * message.height * 4;
    if (
      !Number.isInteger(message.width) ||
      !Number.isInteger(message.height) ||
      message.width <= 0 ||
      message.height <= 0 ||
      message.width !== selection.inferenceWidth ||
      message.height !== selection.inferenceHeight ||
      message.buffer.byteLength !== expectedBufferLength
    ) {
      throw new Error("Received an invalid inference result. Please retry.");
    }
  }

  async function finalizeArtifacts(
    message: Extract<InferenceWorkerOutgoingMessage, { type: "result" }>,
  ) {
    const state = get(appStore);
    if (!state.selection || message.requestId !== activeRequestId) {
      return;
    }

    validateWorkerResult(message, state.selection);

    clearGuard();
    updateStore({
      processingStage: "compositing",
      modelStatusText: "Compositing the full-resolution export…",
    });

    const cutoutPixels = new Uint8ClampedArray(message.buffer);
    const artifacts = await composeArtifactsFromCutoutPixels({
      originalBlob: state.selection.originalBlob,
      originalWidth: state.selection.originalWidth,
      originalHeight: state.selection.originalHeight,
      cutoutPixels,
      cutoutWidth: message.width,
      cutoutHeight: message.height,
      fileStem: stemFromFileName(state.selection.fileName),
    });

    disposeArtifacts(state.artifacts);
    handleBackendStatus(message.backend);

    updateStore({
      artifacts,
      appState: "processing",
      processingStage: "revealing",
      modelStatusText: "Revealing your cutout…",
    });

    trackEvent("processing_success", {
      backend: message.backend,
      downscaled: state.selection.downscaled ? "yes" : "no",
    });

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    revealTimer = window.setTimeout(
      () => {
        updateStore({
          appState: "completed",
          processingStage: null,
        });
      },
      prefersReducedMotion ? 0 : REVEAL_DURATION_MS,
    );
  }

  async function handleWorkerMessage(
    event: MessageEvent<InferenceWorkerOutgoingMessage>,
  ) {
    const message = event.data;

    switch (message.type) {
      case "worker_ready": {
        handleBackendStatus(message.backend);
        break;
      }

      case "model_progress": {
        const progress = Math.max(
          0,
          Math.min(100, Math.round(message.progress)),
        );
        updateStore({
          modelProgress: progress,
          modelStatusText: message.label,
        });
        break;
      }

      case "model_loaded": {
        clearGuard();
        handleBackendStatus(message.backend);
        updateStore({
          modelReady: true,
          modelProgress: 100,
          modelStatusText: "Model ready.",
        });

        if (get(appStore).pendingAutoProcess && get(appStore).selection) {
          await processSelection(get(appStore).selection!);
        }
        break;
      }

      case "status": {
        updateStore({
          modelStatusText: message.label,
        });
        break;
      }

      case "result": {
        try {
          await finalizeArtifacts(message);
        } catch (error) {
          const failureMessage =
            error instanceof Error
              ? error.message
              : "Unable to compose the processed image. Please retry.";
          hardResetWorker(failureMessage, "error");
          trackEvent("processing_failure", {
            stage: "infer",
            backend: get(appStore).backend,
          });
        }
        break;
      }

      case "cancelled": {
        hardResetWorker("The running job was cancelled.");
        break;
      }

      case "error": {
        if (message.stage === "init") {
          hardResetWorker(message.message, "error");
          trackEvent("processing_failure", {
            stage: message.stage,
            backend: get(appStore).backend,
          });
          break;
        }

        clearGuard();
        const state = get(appStore);
        pushNotice("error", message.message);
        updateStore({
          appState: state.selection ? "error" : "idle",
          processingStage: null,
          errorMessage: message.message,
          pendingAutoProcess: false,
        });
        trackEvent("processing_failure", {
          stage: message.stage,
          backend: state.backend,
        });
        break;
      }
    }
  }

  function handleDownload(kind: "cutout" | "mask") {
    const state = get(appStore);
    if (!state.selection || !state.artifacts) {
      return;
    }

    const fileStem = stemFromFileName(state.selection.fileName);
    const target =
      kind === "cutout" ? state.artifacts.cutoutUrl : state.artifacts.maskUrl;
    const fileName =
      kind === "cutout" ? `${fileStem}_removed.png` : `${fileStem}_mask.png`;
    downloadObjectUrl(target, fileName);
    pushNotice("success", `Downloaded ${fileName}.`);
    trackEvent(kind === "cutout" ? "download_cutout" : "download_mask", {
      backend: state.backend,
    });
  }

  onMount(() => {
    mounted = true;
    initAnalytics(import.meta.env.VITE_PLAUSIBLE_DOMAIN);
    mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleMediaChange = () => {
      if (get(appStore).theme === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleMediaChange);
    const unsubscribe = appStore.subscribe((state) => {
      if (mounted) {
        applyTheme(state.theme);
      }
    });

    bootstrapWorker();
    applyTheme();

    return () => {
      mounted = false;
      mediaQuery?.removeEventListener("change", handleMediaChange);
      unsubscribe();
    };
  });

  onDestroy(() => {
    clearGuard();
    clearRevealTimer();
    worker?.terminate();
    cleanupImageState();
  });
</script>

<svelte:head>
  <title>Image Background Remover</title>
  <meta
    name="description"
    content="Remove image backgrounds privately in your browser with a client-side ML pipeline powered by Transformers.js."
  />
</svelte:head>

<div class="app-shell">
  <div class="ambient ambient-one"></div>
  <div class="ambient ambient-two"></div>

  <Header onOpenAbout={() => setAboutOpen(true)} />

  <main class="page-grid">
    <section class="hero-panel">
      <div class="hero-copy">
        <p class="eyebrow">Private. Browser-native. No upload queue.</p>
        <h2>Simple image background removal in your browser.</h2>
        <p class="lede">
          Drop a photo, paste from your clipboard, or test a bundled sample. The
          app runs the model on-device, keeps the original resolution for
          export, and falls back cleanly when hardware acceleration is missing.
        </p>
      </div>
      <div class="hero-metrics" aria-label="Workflow summary">
        <article>
          <span>Input</span>
          <strong>Drag, paste, sample</strong>
        </article>
        <article>
          <span>Processing</span>
          <strong>Worker + Transformers.js</strong>
        </article>
        <article>
          <span>Export</span>
          <strong>Transparent PNG + mask</strong>
        </article>
      </div>
    </section>

    <ImageUploader
      disabled={$appStore.appState === "model_loading" ||
        $appStore.appState === "processing"}
      onError={handleSelectionError}
      onSelect={handleImageSelection}
    />

    <Workspace
      onReset={resetWorkspace}
      onStartProcessing={startProcessing}
      onCancel={cancelProcessing}
      onDownload={handleDownload}
    />
  </main>

  <footer class="page-footer">
    <p>
      Large images are inferred at a bounded size for memory safety, then
      composited back to the original dimensions.
    </p>
  </footer>
</div>

<AboutDialog
  open={$appStore.aboutOpen}
  backend={$appStore.backend}
  onClose={() => setAboutOpen(false)}
/>
<ToastStack notices={$appStore.notices} onDismiss={dismissNotice} />
