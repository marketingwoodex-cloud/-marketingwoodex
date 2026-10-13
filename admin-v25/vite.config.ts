import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The sandbox serves the dev server through a proxied preview host, so every
// hostname must be allowed and the server must bind 0.0.0.0.
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: false,
    allowedHosts: true, // preview is proxied under *.e2b.app
    cors: true,
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
