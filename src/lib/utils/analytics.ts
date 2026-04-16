declare global {
  interface Window {
    plausible?: (
      eventName: string,
      options?: { props?: Record<string, string> },
    ) => void;
  }
}

let analyticsReady = false;

export function initAnalytics(domain?: string) {
  if (!domain || analyticsReady || typeof document === "undefined") {
    return;
  }

  const existing = document.querySelector<HTMLScriptElement>(
    "script[data-plausible]",
  );
  if (existing) {
    analyticsReady = true;
    return;
  }

  const script = document.createElement("script");
  script.defer = true;
  script.dataset.plausible = "true";
  script.dataset.domain = domain;
  script.src = "https://plausible.io/js/script.js";
  document.head.appendChild(script);
  analyticsReady = true;
}

export function trackEvent(name: string, props?: Record<string, string>) {
  if (typeof window === "undefined" || typeof window.plausible !== "function") {
    return;
  }

  window.plausible(name, props ? { props } : undefined);
}
