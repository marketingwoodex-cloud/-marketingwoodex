import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/* The dev server is proxied under *.e2b.app (and under any hostname a preview uses), so hosts are open
   and it binds 0.0.0.0.

   `/api` is proxied rather than called cross-origin, and that is the point rather than a convenience:
   api/v2 is same-origin by design — no CORS headers at all, a session cookie with SameSite, and a CSRF
   token tied to the cookie. A cross-origin dev server would have to weaken all three to work, and the
   one thing a prototype must not do is behave differently from production in its *security* code. The
   target is configurable so the same app can develop against a local PHP host or a staging one:

     WX_API_TARGET=http://127.0.0.1:8080 npm run dev      (php -S 127.0.0.1:8080 on the repo root)
     WX_API_TARGET=https://woodex.com.pk npm run dev     (the live host, read-only work)
*/
/* `process` exists in this file (vite loads it in Node) but @types/node is not a dependency of a
   browser app — declaring the one member used is cheaper than adding 2 MB of Node typings for it. */
declare const process: { env: Record<string, string | undefined> };
const API_TARGET = process.env.WX_API_TARGET ?? "http://127.0.0.1:8080";

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: false,
    allowedHosts: true, // preview is proxied under *.e2b.app
    cors: true,
    proxy: {
      "/api": { target: API_TARGET, changeOrigin: false, secure: false },
      /* The media library shows pictures at the addresses the pages use (`/assets/img/…`). They are
         served by the same host in production, and by the dev PHP server (its document root is the
         repository root) in development — so proxying them is what makes the library look the same in
         both. Without it a designer reviews the media screen as a wall of broken images. */
      "/assets": { target: API_TARGET, changeOrigin: false, secure: false },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
    allowedHosts: true,
  },
  build: {
    target: "es2020",
    sourcemap: true,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Vendor split for the browser build; the SSR/smoke build keeps its
        // dependencies external, so manualChunks must not apply there.
        manualChunks: isSsrBuild
          ? undefined
          : {
              vendor: ["react", "react-dom", "react-router-dom"],
              charts: ["recharts"],
              icons: ["lucide-react"],
            },
      },
    },
  },
}));
