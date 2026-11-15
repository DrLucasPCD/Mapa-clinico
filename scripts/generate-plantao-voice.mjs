import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const [python, model] = process.argv.slice(2);
if (!python || !model) {
  throw new Error(
    'Uso: node scripts/generate-plantao-voice.mjs <python> <model.onnx>',
  );
}

const root = fileURLToPath(new URL('../', import.meta.url));
const server = await createServer({
  root,
  configFile: false,
  logLevel: 'silent',
  server: { middlewareMode: true, watch: null, ws: false },
});
let lines;
try {
  const { plantaoVoiceLines } = await server.ssrLoadModule(
    '/app/plantao-voice.ts',
  );
  lines = plantaoVoiceLines();
} finally {
  await server.close();
}

const result = spawnSync(
  python,
  [
    fileURLToPath(new URL('./synthesize-plantao-voice.py', import.meta.url)),
    model,
  ],
  {
    input: JSON.stringify(lines),
    stdio: ['pipe', 'inherit', 'inherit'],
  },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
