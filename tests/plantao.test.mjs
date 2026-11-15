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
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
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
const { getClinicalPlan } = load('./plantao-clinical');

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

test('original and generated cases use clinical priority, hypothesis and management', () => {
  for (const base of plantaoCases) {
    const expected = getClinicalPlan(base);
    for (const scenario of [base, getPlantaoScenario(base.id + '~2s')]) {
      const plan = getClinicalPlan(scenario);
      assert.deepEqual(
        plan.decisions.map((decision) => decision.title),
        expected.decisions.map((decision) => decision.title),
      );
      assert.match(plan.decisions[0].title, /prioridade/);
      assert.match(plan.decisions[1].title, /hipótese/);
      assert.match(plan.decisions[2].title, /conduta/);
      for (const [index, decision] of plan.decisions.entries()) {
        assert.ok(new Set(decision.options).size >= 3, scenario.id);
        assert.ok(decision.explanation, scenario.id);
        assert.equal(
          decision.options[decision.correct],
          expected.decisions[index].options[expected.decisions[index].correct],
          scenario.id,
        );
        const resolved = resolvePlantaoReview(
          plantaoReviewKey(scenario.id, index, true),
        );
        assert.deepEqual(resolved?.review, {
          caseId: scenario.id,
          decision: index,
          clinical: true,
        });
        assert.deepEqual(
          getClinicalPlan(resolved.scenario).decisions[index],
          decision,
        );
      }
    }
  }
});

test('Faber clips cover the original and generated patient dialogue', () => {
  const { plantaoVoiceLines, plantaoVoiceUrl } = load('./plantao-voice');
  const clips = new Set(plantaoVoiceLines().map((item) => item.url));
  for (const base of plantaoCases) {
    for (const scenario of [base, getPlantaoScenario(base.id + '~9v')]) {
      for (const text of [
        scenario.complaint,
        ...scenario.interview.map((item) => item.answer),
      ]) {
        const url = plantaoVoiceUrl(text);
        assert.ok(clips.has(url), scenario.id);
      }
    }
  }
  for (const url of clips) {
    const file = readFileSync('public' + url);
    assert.ok(file.length > 512, url);
    assert.equal(file.subarray(0, 3).toString(), 'ID3', url);
  }
});
