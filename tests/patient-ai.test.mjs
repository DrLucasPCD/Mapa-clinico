import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
  // oxlint-disable-next-line typescript/no-implied-eval -- Transpile the existing TS data modules for Node tests.
  // oxlint-disable-next-line typescript/no-implied-eval -- Load the repository's TS data modules with the existing test harness.
  new Function('exports', 'require', source)(exports, load);
  return exports;
}
const {
  patientFactPassages,
  patientQueries,
  rankPatientFacts,
  patientReplyFromFacts,
} = load('./patient-ai');
const { plantaoCases, getPlantaoScenario } = load('./plantao-cases');
const { hasPatientRecording, plantaoVoiceLines } = load('./plantao-voice');

void test('semantic passages retain fact order for original and generated cases and omit hidden answers', () => {
  for (const base of plantaoCases) {
    for (const scenario of [base, getPlantaoScenario(base.id + '~2s')]) {
      const passages = patientFactPassages(scenario);
      assert.equal(passages.length, scenario.interview.length);
      for (const [i, entry] of scenario.interview.entries()) {
        assert.ok(passages[i].includes(entry.question));
        assert.ok(passages[i].includes(entry.answer));
      }
      assert.ok(!passages.join(' ').includes(scenario.report), base.id);
      for (const decision of scenario.decisions)
        assert.ok(!passages.join(' ').includes(decision.explanation), base.id);
    }
  }
});

void test('previous questions only enter explicitly contextual queries', () => {
  assert.deepEqual(patientQueries('  Teve febre?  ', 'Quando a dor começou?'), [
    'query: Teve febre?',
  ]);
  assert.deepEqual(patientQueries('E depois disso?', 'Quando a dor começou?'), [
    'query: E depois disso?',
    'query: E depois disso? Contexto: Quando a dor começou?',
  ]);
});

void test('uncertain search results do not score or answer with unrelated facts', () => {
  assert.deepEqual(rankPatientFacts([[0.72, 0.9, 0.84]]), [1]);
  assert.deepEqual(rankPatientFacts([[0.87, 0.86, 0.76]]), []);
  assert.deepEqual(rankPatientFacts([[0.74, 0.78]]), []);
  assert.deepEqual(
    rankPatientFacts([
      [NaN, 0.78],
      [0.84, 0.91],
    ]),
    [1],
  );
  const scenario = plantaoCases[0];
  assert.deepEqual(
    patientReplyFromFacts(scenario, [0, 0, 999, -1, 1.5], 'Sem informação'),
    {
      reply: scenario.interview[0].answer,
      facts: [0],
    },
  );
  assert.deepEqual(patientReplyFromFacts(scenario, [999], 'Sem informação'), {
    reply: 'Sem informação',
    facts: [],
  });
});

void test('only existing exact transcripts use prerecorded Faber files', () => {
  for (const { text } of plantaoVoiceLines())
    assert.ok(hasPatientRecording(text));
  assert.equal(
    hasPatientRecording('Uma resposta gerada que nunca foi gravada.'),
    false,
  );
});
