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

const { createCardiacCine, cinePhaseAt, cineCandidates, regionFlow } =
  await import(
    await moduleUrl('cardiac-cine', { 'patient-geometry': frame, mpr })
  );

test('cine uses the recorded time sequence and rejects a moved phase grid', () => {
  const phases = [400, 0, 200].map((value) => {
    const phase = phantom();
    return {
      ...phase,
      id: String(value),
      acquisitionId: 'test',
      cardiacPhase: { kind: 'trigger', value },
      slices: phase.slices.map((slice) => ({
        ...slice,
        cardiac: { rrMs: 1000 },
      })),
    };
  });
  const cine = createCardiacCine(cineCandidates(phases, phases[0], false));
  assert.deepEqual(cine.frameStartsMs, [0, 200, 400]);
  assert.equal(cinePhaseAt(cine, 399), 1);
  assert.equal(cinePhaseAt(cine, 405), 2);
  assert.equal(cinePhaseAt(cine, 1001), 0);
  assert.ok(cine.hasVolume);
  phases[2].slices[3].position[0] += 4;
  assert.equal(createCardiacCine(phases), null);
});

test('integrates calibrated signed velocity using pixel area and requires through-plane encoding', () => {
  const slice = phantom('MR').slices[0];
  slice.pixels.fill(-100);
  slice.velocity = {
    direction: [0, 0, 1],
    slopeCmPerSec: 0.5,
    interceptCmPerSec: 0,
    first: -500,
    last: 500,
  };
  assert.equal(regionFlow(slice, 1, 2, 2.1), -9);
  slice.velocity.direction = [0, 1, 0];
  assert.equal(regionFlow(slice, 1, 2, 2.1), null);
  slice.velocity.direction = [0, 0, 1];
  slice.padding = [-100, -100];
  assert.equal(regionFlow(slice, 1, 2, 2.1), null);
});
