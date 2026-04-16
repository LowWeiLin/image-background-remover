export type AppState =
  | "idle"
  | "ready"
  | "model_loading"
  | "processing"
  | "completed"
  | "error";

export type ThemeMode = "system" | "light" | "dark";

export type ViewMode = "compare" | "original" | "mask";

export type BackendType = "webgpu" | "wasm" | "unknown";

export type NoticeKind = "error" | "success" | "warning";

export type ProcessingStage =
  | "loading_model"
  | "running_inference"
  | "compositing"
  | "revealing"
  | null;

export type ImageSourceKind = "upload" | "drop" | "paste" | "sample";

export interface ToastNotice {
  id: number;
  kind: NoticeKind;
  message: string;
}

export interface ImageSelectionRequest {
  blob: Blob;
  fileName: string;
  source: ImageSourceKind;
}

export interface SelectedImage {
  source: ImageSourceKind;
  fileName: string;
  originalBlob: Blob;
  originalUrl: string;
  originalWidth: number;
  originalHeight: number;
  inferenceBlob: Blob;
  inferenceWidth: number;
  inferenceHeight: number;
  downscaled: boolean;
}

export interface GeneratedArtifacts {
  cutoutBlob: Blob;
  cutoutUrl: string;
  maskBlob: Blob;
  maskUrl: string;
  fileStem: string;
}

export interface AppStoreState {
  appState: AppState;
  processingStage: ProcessingStage;
  theme: ThemeMode;
  viewMode: ViewMode;
  modelReady: boolean;
  modelProgress: number;
  modelStatusText: string;
  backend: BackendType;
  warning: string | null;
  errorMessage: string | null;
  selection: SelectedImage | null;
  artifacts: GeneratedArtifacts | null;
  aboutOpen: boolean;
  notices: ToastNotice[];
  currentRequestId: number;
  pendingAutoProcess: boolean;
}

export type InferenceWorkerIncomingMessage =
  | {
      type: "init";
      requestId: number;
    }
  | {
      type: "infer";
      requestId: number;
      mimeType: string;
      buffer: ArrayBuffer;
    };

export type InferenceWorkerOutgoingMessage =
  | {
      type: "worker_ready";
      backend: BackendType;
    }
  | {
      type: "model_progress";
      requestId: number;
      progress: number;
      label: string;
    }
  | {
      type: "model_loaded";
      requestId: number;
      backend: BackendType;
    }
  | {
      type: "status";
      requestId: number;
      label: string;
    }
  | {
      type: "result";
      requestId: number;
      backend: BackendType;
      width: number;
      height: number;
      buffer: ArrayBuffer;
    }
  | {
      type: "cancelled";
      requestId: number;
    }
  | {
      type: "error";
      requestId: number;
      stage: "init" | "infer";
      message: string;
    };
