import * as ort from 'onnxruntime-web/wasm';
import createPhonemizer from '@diffusionstudio/piper-wasm/build/piper_phonemize.js';
import phonemeWasm from '@diffusionstudio/piper-wasm/build/piper_phonemize.wasm?url';
import phonemeData from '@diffusionstudio/piper-wasm/build/piper_phonemize.data?url';
import ortWasm from '../node_modules/onnxruntime-web/dist/ort-wasm-simd.wasm?url';

const modelBase =
  'https://huggingface.co/Trelis/piper-pt-br-faber-medium/resolve/0ac9b61ff8e1d9c2a7eaf0e32602c16f6b491a02/';
type Config = {
  audio: { sample_rate: number };
  espeak: { voice: string };
  inference: { noise_scale: number; length_scale: number; noise_w: number };
  num_speakers: number;
};
let session: ort.InferenceSession;
let phonemizer: Awaited<ReturnType<typeof createPhonemizer>>;
let config: Config;
let phonemes: number[] = [];
let queue = Promise.resolve();

async function modelFile(file: string) {
  const url = modelBase + file;
  let cache: Cache | undefined;
  try {
    cache = await caches.open('patient-faber-v1');
  } catch {
    /* Cache may be disabled. */
  }
  const stored = await cache?.match(url);
  if (stored) return stored;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Falha ao baixar a voz Faber');
  if (file.endsWith('.json')) {
    try {
      await cache?.put(url, response.clone());
    } catch {
      /* Cache is optional. */
    }
    return response;
  }
  const length = Number(response.headers.get('content-length'));
  const reader = response.body?.getReader();
  if (!reader) return response;
  let loaded = 0;
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    self.postMessage({
      type: 'progress',
      progress: length ? Math.min(0.9, (loaded / length) * 0.9) : 0,
    });
  }
  const result = new Response(new Blob(chunks), {
    headers: { 'Content-Type': 'application/octet-stream' },
  });
  try {
    await cache?.put(url, result.clone());
  } catch {
    /* Inference works without persistent storage. */
  }
  return result;
}

async function initialize() {
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  ort.env.wasm.wasmPaths = { 'ort-wasm-simd.wasm': ortWasm };
  config = await (await modelFile('model.onnx.json')).json();
  const model = await (await modelFile('model.onnx')).arrayBuffer();
  session = await ort.InferenceSession.create(model, {
    executionProviders: ['wasm'],
  });
  phonemizer = await createPhonemizer({
    noInitialRun: true,
    noExitRuntime: true,
    locateFile: (path) =>
      path.endsWith('.data')
        ? phonemeData
        : path.endsWith('.wasm')
          ? phonemeWasm
          : path,
    print: (text) => {
      phonemes = JSON.parse(text).phoneme_ids;
    },
    printErr: () => {},
  });
}

function wav(samples: Float32Array, rate: number) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const tag = (offset: number, text: string) =>
    text
      .split('')
      .forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
  tag(0, 'RIFF');
  view.setUint32(4, buffer.byteLength - 8, true);
  tag(8, 'WAVE');
  tag(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  tag(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, sample * (sample < 0 ? 32768 : 32767), true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

async function speak(text: string) {
  if (!session || !text.trim() || text.length > 900)
    throw new Error('Voz não preparada');
  // Keep Piper inputs small. This also avoids a long silent wait for a whole paragraph.
  const chunks = text.match(/[^.!?]+[.!?]*/g) ?? [text];
  const output: Float32Array[] = [];
  for (const chunk of chunks) {
    phonemes = [];
    phonemizer.callMain([
      '-l',
      config.espeak.voice,
      '--input',
      JSON.stringify([{ text: chunk }]),
      '--espeak_data',
      '/espeak-ng-data',
    ]);
    if (!phonemes.length) throw new Error('Não foi possível preparar a fala');
    const inference = config.inference;
    const feeds: Record<string, ort.Tensor> = {
      input: new ort.Tensor('int64', BigInt64Array.from(phonemes, BigInt), [
        1,
        phonemes.length,
      ]),
      input_lengths: new ort.Tensor(
        'int64',
        BigInt64Array.from([BigInt(phonemes.length)]),
        [1],
      ),
      scales: new ort.Tensor(
        'float32',
        Float32Array.from([
          inference.noise_scale,
          inference.length_scale,
          inference.noise_w,
        ]),
        [3],
      ),
    };
    if (config.num_speakers > 1)
      feeds.sid = new ort.Tensor('int64', BigInt64Array.from([0n]), [1]);
    const result = await session.run(feeds);
    output.push(Float32Array.from(result.output.data as Float32Array));
  }
  const merged = new Float32Array(
    output.reduce((sum, pcm) => sum + pcm.length, 0),
  );
  let offset = 0;
  for (const pcm of output) {
    merged.set(pcm, offset);
    offset += pcm.length;
  }
  return wav(merged, config.audio.sample_rate);
}

self.onmessage = ({
  data,
}: MessageEvent<{ id: number; type: 'load' | 'speak'; text?: string }>) => {
  queue = queue.then(async () => {
    try {
      if (data.type === 'load') {
        await initialize();
        self.postMessage({ id: data.id, type: 'ready' });
      } else
        self.postMessage({
          id: data.id,
          type: 'audio',
          audio: await speak(data.text ?? ''),
        });
    } catch {
      self.postMessage({ id: data.id, type: 'error' });
    }
  });
};
