import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile('app/ecg-model.ts', 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const { activationTimes, calculateAxis, ecgActivation, ecgBeats, electricalVector, projectLead } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

test('frontal projections preserve Einthoven and recover the axis across quadrants', () => {
  for (const angle of [-155, -62, 0, 60, 125]) {
    const rad = angle * Math.PI / 180;
    const vector = [Math.cos(rad), Math.sin(rad), .4];
    const I = projectLead(vector, 'I');
    assert.ok(Math.abs(projectLead(vector, 'II') - I - projectLead(vector, 'III')) < 1e-10);
    assert.equal(calculateAxis(I, projectLead(vector, 'aVF')), angle);
  }
  assert.equal(calculateAxis(0, 0), null);
});

test('the posterior ST example changes anterior and posterior leads in opposite directions', () => {
  const time = .094;
  const normal = electricalVector(time, [0], 'sinus', 55);
  const posterior = electricalVector(time, [0], 'posterior', 55);
  assert.ok(projectLead(posterior, 'V2') < projectLead(normal, 'V2') - .2);
  assert.ok(projectLead(posterior, 'V9') > projectLead(normal, 'V9') + .2);
});

test('sinus beats are regular and atrial fibrillation varies RR', () => {
  const intervals = pattern => {
    const beats = ecgBeats(pattern, 90, 6);
    return new Set(beats.slice(1).map((beat, index) => (beat - beats[index]).toFixed(4)));
  };
  assert.equal(intervals('sinus').size, 1);
  assert.ok(intervals('af').size > 3);
});

test('the sinus conduction landmarks follow P, PR, QRS and T on the same time axis', () => {
  const beats = [1];
  const times = activationTimes(2, beats, 'sinus');
  const jumps = Array.from({ length: 7 }, (_, index) => times[index][0]);
  assert.deepEqual(jumps, [...jumps].sort((a, b) => a - b));
  assert.deepEqual(jumps.map(time => ecgActivation(time, beats, 'sinus').name),
    ['Início de P', 'P', 'PR', 'PR', 'QRS', 'QRS', 'T']);
  assert.equal(ecgActivation(1.5, beats, 'sinus').stage, null);
});

test('PR prolongation and non-sinus patterns use their corresponding activation windows', () => {
  const beats = [1];
  assert.ok(activationTimes(2, beats, 'av')[1][0] < activationTimes(2, beats, 'sinus')[1][0]);
  assert.equal(activationTimes(2, beats, 'af')[1], undefined);
  assert.equal(ecgActivation(1, beats, 'af').stage.ventricularOnly, true);
  assert.equal(ecgActivation(1, beats, 'vt').name, 'QRS');
  assert.deepEqual(activationTimes(2, beats, 'vt'), {});
});
