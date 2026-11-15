import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import * as Three from 'three';
import ts from 'typescript';

async function load(name) {
  let source = await readFile('app/' + name + '.ts', 'utf8');
  const threeUrl = pathToFileURL(
    createRequire(import.meta.url).resolve('three'),
  ).href;
  source = source.replace("from 'three'", "from '" + threeUrl + "'");
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
const { heartCycle, cycleComparison, heartCycleAtBeat } =
  await load('heart-cycle');
const { prepareHeartMotion } = await load('heart-motion');

test('keeps both sets of valves closed and volume constant during isovolumetric phases', () => {
  const contraction = heartCycle(0.05);
  const relaxation = heartCycle(0.37);
  for (const sample of [contraction, relaxation])
    assert.ok(Object.values(sample.valves).every((value) => value === 0));
  assert.equal(contraction.volumeLV, heartCycle(0).volumeLV);
  assert.equal(relaxation.volumeLV, heartCycle(0.345).volumeLV);
  assert.ok(heartCycle(0.2).valves.aortic > 0.95);
  assert.ok(heartCycle(0.46).valves.mitral > 0.95);
  assert.ok(heartCycle(0.75).atrial > 0.9);
  assert.equal(
    heartCycleAtBeat(1.22, [0.2, 1.2, 2.2], 75, true).ventricular,
    0,
  );
});

test('changes ventricular geometry with an anchored apex and opposing rotation, without moving the mesh', () => {
  function chamber(id, x) {
    const geometry = new Three.SphereGeometry(1, 24, 18);
    geometry.scale(0.032, 0.052, 0.03);
    geometry.translate(x, 1.25, 0.05);
    const mesh = new Three.Mesh(geometry);
    mesh.userData.anatomyId = id;
    return mesh;
  }
  const left = chamber('left-ventricle', 0.055);
  const right = chamber('right-ventricle', 0.005);
  const rig = prepareHeartMotion([left, right]);
  const pose = heartCycle(cycleComparison(75, true));
  const shape = new Three.Vector3();
  rig.update(pose);
  assert.deepEqual(left.position.toArray(), [0, 0, 0]);
  assert.deepEqual(left.scale.toArray(), [1, 1, 1]);
  assert.ok(left.morphTargetInfluences.every((value) => value > 0.95));
  assert.ok(right.morphTargetInfluences.every((value) => value > 0.95));
  rig.point('left-ventricle', rig.apex, pose, shape);
  assert.ok(shape.distanceTo(rig.apex) < 1e-8);
  const base = rig.apex.clone().addScaledVector(rig.axis, rig.length * 0.97);
  rig.point('left-ventricle', base, pose, shape);
  assert.ok(base.clone().sub(shape).dot(rig.axis) > 0.012);
  const radial = new Three.Vector3(0, 0, 1).cross(rig.axis).normalize();
  const tangent = rig.axis.clone().cross(radial);
  const apicalSide = rig.apex
    .clone()
    .addScaledVector(rig.axis, 0.22 * rig.length)
    .addScaledVector(radial, 0.018);
  const basalSide = rig.apex
    .clone()
    .addScaledVector(rig.axis, 0.88 * rig.length)
    .addScaledVector(radial, 0.018);
  rig.point('left-ventricle', apicalSide, pose, shape);
  assert.ok(shape.clone().sub(apicalSide).dot(tangent) < 0);
  rig.point('left-ventricle', basalSide, pose, shape);
  assert.ok(shape.clone().sub(basalSide).dot(tangent) > 0);
  assert.ok(
    [...left.geometry.morphAttributes.position[0].array].every(Number.isFinite),
  );
});
