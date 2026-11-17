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

void test('only known case statements enter the transcript and scoring, never generated clinical claims', () => {
  const scenario = plantaoCases[0];
  const raw = JSON.stringify({
    kind: 'facts',
    facts: [
      scenario.interview[0].question,
      scenario.interview[0].question,
      scenario.interview[1].question,
    ],
    reply: 'Não tenho alergias. Tome antibiótico.',
  });
  assert.deepEqual(parsePatientReply(raw, scenario), {
    reply: scenario.interview[0].answer + ' ' + scenario.interview[1].answer,
    facts: [0, 1],
  });
  assert.equal(
    parsePatientReply('{"kind":"unknown","facts":[]}', scenario).reply,
    'Não sei informar isso agora.',
  );
  for (const facts of [[5], [-1], ['0'], [0.5], ['Invented question'], null]) {
    assert.throws(() =>
      parsePatientReply(JSON.stringify({ kind: 'facts', facts }), scenario),
    );
  }
  for (const raw of ['{"kind":', '{}', '{"kind":"diagnosis","facts":[]}']) {
    assert.throws(() => parsePatientReply(raw, scenario));
  }
});

void test('a clinical selection labelled as a complaint still answers and scores only the selected evidence', () => {
  const scenario = plantaoCases[0];
  assert.deepEqual(
    parsePatientReply(
      JSON.stringify({
        kind: 'complaint',
        facts: [scenario.interview[1].question, scenario.interview[2].question],
      }),
      scenario,
    ),
    {
      reply: scenario.interview[1].answer + ' ' + scenario.interview[2].answer,
      facts: [1, 2],
    },
  );
  for (const raw of [
    '{"kind":"facts","facts":[]}',
    JSON.stringify({
      kind: 'unknown',
      facts: [scenario.interview[0].question],
    }),
  ]) {
    assert.deepEqual(parsePatientReply(raw, scenario), {
      reply: 'Não sei informar isso agora.',
      facts: [],
    });
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

void test('plain inference accepts fenced JSON while requiring valid case references', () => {
  const scenario = plantaoCases[0];
  const fence = '\x60'.repeat(3);
  const json = JSON.stringify({
    kind: 'facts',
    facts: [scenario.interview[0].question],
  });
  const wrap = (value) => `${fence}json\n${value}\n${fence}`;
  assert.deepEqual(parsePatientReply(wrap(json), scenario), {
    reply: scenario.interview[0].answer,
    facts: [0],
  });
  assert.throws(() =>
    parsePatientReply(
      wrap('{"kind":"facts","facts":["Outra ficha"]}'),
      scenario,
    ),
  );
  assert.throws(() => parsePatientReply(wrap(json.slice(0, -1)), scenario));
});
