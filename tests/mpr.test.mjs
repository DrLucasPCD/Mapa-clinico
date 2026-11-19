import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function load() {
  const compilerOptions = { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 };
  const geometry = await readFile('app/patient-geometry.ts', 'utf8');
  const geometryUrl = 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(geometry, { compilerOptions }).outputText).toString('base64');
  const source = await readFile('app/mpr.ts', 'utf8');
  const js = ts.transpileModule(source.replace("'./patient-geometry'", JSON.stringify(geometryUrl)), { compilerOptions }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
}
const { mprGeometry, viewVoxel, cursorFromView } = await load();
const series = { id:'v', modality:'CT', rows:2, columns:3, plane:'axial', slices:[0,1,2].map(z => ({rows:2,columns:3,pixels:new Float32Array([0,1,2,10,11,12].map(v=>v+z*100)),slope:2,intercept:-1,position:[0,0,z*4],orientation:[1,0,0,0,1,0],pixelSpacing:[2,3]})) };

test('validates a regular stack and labels all three orthogonal planes', () => {
  assert.deepEqual(mprGeometry(series), {stepMm:4, labels:{source:'axial',row:'coronal',column:'sagital'}});
  const rotated = { ...series, slices: series.slices.map(slice => ({...slice, orientation:[.7071,.7071,0,-.7071,.7071,0]})) };
  assert.equal(mprGeometry(rotated), null);
});

test('samples source, coronal and sagittal reconstructions with rescale', () => {
  const cursor={column:1,row:1,slice:2};
  assert.equal(viewVoxel(series,'source',cursor,2,0),403);
  assert.equal(viewVoxel(series,'row',cursor,2,1),223);
  assert.equal(viewVoxel(series,'column',cursor,0,2),401);
  assert.deepEqual(cursorFromView(series,'row',cursor,.1,.1),{column:0,row:1,slice:0});
});
