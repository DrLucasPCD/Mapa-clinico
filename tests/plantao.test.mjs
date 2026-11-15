import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { access } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const modules = new Map();
function load(name) {
  const filename = 'app/' + name.slice(2);
  if (modules.has(filename)) return modules.get(filename);
  if (filename.endsWith('.json'))
    return JSON.parse(readFileSync(filename, 'utf8'));
  const source = ts.transpileModule(readFileSync(filename + '.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const exports = {};
  modules.set(filename, exports);
  new Function('exports', 'require', source)(exports, load);
  return exports;
}

const {
  plantaoCases,
  getPlantaoScenario,
  plantaoReviewKey,
  resolvePlantaoReview,
} = load('./plantao-cases');
const { visualTasks } = load('./visual-localization');

test('the emergency catalog has at least 50 distinct cases with attributed local images', async () => {
  assert.ok(plantaoCases.length >= 50);
  for (const field of ['id', 'source', 'image'])
    assert.equal(
      new Set(plantaoCases.map((item) => item[field])).size,
      plantaoCases.length,
    );
  for (const item of plantaoCases) {
    await access('public' + item.image);
    assert.match(item.licence, /^https:\/\//);
    assert.ok(item.credit);
    assert.equal(item.interview.filter((question) => question.key).length, 3);
    assert.equal(item.decisions.length, 3);
    for (const decision of item.decisions)
      assert.ok(decision.options[decision.correct], item.id);
  }
});

test('generated scenarios vary the narrative and preserve the original answers and evidence', () => {
  for (const base of plantaoCases) {
    const id = base.id + '~2s';
    const generated = getPlantaoScenario(id);
    assert.ok(generated?.generated);
    assert.notEqual(generated.complaint, base.complaint);
    assert.equal(generated.image, base.image);
    assert.equal(generated.source, base.source);
    assert.deepEqual(generated, getPlantaoScenario(id));
    generated.decisions.forEach((decision, i) => {
      assert.equal(
        decision.options[decision.correct],
        base.decisions[i].options[base.decisions[i].correct],
      );
      const fromReview = resolvePlantaoReview(plantaoReviewKey(id, i));
      assert.deepEqual(fromReview?.review, { caseId: id, decision: i });
      assert.deepEqual(fromReview?.scenario.decisions[i], decision);
    });
  }
  assert.deepEqual(resolvePlantaoReview('1')?.review, {
    caseId: 'biliary',
    decision: 1,
  });
  assert.equal(resolvePlantaoReview('missing/1'), undefined);
  assert.equal(resolvePlantaoReview('stroke~20~1/0'), undefined);
});

test('visual localization assets and answer regions remain tied to each of the four modalities', async () => {
  assert.equal(
    new Set(visualTasks.map((item) => item.image)).size,
    visualTasks.length,
  );
  assert.deepEqual(
    [...new Set(visualTasks.map((item) => item.modality))].sort(),
    ['RM', 'RX', 'TC', 'USG'],
  );
  for (const item of visualTasks) {
    await access('public' + item.image);
    const { x, y, rx, ry } = item.target;
    assert.ok(
      rx > 0 && ry > 0 && x - rx > 0 && y - ry > 0 && x + rx < 1 && y + ry < 1,
      item.id,
    );
  }
});
