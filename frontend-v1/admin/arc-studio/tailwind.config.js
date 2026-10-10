/* ============================================================================
   WOODEX ADMIN V2.1 + ARC.STUDIO — Tailwind source configuration
   ----------------------------------------------------------------------------
   Build (one time, local — no CDN, no runtime tooling):
     npx tailwindcss@3.4.17 -c tailwind.config.js -i src/input.css -o assets/arc-kit.css --minify
   The compiled sheet is committed at assets/arc-kit.css so the kit runs offline
   and on plain Hostinger hosting with no build step at deploy time.
   ========================================================================== */
module.exports = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./index.html", "./blocks.html", "./shell-reference.html", "./modules/**/*.html", "./assets/**/*.js"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "Liberation Mono", "monospace"],
      },
      letterSpacing: { widest: "0.14em" },
      fontSize: {
        "2xs": ["10px", { lineHeight: "16px" }],
        "3xs": ["9px", { lineHeight: "14px" }],
      },
      maxWidth: { canvas: "1600px" },
      boxShadow: {
        panel: "0 1px 2px 0 rgb(12 10 9 / 0.04), 0 1px 3px 0 rgb(12 10 9 / 0.06)",
        lift: "0 8px 24px -12px rgb(12 10 9 / 0.35)",
      },
      keyframes: {
        "arc-pulse": { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.35" } },
        "arc-slide-in": { from: { transform: "translateX(24px)", opacity: "0" }, to: { transform: "translateX(0)", opacity: "1" } },
      },
      animation: { "arc-pulse": "arc-pulse 1.8s ease-in-out infinite", "arc-slide-in": "arc-slide-in .18s ease-out" },
    },
  },
  plugins: [],
};
