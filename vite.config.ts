import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { svelteTesting } from "@testing-library/svelte/vite";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

const repoName = "image-background-remover";

export default defineConfig(({ mode }) => {
  const isProd = mode === "production";
  const base = isProd ? `/${repoName}/` : "/";

  return {
    base,
    build: {
      outDir: "docs",
    },
    test: {
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
      css: true,
    },
    plugins: [
      tailwindcss(),
      svelte(),
      svelteTesting(),
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: "auto",
        includeAssets: ["brand-mark.svg"],
        manifest: {
          name: "Image Background Remover",
          short_name: "BG Remover",
          description:
            "Private in-browser image background removal powered by Transformers.js.",
          theme_color: "#e86737",
          background_color: "#f6efe6",
          display: "standalone",
          start_url: "./",
          icons: [
            {
              src: "brand-mark.svg",
              sizes: "any",
              type: "image/svg+xml",
              purpose: "any",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,woff2}"],
          navigateFallback: "index.html",
          runtimeCaching: [
            {
              urlPattern: ({ sameOrigin }) => sameOrigin,
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "app-runtime",
                cacheableResponse: {
                  statuses: [0, 200],
                },
                expiration: {
                  maxEntries: 64,
                  maxAgeSeconds: 60 * 60 * 24 * 7,
                },
              },
            },
          ],
        },
      }),
    ],
  };
});
