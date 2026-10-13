/// <reference types="vite/client" />

/* The one build-time switch this app has: VITE_WX_DEMO=1 builds a static preview that never calls the
   API. Declared here so `import.meta.env.VITE_WX_DEMO` typechecks without turning the whole app into a
   vite-typed module (the prototype runs under vite, but its lib/ files are plain TypeScript). */
interface ImportMetaEnv {
  readonly VITE_WX_DEMO?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
