import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import ts from 'typescript';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
async function loadTs(file) {
  const text = await readFile(file, 'utf8');
  const js = ts.transpileModule(text, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return import(
    'data:text/javascript;base64,' + Buffer.from(js).toString('base64')
  );
}
const { lessons, cases } = await loadTs('app/content.ts');
const { matchesStructure } = await loadTs('app/anatomy.ts');
const body = await readFile('public/models/body.glb');
const gltf = await new Promise((res, rej) =>
  new GLTFLoader().parse(
    body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
    '',
    res,
    rej,
  ),
);
const nodes = [];
gltf.scene.traverse((n) => {
  if (n.isMesh) nodes.push(n);
});
test('Every selectable lesson and case corresponds to actual geometry', () => {
  for (const l of lessons)
    assert(
      nodes.some((n) => matchesStructure(n.userData.anatomyId, l.id)),
      `Missing geometry for ${l.name}`,
    );
  for (const c of cases)
    assert(
      nodes.some((n) => matchesStructure(n.userData.anatomyId, c.region)),
      `Missing region ${c.id}`,
    );
  assert(nodes.length > 700);
});
test('Clinical highlights preserve documented laterality', () => {
  for (const [selection, side] of [
    ['cerebrum@right', 'right'],
    ['cerebrum@left', 'left'],
    ['appendicular-skeleton-fifth-metacarpal-bone-right', 'right'],
  ]) {
    const found = nodes.filter((n) =>
      matchesStructure(n.userData.anatomyId, selection),
    );
    assert(found.length > 0);
    assert(found.every((n) => n.userData.anatomyId.endsWith(side)));
  }
});
test('Cases retain attribution, imaging files, and valid answer keys', async () => {
  for (const c of cases) {
    assert.match(c.source, /^https:\/\/radiopaedia\.org\/cases\/\d+$/);
    assert(c.author);
    assert(c.correct >= 0 && c.correct < c.options.length);
    assert(c.explanation.length > 80);
    for (const im of c.images) {
      await access('public' + im.src);
      const b = await readFile('public' + im.src);
      assert.equal(b.readUInt16BE(0), 0xffd8);
    }
  }
});
test('Lessons have distinct depth and muscle origin/insertion/action', () => {
  for (const l of lessons) {
    assert.equal(new Set(l.levels).size, 4);
    if (l.system === 'muscular') assert(l.origin && l.insertion && l.action);
  }
});
test('Exact Faber audio outputs are WAV files', async () => {
  for (const l of lessons.filter((l) => l.audio)) {
    const b = await readFile('public/audio/' + l.audio + '.wav');
    assert.equal(b.subarray(0, 4).toString(), 'RIFF');
    assert.equal(b.subarray(8, 12).toString(), 'WAVE');
    assert(b.length > 10000);
  }
});
test('Discovery feed uses validated PubMed IDs and timestamps', async () => {
  const d = JSON.parse(await readFile('public/data/discoveries.json', 'utf8'));
  assert(Number.isFinite(Date.parse(d.lastChecked)));
  for (const item of d.items) {
    assert.match(item.id, /^\d+$/);
    assert.equal(item.url, `https://pubmed.ncbi.nlm.nih.gov/${item.id}/`);
    assert(item.title);
    assert.match(item.status, /não revisada/);
  }
});
test('WebMCP rejects invalid requests without changing app state', async () => {
  const { registerStudyTool } = await loadTs('app/webmcp.ts');
  let tool,
    selected = null;
  const cleanup = registerStudyTool(
    {
      registerTool: (t) => {
        tool = t;
      },
    },
    (id, period) => {
      selected = { id, period };
    },
    lessons.map((l) => l.id),
  );
  assert(tool);
  assert.throws(() => tool.execute({ structureId: 'heart', period: 13 }));
  assert.equal(selected, null);
  const response = tool.execute({ structureId: 'heart', period: 4 });
  assert.deepEqual(selected, { id: 'heart', period: 4 });
  assert.equal(response.view, 'atlas');
  cleanup();
});
