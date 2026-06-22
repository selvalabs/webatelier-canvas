import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/main.ts"),
      name: "WebDesignAIEditorRuntime",
      formats: ["iife"],
      fileName: () => "editor-runtime.js"
    },
    outDir: resolve(__dirname, "../src/webdesign_ai_editor/static"),
    emptyOutDir: false,
    minify: "esbuild",
    sourcemap: true,
    target: "es2020"
  }
});
