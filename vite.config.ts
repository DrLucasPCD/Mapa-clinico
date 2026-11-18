import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  css: { postcss: { plugins: [tailwindcss()] } },
  // These imports are first discovered when a user activates an optional worker.
  // Pre-bundle them together so loading one worker cannot invalidate the other.
  optimizeDeps: {
    include: [
      '@huggingface/tokenizers',
      'onnxruntime-web/wasm',
      '@diffusionstudio/piper-wasm/build/piper_phonemize.js',
    ],
  },
  build: { chunkSizeWarningLimit: 1500 },
});
