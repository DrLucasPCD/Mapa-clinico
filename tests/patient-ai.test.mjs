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
const { patientMessages, parsePatientReply } = load('./patient-ai');
const { plantaoCases, getPlantaoScenario } = load('./plantao-cases');
const { hasPatientRecording, plantaoVoiceLines } = load('./plantao-voice');

void test('patient context contains the current history without hidden reports or answers, including generated cases', () => {
  for (const base of plantaoCases) {
    for (const scenario of [base, getPlantaoScenario(base.id + '~2s')]) {
      const system = patientMessages(scenario, [], 'Como você está?')[0]
        .content;
      assert.ok(system.includes(scenario.complaint));
      for (const entry of scenario.interview)
        assert.ok(system.includes(entry.answer));
      assert.ok(!system.includes(scenario.report), base.id);
      for (const decision of scenario.decisions)
        assert.ok(!system.includes(decision.explanation), base.id);
    }
  }
});

void test('follow-up context is bounded, preserves conversation roles, and excludes old sessions', () => {
  const history = Array.from({ length: 20 }, (_, i) => ({
    question: `Pergunta ${i}`,
    answer: `Resposta ${i}`,
  }));
  const messages = patientMessages(
    plantaoCases[0],
    history,
    '  E depois disso?  ',
  );
  assert.equal(messages.length, 14);
  assert.deepEqual(messages[1], { role: 'user', content: 'Pergunta 14' });
  assert.deepEqual(messages.at(-2), {
    role: 'assistant',
    content: 'Resposta 19',
  });
  assert.deepEqual(messages.at(-1), {
    role: 'user',
    content: 'E depois disso?',
  });
  assert.equal(patientMessages(plantaoCases[1], [], 'Olá').length, 2);
});

void test('only known case statements enter the transcript and scoring', () => {
  const scenario = plantaoCases[0];
  assert.deepEqual(parsePatientReply('F1,F1,F2', scenario), {
    reply: scenario.interview[0].answer + ' ' + scenario.interview[1].answer,
    facts: [0, 1],
  });
  assert.deepEqual(parsePatientReply('UNKNOWN', scenario), {
    reply: 'Não sei informar isso agora.',
    facts: [],
  });
  for (const output of [
    '',
    'F0',
    'F999',
    'F1,',
    'F1,UNKNOWN',
    'Não tenho alergias.',
    'F1\nTome antibiótico.',
  ]) {
    assert.throws(() => parsePatientReply(output, scenario));
  }
});

void test('only existing exact transcripts use prerecorded Faber files', () => {
  for (const { text } of plantaoVoiceLines())
    assert.ok(hasPatientRecording(text));
  assert.equal(
    hasPatientRecording('Uma resposta gerada que nunca foi gravada.'),
    false,
  );
});

void test('plain inference accepts fenced result codes, with a strict boundary around the selection', () => {
  const scenario = plantaoCases[0];
  const fence = '\x60'.repeat(3);
  const wrap = (value) => `${fence}text\n${value}\n${fence}`;
  assert.deepEqual(
    parsePatientReply('<think>\n\n</think>\n' + wrap('F1'), scenario),
    {
      reply: scenario.interview[0].answer,
      facts: [0],
    },
  );
  assert.throws(() => parsePatientReply(wrap('F1, F99'), scenario));
  assert.throws(() =>
    parsePatientReply(wrap('F1') + '\nOutro texto', scenario),
  );
});
