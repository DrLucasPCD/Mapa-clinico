import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function loadSegmentation() {
  const source = await readFile('app/ct-segmentation.ts', 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
}
const { segmentCt, validateCtSegmentation } = await loadSegmentation();
function series(positions = [[10, 20, 30], [10, 20, 34], [10, 20, 38]]) {
  return {
    modality: 'CT', rows: 2, columns: 2, plane: 'axial', id: 'phantom',
    slices: positions.map((position, index) => ({ seriesId: 'phantom', modality: 'CT', rows: 2, columns: 2, pixels: new Float32Array(index === 1 ? [0, 900, 0, 0] : [0, 0, 0, 0]), slope: 1, intercept: 0, invert: false, position, orientation: [1, 0, 0, 0, 1, 0], pixelSpacing: [2, 3], sourceName: `${index}.dcm` })),
  };
}

test('creates a physical LPS voxel surface at pixel edges after HU rescale', () => {
  const output = segmentCt(series(), 500);
  assert.equal(output.voxelCount, 1);
  assert.equal(output.truncated, false);
  assert.equal(output.indices.length, 36);
  assert.deepEqual([...output.indices], Array.from({ length: 36 }, (_, index) => index));
  const xs = [], ys = [], zs = [];
  for (let i = 0; i < output.positions.length; i += 3) { xs.push(output.positions[i]); ys.push(output.positions[i + 1]); zs.push(output.positions[i + 2]); }
  assert.deepEqual([Math.min(...xs), Math.max(...xs)], [11.5, 14.5]);
  assert.deepEqual([Math.min(...ys), Math.max(...ys)], [19, 21]);
  assert.deepEqual([Math.min(...zs), Math.max(...zs)], [32, 36]);
});

test('rejects sheared and irregular CT slice grids', () => {
  assert.equal(validateCtSegmentation(series([[10, 20, 30], [10.5, 20, 34], [10, 20, 38]])).eligible, false);
  assert.equal(validateCtSegmentation(series([[10, 20, 30], [10, 20, 34], [10, 20, 39]])).eligible, false);
  assert.throws(() => segmentCt({ ...series(), modality: 'MR' }, 500), /CT/);
});
