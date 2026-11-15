import { readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const [argument] = process.argv.slice(2);
const pendingOnly = argument === '--pending';
const catalogPath =
  argument && !pendingOnly
    ? resolve(argument)
    : fileURLToPath(
        new URL('../../public/data/visual-cases.json', import.meta.url),
      );
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
const pending = catalog.items.filter(
  (item) =>
    !item.translation?.title?.trim() || !item.translation?.caption?.trim(),
);
if (pendingOnly) {
  process.stdout.write(String(pending.length > 0));
} else if (pending.length) {
  await translateCatalog();
} else {
  console.log('Todas as legendas já têm tradução.');
}

async function translateCatalog() {
  const { env, pipeline } = await import('@huggingface/transformers');
  env.allowLocalModels = false;
  env.cacheDir = process.env.MAPA_TRANSLATION_CACHE ?? env.cacheDir;

  const translator = await pipeline(
    'translation',
    'Douglasrambo/opus-mt-tc-big-en-pt-onnx',
    {
      revision: '738ee4cce801ce7c519954e4b78d02d5057b6740',
      dtype: 'q8',
      session_options: { intraOpNumThreads: 2, interOpNumThreads: 1 },
    },
  );
  try {
    const translated = new Map(
      catalog.items.flatMap(({ title, caption, translation }) =>
        translation?.title?.trim() && translation?.caption?.trim()
          ? [
              [title, translation.title],
              [caption, translation.caption],
            ]
          : [],
      ),
    );
    const sentences = new Intl.Segmenter('en', { granularity: 'sentence' });

    async function translateText(original) {
      if (translated.has(original)) return translated.get(original);
      const text = original
        .replace(/&lt;\/?(?:i|b|em|strong)&gt;/gi, '')
        .replace(/([a-z])\.([A-Z])/g, '$1. $2')
        .replace(/\s+/g, ' ')
        .trim();
      const parts = [];
      for (const { segment } of sentences.segment(text)) {
        const input = segment.trim();
        const tokenCount = translator.tokenizer.encode(input).length;
        const [output] = await translator(`>>pob<< ${input}`, {
          num_beams: 3,
          no_repeat_ngram_size: 3,
          max_new_tokens: Math.min(400, tokenCount * 2 + 24),
        });
        const part = output.translation_text?.trim();
        if (!part || part.includes('<unk>')) {
          throw new Error('Tradução incompleta para um texto de caso.');
        }
        parts.push(part);
      }
      const result = parts
        .join(' ')
        .replace(/\btomografia computorizada\b/gi, 'tomografia computadorizada')
        .replace(/\bMRI\b/g, 'RM')
        .replace(/\bCT\b/g, 'TC')
        .trim();
      if (!result) {
        throw new Error('Tradução incompleta para um texto de caso.');
      }
      translated.set(original, result);
      return result;
    }

    for (const [index, item] of pending.entries()) {
      item.translation = {
        title: await translateText(item.title),
        caption: await translateText(item.caption),
      };
      console.log(`Traduzidos ${index + 1}/${pending.length} · ${item.id}`);
    }
    const temporary = catalogPath + '.tmp';
    await writeFile(temporary, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
    await rename(temporary, catalogPath);
  } finally {
    await translator.dispose();
  }
}
