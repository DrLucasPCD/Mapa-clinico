import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile('app/registered-overlay.ts', 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const { overlayStyle, slabPlaneEquations } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
const frame = { normal: [0, 0, 1], rowDirection: [1, 0, 0], columnDirection: [0, 1, 0], rowSpacing: 2, columnSpacing: 3 };

test('neurovascular overlay colors arteries, veins and nervous tissue distinctly', () => {
  assert.deepEqual(overlayStyle('cardiovascular', 'middle-cerebral-artery', ['cardiovascular']), { color: '#ef4055', opacity: 0.9 });
  assert.deepEqual(overlayStyle('cardiovascular', 'internal-cerebral-vein', ['cardiovascular']), { color: '#4f8dd8', opacity: 0.9 });
  assert.deepEqual(overlayStyle('nervous', 'cerebrum', ['nervous']), { color: '#76d7dc', opacity: 0.42 });
  assert.equal(overlayStyle('skeletal', 'skull', ['nervous']), null);
});

test('each orthogonal selection creates a one-voxel patient-space slab', () => {
  const point = [10, 20, 30];
  assert.deepEqual(slabPlaneEquations(frame, point, 'axial', 4), [
    { normal: [0, 0, 1], constant: -28 },
    { normal: [0, 0, -1], constant: 32 },
  ]);
  assert.deepEqual(slabPlaneEquations(frame, point, 'coronal', 4), [
    { normal: [0, 1, 0], constant: -19 },
    { normal: [0, -1, 0], constant: 21 },
  ]);
  assert.deepEqual(slabPlaneEquations(frame, point, 'sagital', 4), [
    { normal: [1, 0, 0], constant: -8.5 },
    { normal: [-1, 0, 0], constant: 11.5 },
  ]);
  assert.deepEqual(slabPlaneEquations(frame, point, 'volume', 4), []);
});
