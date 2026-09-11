import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function loadGeometry() {
  const source = await readFile('app/patient-geometry.ts', 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
}
const { pixelCenter, sliceCorners, sliceFrame, hasPatientGeometry } = await loadGeometry();
const slice = {
  rows: 2, columns: 3, position: [10, 20, 30], orientation: [1, 0, 0, 0, 1, 0], pixelSpacing: [2, 3],
};

test('uses Image Position as the first pixel centre with DICOM row/column spacing', () => {
  assert.deepEqual(pixelCenter(slice, 0, 0), [10, 20, 30]);
  assert.deepEqual(pixelCenter(slice, 1, 2), [16, 22, 30]);
  assert.deepEqual(sliceCorners(slice), [[8.5, 19, 30], [17.5, 19, 30], [17.5, 23, 30], [8.5, 23, 30]]);
});

test('requires complete geometry for every slice before enabling patient-space rendering', () => {
  const series = { slices: [slice, { ...slice, position: [10, 20, 32] }] };
  assert.equal(hasPatientGeometry(series), true);
  assert.equal(hasPatientGeometry({ slices: [slice, { ...slice, pixelSpacing: undefined }] }), false);
});

test('rejects non-finite frame coordinates before they reach WebGL', () => {
  assert.equal(sliceFrame({ ...slice, position: [NaN, 20, 30] }), undefined);
  assert.equal(sliceFrame({ ...slice, pixelSpacing: [2, NaN] }), undefined);
  assert.equal(sliceFrame({ ...slice, orientation: [2, 0, 0, 0, 1, 0] }), undefined);
});
