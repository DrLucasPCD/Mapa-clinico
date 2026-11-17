import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import * as T from 'three';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const clinical = load('app/clinical-correlations.ts');
function load(path) {
  const { outputText } = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  const exports = {};
  new Function('exports', 'require', outputText)(exports, (name) => {
    if (name === './clinical-correlations') return clinical;
    return name.startsWith('./')
      ? require('../app/' + name.slice(2))
      : require(name);
  });
  return exports;
}

const { createAnatomyMarkerProjection } = load(
  'app/anatomy-marker-projection.ts',
);
const {
  anatomyDetails,
  getAnatomyDetail,
  chamberOrBrainMarkers,
  anatomyVessel,
  anatomyDisplayName,
} = load('app/anatomy-details.ts');

test('a marker attaches to an exposed triangle, moves with a morph and hides when the mesh is cut', () => {
  const geometry = new T.PlaneGeometry(1, 1);
  const positions = geometry.attributes.position;
  const target = positions.clone();
  for (let i = 0; i < positions.count; i++)
    target.setX(i, positions.getX(i) + 0.35);
  geometry.morphAttributes.position = [target];
  geometry.computeBoundingBox();
  const mesh = new T.Mesh(geometry);
  mesh.updateMatrixWorld(true);
  const camera = new T.PerspectiveCamera(36, 1, 0.01, 10);
  camera.position.z = 2;
  camera.updateMatrixWorld(true);
  const element = { hidden: true, style: {}, dataset: {} };
  const clip = new T.Plane(new T.Vector3(0, 0, 1), 1);
  const projection = createAnatomyMarkerProjection();
  const frame = {
    elements: new Map([['heart', element]]),
    meshes: new Map([['heart', mesh]]),
    visible: [mesh],
    camera,
    clip,
    width: 400,
    height: 400,
    active: 'heart',
    time: 0,
    translucent: false,
  };
  projection.update(frame);
  assert.equal(element.hidden, false);
  const rest = element.style.transform;
  mesh.morphTargetInfluences[0] = 1;
  projection.update({ ...frame, time: 32 });
  assert.equal(element.hidden, false);
  assert.notEqual(element.style.transform, rest);
  clip.constant = -0.2;
  projection.update({ ...frame, time: 48 });
  assert.equal(element.hidden, true);
  geometry.dispose();
});

test('an occluded marker disappears and returns when an anatomical layer is removed', () => {
  const target = new T.Mesh(new T.PlaneGeometry(1, 1));
  const cover = new T.Mesh(new T.PlaneGeometry(1.5, 1.5));
  cover.position.z = 0.3;
  target.geometry.computeBoundingBox();
  target.updateMatrixWorld(true);
  cover.updateMatrixWorld(true);
  const camera = new T.PerspectiveCamera(36, 1, 0.01, 10);
  camera.position.z = 2;
  camera.updateMatrixWorld(true);
  const clip = new T.Plane(new T.Vector3(0, 0, 1), 1);
  const marker = { hidden: true, style: {}, dataset: {} };
  const frame = {
    elements: new Map([['pons', marker]]),
    meshes: new Map([['pons', target]]),
    visible: [target],
    camera,
    clip,
    width: 400,
    height: 400,
    active: 'pons',
    time: 0,
    translucent: false,
  };
  const projection = createAnatomyMarkerProjection();
  projection.update(frame);
  assert.equal(marker.hidden, false);
  projection.update({ ...frame, visible: [cover, target], time: 500 });
  assert.equal(marker.hidden, true);
  projection.update({ ...frame, time: 1000 });
  assert.equal(marker.hidden, false);
  target.geometry.dispose();
  cover.geometry.dispose();
});

test('detailed anatomy cards and discovery markers correspond to atlas meshes', () => {
  const manifest = JSON.parse(
    readFileSync('public/models/detailed/manifest.json', 'utf8'),
  );
  const keys = new Set();
  for (const { organ_id: organId } of manifest.organs) {
    const id = organId
      .replace(/_l$/, '_left')
      .replace(/_r$/, '_right')
      .replaceAll('_', '-');
    keys.add(id);
    keys.add(id.replace(/-(left|right)$/, ''));
    if (chamberOrBrainMarkers(id)) assert.ok(getAnatomyDetail(id), id);
  }
  for (const [id, card] of Object.entries(anatomyDetails)) {
    assert.ok(['heart', 'cerebrum'].includes(id) || keys.has(id), id);
    for (const field of ['anatomy', 'function', 'clinic', 'imaging'])
      assert.ok(card[field].length > 60, `${id} ${field}`);
  }
  assert.equal(
    getAnatomyDetail('heart-left-ventricle').name,
    'Ventrículo esquerdo',
  );
  assert.equal(
    getAnatomyDetail('precentral-gyrus-right').name,
    'Giro pré-central',
  );
  assert.ok(anatomyVessel('internal_carotid_artery_l').branches.length > 0);
});

test('clinical reasoning reaches every prior card and uses model IDs for the new topics', () => {
  const { clinicalCorrelation, clinicalCorrelations, clinicalReferences } =
    clinical;
  const modelIds = new Set();
  for (const file of ['manifest.json', 'manifest_female.json']) {
    for (const { organ_id: id } of JSON.parse(
      readFileSync('public/models/detailed/' + file, 'utf8'),
    ).organs) {
      modelIds.add(id.replace(/_([lr])$/, '').replaceAll('_', '-'));
    }
  }
  for (const id of Object.keys(anatomyDetails))
    assert.ok(clinicalCorrelation(id), id);
  for (const [id, entry] of Object.entries(clinicalCorrelations)) {
    assert.ok(modelIds.has(id) || ['heart', 'cerebrum'].includes(id), id);
    for (const field of ['mechanism', 'exam', 'distinction', 'investigation'])
      assert.ok(entry[field].length > 90, `${id} · ${field}`);
    assert.ok(entry.references.length, id);
    for (const reference of entry.references)
      assert.match(clinicalReferences[reference].url, /^https:\/\//);
  }
  assert.equal(
    clinicalCorrelation('cerebr@right'),
    clinicalCorrelations.cerebrum,
  );
  assert.equal(
    clinicalCorrelation('heart-left-ventricle'),
    clinicalCorrelations['left-ventricle'],
  );
  assert.equal(
    clinicalCorrelation('source-alias', 'facial_nerve_vii_r'),
    clinicalCorrelations['facial-nerve-vii'],
  );
  assert.equal(
    anatomyDisplayName('facial-nerve-vii-right', 'Facial nerve (VII)'),
    'Nervo facial (VII) · lado direito',
  );
  assert.equal(clinicalCorrelation('unmodeled-left-ventricle'), undefined);
});
