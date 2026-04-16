import { writable } from "svelte/store";
import type { AppStoreState, NoticeKind, ThemeMode, ViewMode } from "../types";

const noticeTimers = new Map<number, ReturnType<typeof setTimeout>>();

const themeFromStorage = (() => {
  if (typeof window === "undefined") {
    return "system" satisfies ThemeMode;
  }

  try {
    const stored = window.localStorage.getItem("theme");
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored satisfies ThemeMode;
    }
  } catch {
    return "system" satisfies ThemeMode;
  }

  return "system" satisfies ThemeMode;
})();

export const initialAppStore: AppStoreState = {
  appState: "idle",
  processingStage: null,
  theme: themeFromStorage,
  viewMode: "compare",
  modelReady: false,
  modelProgress: 0,
  modelStatusText: "Preparing model…",
  backend: "unknown",
  warning: null,
  errorMessage: null,
  selection: null,
  artifacts: null,
  aboutOpen: false,
  notices: [],
  currentRequestId: 0,
  pendingAutoProcess: false,
};

export const appStore = writable<AppStoreState>(initialAppStore);

export function pushNotice(kind: NoticeKind, message: string) {
  const id = Date.now() + Math.round(Math.random() * 1000);
  appStore.update((state) => ({
    ...state,
    notices: [...state.notices, { id, kind, message }],
  }));

  const timer = setTimeout(() => {
    dismissNotice(id);
  }, 6000);
  noticeTimers.set(id, timer);

  return id;
}

export function dismissNotice(id: number) {
  const timer = noticeTimers.get(id);
  if (timer) {
    clearTimeout(timer);
    noticeTimers.delete(id);
  }

  appStore.update((state) => ({
    ...state,
    notices: state.notices.filter((notice) => notice.id !== id),
  }));
}

export function setTheme(theme: ThemeMode) {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem("theme", theme);
    } catch {
      // Ignore storage failures and keep the in-memory theme.
    }
  }

  appStore.update((state) => ({
    ...state,
    theme,
  }));
}

export function setViewMode(viewMode: ViewMode) {
  appStore.update((state) => ({
    ...state,
    viewMode,
  }));
}

export function setAboutOpen(aboutOpen: boolean) {
  appStore.update((state) => ({
    ...state,
    aboutOpen,
  }));
}
