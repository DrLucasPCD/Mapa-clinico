import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const sourceText = await readFile('app/landmark-registration.ts', 'utf8');
const js = ts.transpileModule(sourceText, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const { fitLandmarks } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

test('recovers a known uniform scale, proper rotation, and translation', () => {
  const source = [[0, 0, 0], [20, 0, 0], [0, 30, 0], [0, 0, 40], [5, 7, 11]];
  const scale = 1.25, translation = [120, -35, 80];
  // +90 degrees around Z.
  const target = source.map(([x, y, z]) => [translation[0] - scale * y, translation[1] + scale * x, translation[2] + scale * z]);
  const fit = fitLandmarks(source, target);
  assert.ok(Math.abs(fit.scale - scale) < 1e-10);
  assert.ok(fit.rmsMm < 1e-9);
  assert.ok(fit.residuals.every((value) => value < 1e-9));
  const [x, y, z] = source[4], m = fit.matrix;
  const mapped = [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
  mapped.forEach((value, axis) => assert.ok(Math.abs(value - target[4][axis]) < 1e-9));
});

test('rejects collinear landmarks', () => {
  assert.throws(() => fitLandmarks([[0, 0, 0], [1, 0, 0], [2, 0, 0]], [[4, 2, 1], [5, 2, 1], [6, 2, 1]]), /collinear/);
});

test('rejects duplicate landmarks and an exact reflected 3D correspondence', () => {
  assert.throws(() => fitLandmarks([[0, 0, 0], [1, 0, 0], [1, 0, 0]], [[0, 0, 0], [1, 0, 0], [0, 1, 0]]), /duplicate/);
  const tetra = [[0, 0, 0], [2, 0, 0], [0, 3, 0], [0, 0, 4]];
  assert.throws(() => fitLandmarks(tetra, tetra.map(([x, y, z]) => [-x, y, z])), /reflection/);
});
