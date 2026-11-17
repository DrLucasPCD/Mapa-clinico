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
const {
  resolvePatientTurn,
  resolvePatientConversation,
  requestedIntervention,
  patientReplies,
  patientVitals,
  patientIdentity,
  examFindings,
} = load('./plantao-encounter');

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
  for (const reply of Object.values(patientReplies))
    assert.ok(clips.has(plantaoVoiceUrl(reply)));
});

test('patients answer suggestions for every case, including reordered generated interviews', () => {
  for (const base of plantaoCases) {
    for (const scenario of [base, getPlantaoScenario(base.id + '~6a')]) {
      scenario.interview.forEach(({ question, answer }, index) => {
        const turn = resolvePatientTurn(scenario, question);
        assert.equal(turn.index, index, scenario.id);
        assert.equal(turn.answer, answer, scenario.id);
      });
      assert.deepEqual(patientIdentity(scenario), patientIdentity(base));
      assert.deepEqual(patientVitals(scenario), patientVitals(base));
    }
  }
});

test('natural questions, introductions and reassurance use supported data and dialogue', () => {
  const stroke = getPlantaoScenario('stroke');
  const start = resolvePatientTurn(
    stroke,
    'Me chamo Carla. Quando foi o último momento sem sintomas?',
  );
  assert.equal(start.introduced, true);
  assert.equal(start.index, 0);
  assert.equal(start.answer, stroke.interview[0].answer);
  assert.equal(resolvePatientTurn(stroke, 'Começou de repente?').index, 1);
  assert.equal(
    resolvePatientTurn(stroke, 'Toma algum remédio para afinar o sangue?')
      .index,
    2,
  );
  const support = resolvePatientTurn(
    stroke,
    'Mantenha a calma, vamos resolver.',
  );
  assert.equal(support.supported, true);
  assert.equal(support.index, undefined);
  assert.equal(support.answer, patientReplies.reassurance);
  assert.equal(
    resolvePatientTurn(stroke, 'Qual seu tipo sanguíneo?').answer,
    patientReplies.clarify,
  );
  const biliary = getPlantaoScenario('biliary~1k');
  const yellow = resolvePatientTurn(biliary, 'Os olhos ficaram amarelados?');
  assert.match(yellow.answer, /não notei/i);
});

void test('the patient answers paraphrases, follow-ups and two topics without loading an AI model', () => {
  const scenario = getPlantaoScenario('biliary');
  const start = resolvePatientConversation(
    scenario,
    'Me conta quanto tempo a dor ficou incomodando.',
  );
  assert.deepEqual(start.facts, [0]);
  assert.equal(
    resolvePatientConversation(
      scenario,
      'Depois disso, chegou a passar?',
      start.answer,
    ).answer,
    start.answer,
  );
  const symptoms = resolvePatientConversation(
    scenario,
    'Chegou a tremer de frio ou percebeu que seus olhos ficaram amarelos?',
  );
  assert.deepEqual(symptoms.facts, [1, 2]);
  assert.equal(
    symptoms.answer,
    scenario.interview[1].answer + ' ' + scenario.interview[2].answer,
  );
  assert.equal(
    resolvePatientConversation(
      scenario,
      'Tem alergia a algum remédio?',
      start.answer,
    ).answer,
    patientReplies.allergyUnknown,
  );
  assert.equal(
    resolvePatientConversation(scenario, 'E a febre, continua?', start.answer)
      .answer,
    scenario.interview[1].answer,
  );
});

void test('a request for a pain rating uses the patient’s description without inventing a number or scoring another clue', () => {
  const hand = getPlantaoScenario('hand-trauma');
  const result = resolvePatientConversation(
    hand,
    'De 1 a 10, como está sua dor?',
  );
  assert.equal(
    result.answer,
    'É difícil dar uma nota. Dói perto do dedo mínimo.',
  );
  assert.deepEqual(result.facts, []);
  const variant = getPlantaoScenario('hand-trauma~1');
  assert.equal(
    resolvePatientConversation(variant, 'De 0 a 10?').answer,
    'É difícil dar uma nota. Dói pouco abaixo da articulação do dedo mínimo.',
  );
  const rated = {
    ...hand,
    interview: [
      ...hand.interview,
      {
        question: 'Qual nota de 0 a 10 para a dor?',
        answer: 'Agora está em seis.',
        key: true,
      },
    ],
  };
  assert.equal(
    resolvePatientConversation(rated, 'De zero a dez, quanto dói?').answer,
    'Agora está em seis.',
  );
  assert.equal(
    resolvePatientConversation(hand, 'Onde você sente a maior dor?').answer,
    hand.interview[1].answer,
  );
  assert.equal(
    resolvePatientConversation(hand, 'De 0 a 10, quanto está o enjoo?').answer,
    patientReplies.clarify,
  );
});

test('clinical commands open the appropriate intervention without treating histories as exam orders', () => {
  assert.equal(
    requestedIntervention('Vamos aferir os sinais vitais'),
    'vitals',
  );
  assert.equal(requestedIntervention('Vou fazer a palpação'), 'exam');
  assert.equal(requestedIntervention('Solicito uma tomografia'), 'investigate');
  assert.equal(
    requestedIntervention('Você já fez uma tomografia antes?'),
    undefined,
  );
  assert.equal(
    patientVitals(getPlantaoScenario('hypotension')).find(
      (item) => item.id === 'pressure',
    ).value,
    '85/52',
  );
  assert.equal(
    patientVitals(getPlantaoScenario('fever-focal')).find(
      (item) => item.id === 'temperature',
    ).value,
    '38,5',
  );
  assert.equal(
    patientVitals(getPlantaoScenario('glabellar-nodule')).filter(
      (item) => item.value,
    ).length,
    0,
  );
  assert.equal(
    examFindings(getPlantaoScenario('stroke~21'))['Glicemia capilar'],
    '105 mg/dL.',
  );
  assert.ok(
    !Object.keys(examFindings(getPlantaoScenario('glabellar-nodule'))).length,
  );
});
