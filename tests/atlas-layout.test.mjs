import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

async function loadLayout() {
  const source = await readFile('app/atlas-layout.ts', 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return import(
    'data:text/javascript;base64,' + Buffer.from(js).toString('base64')
  );
}

test('catalogue layout separates real GLB anatomy groups and identifies foot geometry', async () => {
  const { catalogueLayout, inAtlasRegion, isFootStructure } =
    await loadLayout();
  const body = await readFile('public/models/body.glb');
  const gltf = await new Promise((resolve, reject) =>
    new GLTFLoader().parse(
      body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
      '',
      resolve,
      reject,
    ),
  );
  const ids = new Set();
  gltf.scene.traverse((node) => {
    if (node.isMesh && node.userData.anatomyId)
      ids.add(node.userData.anatomyId);
  });
  const selected = [...ids]
    .filter((id) => /(?:talus|heart-|radius)/.test(id))
    .slice(0, 12);
  assert(selected.length >= 4, 'expected actual selectable GLB anatomy groups');
  const layout = catalogueLayout(
    selected.map((id, index) => ({
      id,
      center: { x: index, y: 0, z: 0 },
      size: { x: 0.2, y: 0.4, z: 0.2 },
    })),
  );
  assert.equal(layout.size, selected.length);
  assert(
    new Set([...layout.values()].map((point) => `${point.x}/${point.y}`)).size >
      1,
  );
  const talus = [...ids].find((id) => id.includes('talus'));
  assert(talus && isFootStructure(talus));
  assert(inAtlasRegion('ankle', talus, { x: 0.5, y: -5.6, z: 0 }));
});
