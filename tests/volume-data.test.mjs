import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

async function moduleUrl(file, imports = {}) {
  let source = await readFile('app/' + file + '.ts', 'utf8');
  for (const [name, url] of Object.entries(imports))
    source = source.replace("'./" + name + "'", JSON.stringify(url));
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
}
const frame = await moduleUrl('patient-geometry');
const mpr = await moduleUrl('mpr', { 'patient-geometry': frame });
const { makeVolumeData, volumeCoordinate } = await import(
  await moduleUrl('volume-data', { 'patient-geometry': frame, mpr })
);
const { pixelCenter } = await import(frame);

function phantom(modality = 'CT') {
  return {
    id: 'phantom',
    modality,
    rows: 3,
    columns: 4,
    plane: 'axial',
    slices: Array.from({ length: 5 }, (_, z) => ({
      rows: 3,
      columns: 4,
      position: [60, 30, 12 + z * 4],
      orientation: [-1, 0, 0, 0, -1, 0],
      pixelSpacing: [2, 3],
      pixels: Float32Array.from({ length: 12 }, (_, i) => 100 * z + i * 3),
      slope: 2,
      intercept: -83,
    })),
  };
}

test('DICOM volume keeps the MPR cursor at the same physical voxel including reversed in-plane axes', () => {
  const series = phantom();
  const volume = makeVolumeData(series);
  assert.deepEqual(volume.dims, [4, 3, 5]);
  const point = pixelCenter(series.slices[3], 2, 1);
  assert.deepEqual(volumeCoordinate(volume, point), [
    1.5 / 4,
    2.5 / 3,
    3.5 / 5,
  ]);
  const byte = ((3 * 3 + 2) * 4 + 1) * 2;
  const value =
    ((volume.values[byte] * 256 + volume.values[byte + 1]) / 65535) *
      (volume.maximum - volume.minimum) +
    volume.minimum;
  assert.ok(Math.abs(value - 571) < 0.03);
});

test('capping the texture does not shrink its footprint or change the patient-space cursor', () => {
  const series = phantom('MR');
  const volume = makeVolumeData(series, 2);
  assert.deepEqual(volume.dims, [2, 2, 2]);
  assert.equal(volume.values.length, 16);
  const native = makeVolumeData(series);
  assert.deepEqual(volume.edges, native.edges);
  assert.deepEqual(volume.origin, native.origin);
  assert.equal(volume.minimum, (100 + 3) * 2 - 83);
  assert.equal(volume.maximum, (300 + 33) * 2 - 83);
});

test('irregular geometry has no renderable volume', () => {
  const series = phantom();
  series.slices[4].position[2] += 2;
  assert.equal(makeVolumeData(series), null);
});
