import { Tokenizer } from '@huggingface/tokenizers';
import * as ort from 'onnxruntime-web/wasm';
import simdWasm from '../node_modules/onnxruntime-web/dist/ort-wasm-simd.wasm?url';
import basicWasm from '../node_modules/onnxruntime-web/dist/ort-wasm.wasm?url';
import { rankPatientFacts, type PatientAIRequest } from './patient-ai';

const modelBase =
  'https://huggingface.co/Xenova/multilingual-e5-small/resolve/761b726dd34fb83930e26aab4e9ac3899aa1fa78/';
const weightsBytes = 118_308_185;
let session: ort.InferenceSession;
let tokenizer: Tokenizer;
let passages: Float32Array[];

async function asset(file: string, onBytes?: (loaded: number) => void) {
  const url = modelBase + file;
  const cache = await caches.open('patient-e5-761b726').catch(() => undefined);
  const cached = await cache?.match(url).catch(() => undefined);
  if (cached) return cached;

  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Download do modelo: HTTP ${response.status}`);
  if (!onBytes || !response.body) {
    await cache?.put(url, response.clone()).catch(() => undefined);
    return response;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let loaded = 0;
  for (;;) {
    const result = await reader.read();
    if (result.done) break;
    chunks.push(result.value);
    loaded += result.value.byteLength;
    onBytes(loaded);
  }
  if (loaded !== weightsBytes) throw new Error('Download incompleto do modelo');
  const data = new Response(new Blob(chunks));
  await cache?.put(url, data.clone()).catch(() => undefined);
  return data;
}

async function embed(texts: readonly string[]) {
  const tokens = texts.map((text) => tokenizer.encode(text).ids);
  const width = Math.max(...tokens.map((ids) => ids.length));
  const dims = [tokens.length, width];
  const inputs = new BigInt64Array(tokens.length * width).fill(1n); // XLM-R pad token
  const mask = new BigInt64Array(inputs.length);
  tokens.forEach((ids, row) => {
    inputs.set(ids.map(BigInt), row * width);
    mask.fill(1n, row * width, row * width + ids.length);
  });
  const { last_hidden_state: hidden } = await session.run({
    input_ids: new ort.Tensor('int64', inputs, dims),
    attention_mask: new ort.Tensor('int64', mask, dims),
    token_type_ids: new ort.Tensor(
      'int64',
      new BigInt64Array(inputs.length),
      dims,
    ),
  });
  const dimensions = hidden.dims[2];
  const values = hidden.data as Float32Array;
  return tokens.map((ids, row) => {
    const vector = new Float32Array(dimensions);
    for (let token = 0; token < ids.length; token++) {
      const offset = (row * width + token) * dimensions;
      for (let i = 0; i < dimensions; i++) vector[i] += values[offset + i];
    }
    // L2 normalization of the unpadded sum is equivalent to normalizing its mean.
    const norm = Math.hypot(...vector) || 1;
    return vector.map((value) => value / norm);
  });
}

function progress(value: number) {
  self.postMessage({ type: 'progress', value });
}

async function prepare(facts: string[]) {
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  ort.env.wasm.wasmPaths = {
    'ort-wasm-simd.wasm': simdWasm,
    'ort-wasm.wasm': basicWasm,
  };
  const [definition, config, weights] = await Promise.all([
    asset('tokenizer.json').then((response) => response.json()),
    asset('tokenizer_config.json').then((response) => response.json()),
    asset('onnx/model_quantized.onnx', (bytes) =>
      progress(Math.min(0.9, (bytes / weightsBytes) * 0.9)),
    ).then((response) => response.arrayBuffer()),
  ]);
  progress(0.94);
  tokenizer = new Tokenizer(definition, config);
  session = await ort.InferenceSession.create(weights, {
    executionProviders: ['wasm'],
  });
  passages = await embed(facts);
  self.postMessage({ type: 'ready' });
}

async function handle(request: PatientAIRequest) {
  if (request.type === 'prepare') {
    await prepare(request.facts);
    return;
  }
  const vectors = await embed(request.queries);
  const scores = vectors.map((vector) =>
    passages.map((passage) =>
      passage.reduce((sum, value, i) => sum + value * vector[i], 0),
    ),
  );
  self.postMessage({ type: 'reply', facts: rankPatientFacts(scores) });
}

self.onmessage = ({ data }: MessageEvent<PatientAIRequest>) => {
  void handle(data).catch(() => self.postMessage({ type: 'error' }));
};
