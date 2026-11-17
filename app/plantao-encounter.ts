import type { PlantaoScenario } from './plantao-cases';

export const patientReplies = {
  unknown: 'Não sei informar isso agora.',
  greeting: 'Olá. Pode me perguntar o que precisar.',
  reassurance: 'Certo. Obrigado por me explicar.',
  clarify: 'Não tenho essa informação agora. Pode perguntar de outro jeito?',
} as const;

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const stopWords = new Set(
  'a o as os ao aos de da do das dos por para se e ou eu ele ela me te em no na nos nas um uma que qual quais quando como ficou fica alguma algum onde foi teve tem teria teve estava estou voce senhor senhora sente sentiu notou conta diga quero saber dia pode pediu ainda ja estou usa uso coisa outro outra'.split(
    ' ',
  ),
);

const onset =
  /\b(comec\w*|inicio|iniciou|primeir\w*|evolu\w*|durou|duracao|desde|de repente|subit\w*|ultimo momento|ultima vez|quanto tempo|que horas)\b/;
const associated =
  /\b(outros sintomas|mais algum sintoma|alem (d[ao]s? \w+)|junto|associad\w*|mais alguma coisa)\b/;
const context =
  /\b(antecedent\w*|historico|histor[yi]a (previa|medica)|doencas previ\w*|doencas cronicas|fator de risco|teve isso antes|episodio parecido)\b/;
const painPattern = /\b(ondas|colic\w*|continu\w*|vai e volta)\b/;
const concepts = [
  /\b(remedi\w*|medicamento\w*|medicac\w*|comprimido\w*)\b/,
  /\b(anticoagul\w*|afin\w* o sangue|varfarin\w*|apixaban\w*|rivaroxaban\w*)\b/,
  /\b(cirurg\w*|oper\w*|procediment\w*)\b/,
  /\b(febre|calafri\w*|temperatura alta|trem\w* (?:de|com) frio|corpo quente)\b/,
  /\b(icter\w*|amarel\w*|urina escura|olhos amarelos)\b/,
  /\b(cefaleia|dor de cabeca)\b/,
  /\b(dormencia|formig\w*|parestes\w*)\b/,
  /\b(ferida\w*|cort\w*|pele abert\w*)\b/,
  /\b(vomit\w*|emese)\b/,
  /\b(dispneia|falta de ar|ofeg\w*|dificuldade (para |de )?respirar)\b/,
  /\b(deitad\w*|deitar|ortopneia)\b/,
  /\b(evacu\w*|fezes|gases|soltar pum)\b/,
  /\b(hemodialise|dialise|tratamento (d[eo] |para o )?ri[mn])\b/,
  /\b(braco|perna|lado|face|esquerd\w*|direit\w*)\b/,
  /\b(on[dt]e do[ie]|onde doi mais|local\w* da dor|ponto (de maior dor|mais doloroso)|em que parte|maior dor|sente a dor)\b/,
  /\b(bateu|impact\w*|mecanismo|caiu|queda)\b/,
  painPattern,
  /\b(sangra\w*|sangue)\b/,
];

export type Communication = { introduced: boolean; supported: boolean };

export function assessCommunication(text: string): Communication {
  const value = normalize(text);
  return {
    introduced:
      /\b(me chamo|meu nome e|eu sou (a |o )?(medic\w*|doutor\w*)|sou (a |o )?(medic\w*|doutor\w*|estudante|dr|dra)|vou (te |lhe )?atender)\b/.test(
        value,
      ),
    supported:
      /\b(mantenha a calma|fique tranquil\w*|vamos (te |lhe )?(ajudar|cuidar|resolver)|vou (te |lhe )?(ajudar|explicar)|entendo (a |sua |o )|imagino (como|que)|sinto muito|estou aqui (com voce|para ajudar)|um passo de cada vez)\b/.test(
        value,
      ),
  };
}

function terms(text: string) {
  return new Set(
    text.split(' ').filter((word) => word.length > 2 && !stopWords.has(word)),
  );
}

export function resolvePatientTurn(
  scenario: PlantaoScenario,
  text: string,
): Communication & { index?: number; answer: string } {
  const value = normalize(text);
  const communication = assessCommunication(text);
  const exact = scenario.interview.findIndex(
    ({ question }) => normalize(question) === value,
  );
  if (exact >= 0)
    return {
      ...communication,
      index: exact,
      answer: scenario.interview[exact].answer,
    };
  if (/\b(alerg\w*|reacao alergica)\b/.test(value)) {
    const allergy = scenario.interview.findIndex(({ question }) =>
      /\b(alerg\w*|reacao alergica)\b/.test(normalize(question)),
    );
    return allergy === -1
      ? { ...communication, answer: patientReplies.unknown }
      : {
          ...communication,
          index: allergy,
          answer: scenario.interview[allergy].answer,
        };
  }
  const words = terms(value);
  let best: { index: number; points: number } | undefined;
  let ambiguous = false;

  scenario.interview.forEach(({ question, answer }, index) => {
    const q = normalize(question);
    const a = normalize(answer);
    let points = 0;
    for (const concept of concepts) {
      if (concept.test(value))
        points += concept.test(q) ? 5 : concept.test(a) ? 3 : 0;
    }
    const specific = concepts.some((pattern) => pattern.test(value));
    const requiresContent =
      !specific ||
      onset.test(value) ||
      associated.test(value) ||
      context.test(value);
    if (
      requiresContent &&
      onset.test(value) &&
      onset.test(q) &&
      !/\b(apareceu de uma vez|foi aumentando|de repente)\b/.test(q)
    )
      points += 5;
    if (associated.test(value) && associated.test(q)) points += 5;
    if (context.test(value) && context.test(q)) points += 5;
    // Short queries have little context. Require a clinical cue or at least two overlapping terms.
    const overlap = [...terms(q)].filter((word) => words.has(word)).length;
    points += Math.min(2, overlap) * (overlap > 1 ? 2 : 1);
    if (
      /\b(apareceu de uma vez|ta piorando|foi aumentando|de repente)\b/.test(
        value,
      ) &&
      /\b(apareceu de uma vez|foi aumentando|de repente)\b/.test(q)
    )
      points += 6;
    if (points < 4) return;
    if (!best || points > best.points) {
      best = { index, points };
      ambiguous = false;
    } else if (points === best.points) ambiguous = true;
  });

  if (best && !ambiguous) {
    return {
      ...communication,
      index: best.index,
      answer: scenario.interview[best.index].answer,
    };
  }
  if (
    /^(oi|ola|bom dia|boa tarde|boa noite)$/.test(value) ||
    communication.introduced
  )
    return { ...communication, answer: patientReplies.greeting };
  if (communication.supported)
    return { ...communication, answer: patientReplies.reassurance };
  if (
    /\b(como (voce |o senhor |a senhora )?se chama|seu nome|qual (e )?a sua idade|quantos anos)\b/.test(
      value,
    )
  ) {
    return {
      ...communication,
      answer: `${patientIdentity(scenario).name}. ${scenario.patient}.`,
    };
  }
  if (
    /\b(o que (aconteceu|trouxe voce|esta sentindo)|queixa principal|por que veio|como posso ajudar)\b/.test(
      value,
    )
  )
    return { ...communication, answer: scenario.complaint };
  return { ...communication, answer: patientReplies.clarify };
}

const changeOverTime =
  /\b(passou|passar|cedeu|melhorou|sumiu|continua|ainda doi|ainda esta doendo|parou de doer|persiste)\b/;

export function resolvePatientConversation(
  scenario: PlantaoScenario,
  text: string,
  previousAnswer?: string,
) {
  const first = resolvePatientTurn(scenario, text);
  const firstFacts = first.index === undefined ? [] : [first.index];
  // A new topic (such as fever or when lying down) must not reuse the last fact.
  const value = normalize(text);
  if (
    first.answer === patientReplies.unknown ||
    (first.index !== undefined &&
      normalize(scenario.interview[first.index].question) === value)
  )
    return { ...first, facts: firstFacts };
  if (
    first.index === undefined &&
    previousAnswer &&
    changeOverTime.test(value) &&
    !concepts.some((topic) => topic !== painPattern && topic.test(value))
  ) {
    const followUp = scenario.interview.findIndex(
      ({ question, answer }) =>
        answer === previousAnswer &&
        onset.test(normalize(question)) &&
        changeOverTime.test(normalize(answer)),
    );
    if (followUp >= 0)
      return {
        ...first,
        answer: scenario.interview[followUp].answer,
        facts: [followUp],
      };
  }
  const parts = text
    .split(/\?\s*|\s+(?:e|ou)\s+/i)
    .filter((part) => part.trim());
  if (parts.length > 1) {
    const facts = [
      ...new Set(
        parts.flatMap((part) => {
          const { index } = resolvePatientTurn(scenario, part);
          return index === undefined ? [] : [index];
        }),
      ),
    ];
    if (facts.length > 1)
      return {
        ...first,
        facts,
        answer: facts
          .map((index) => scenario.interview[index].answer)
          .join(' '),
      };
  }
  return { ...first, facts: firstFacts };
}

const vitalFields = [
  ['pulse', 'FC', 'Frequência cardíaca', 'bpm'],
  ['pressure', 'PA', 'Pressão arterial', 'mmHg'],
  ['respiration', 'FR', 'Frequência respiratória', 'irpm'],
  ['temperature', 'Temp.', 'Temperatura', '°C'],
  ['saturation', 'SpO₂', 'Saturação periférica', '%'],
] as const;
type Vital = (typeof vitalFields)[number][0];
type Vitals = Partial<Record<Vital, string>>;
const sampleVitals: Record<string, Vitals> = {
  biliary: {
    pulse: '76',
    pressure: '118/74',
    respiration: '16',
    temperature: '36,6',
    saturation: '98',
  },
  stroke: {
    pulse: '82',
    pressure: '168/92',
    respiration: '18',
    temperature: '36,7',
    saturation: '97',
  },
  'hand-trauma': {
    pulse: '84',
    pressure: '120/78',
    respiration: '18',
    temperature: '36,7',
    saturation: '98',
  },
  'fever-focal': {
    pulse: '104',
    pressure: '118/72',
    respiration: '20',
    saturation: '97',
  },
  dyspnea: {
    pulse: '93',
    pressure: '131/78',
    respiration: '23',
    temperature: '36,8',
    saturation: '94',
  },
  obstruction: {
    pulse: '102',
    pressure: '108/70',
    respiration: '20',
    temperature: '37,0',
    saturation: '97',
  },
  hypotension: {
    pulse: '122',
    respiration: '28',
    temperature: '36,7',
    saturation: '93',
  },
  'unilateral-dyspnea': {
    pulse: '102',
    pressure: '124/78',
    respiration: '23',
    saturation: '94',
  },
  'pleuritic-pain': {
    pulse: '112',
    pressure: '119/76',
    respiration: '27',
    saturation: '92',
  },
  'pregnancy-spotting': {
    pulse: '88',
    pressure: '111/68',
    respiration: '16',
    temperature: '36,6',
    saturation: '98',
  },
  'burn-respiratory-failure': { saturation: '88' },
};

const physicalFindings: Record<string, Readonly<Record<string, string>>> = {
  biliary: {
    Inspeção: 'Sem icterícia no exame do cenário.',
    Palpação: 'Sem dor persistente após a resolução da crise.',
  },
  stroke: {
    'Exame neurológico':
      'Hemiparesia à esquerda envolvendo face, braço e perna.',
    'Glicemia capilar': '105 mg/dL.',
  },
  'hand-trauma': {
    Inspeção: 'Edema no bordo ulnar da mão direita e pele íntegra.',
    'Exame neurovascular': 'Perfusão e sensibilidade distais preservadas.',
  },
  'fever-focal': {
    'Exame neurológico': 'Paresia à direita associada a cefaleia.',
  },
  dyspnea: {
    Ausculta: 'Murmúrio vesicular reduzido bilateralmente nas bases.',
    Percussão: 'Macicez à percussão das bases pulmonares.',
  },
  obstruction: {
    Inspeção: 'Abdome distendido.',
    Palpação: 'Abdome doloroso, sem rigidez.',
  },
  hypotension: {
    Circulação: 'Taquicardia e má perfusão. Pressão arterial de 85/52 mmHg.',
  },
  'unilateral-dyspnea': {
    Ausculta: 'Murmúrio vesicular reduzido à direita.',
  },
  'orthopnea-and-edema': {
    Ausculta: 'Estertores em ambos os pulmões.',
  },
  'acute-epigastric-pain': {
    Palpação: 'Dor abdominal difusa com defesa.',
  },
  'shoulder-contour-loss': {
    Inspeção: 'Perda do contorno lateral do ombro.',
    Mobilidade: 'Mobilidade muito limitada no exame inicial.',
  },
  'newborn-respiratory-distress': {
    Inspeção: 'Taquipneia e retrações durante o monitoramento.',
  },
  'cancer-saddle-numbness': {
    'Exame neurológico': 'Déficit bilateral e alteração sensitiva em sela.',
  },
};

export function examFindings(scenario: PlantaoScenario) {
  return physicalFindings[scenario.id.split('~')[0]] ?? {};
}

export function patientVitals(scenario: PlantaoScenario) {
  const exam = normalize(scenario.exam);
  const authored = sampleVitals[scenario.id.split('~')[0]];
  const pressure = scenario.exam.match(
    /\b(?:PA|pressão arterial)\s*(?:de\s*)?(\d{2,3}\s*\/\s*\d{2,3})\s*mmHg/i,
  )?.[1];
  const temperature = scenario.exam.match(/\b(\d{2}[,.]\d)\s*°\s*C/i)?.[1];
  const observed: Vitals = {
    pressure,
    temperature:
      temperature ?? (/\bafebril\b/.test(exam) ? 'Afebril' : undefined),
    pulse: /\btaquicardia\b/.test(exam) ? 'Taquicardia' : undefined,
    respiration: /\btaquipneia\b/.test(exam) ? 'Taquipneia' : undefined,
    saturation: /\bhipoxemia\b/.test(exam) ? 'Hipoxemia' : undefined,
  };
  return vitalFields.map(([id, short, label, unit]) => {
    const value =
      id === 'pressure'
        ? (pressure ?? authored?.pressure)
        : id === 'temperature'
          ? (temperature ?? authored?.temperature ?? observed.temperature)
          : (authored?.[id] ?? observed[id]);
    return {
      id,
      short,
      label,
      value,
      unit: value && /^\d/.test(value) ? unit : '',
    };
  });
}

export function patientIdentity(scenario: PlantaoScenario) {
  const description = normalize(scenario.patient);
  const age = Number(description.match(/(\d+) anos/)?.[1] ?? 0);
  const older = age >= 60 || /\bidos[oa]\b/.test(description);
  const female = /\b(mulher|gestante)\b/.test(description);
  const male = /\bhomem\b/.test(description);
  const child = /\b(crianca|lactente|recem nascido|adolescente|escolar)\b/.test(
    description,
  );
  const nameSeed = Array.from(scenario.id.split('~')[0]).reduce(
    (sum, value) => sum + value.charCodeAt(0),
    0,
  );
  const names = female
    ? ['Marina', 'Lívia', 'Helena', 'Júlia', 'Beatriz', 'Clara']
    : male
      ? ['Daniel', 'Paulo', 'André', 'Rafael', 'Eduardo', 'Miguel']
      : ['Alex', 'Ariel', 'Dani', 'Cris', 'Nico', 'Noa'];
  return {
    name: names[nameSeed % names.length],
    portrait: child
      ? 'pediatric'
      : female
        ? older
          ? 'older-female'
          : 'female'
        : male
          ? older
            ? 'older-male'
            : 'male'
          : 'neutral',
    speaker: child ? 'Relato do responsável ou da equipe' : 'Paciente simulado',
  };
}

export function requestedIntervention(text: string) {
  const value = normalize(text);
  if (
    !/^(?:(?:eu )?(?:quero|vou|gostaria de|peco|solicito|vamos) |(?:pedir|solicitar|medir|aferir|avaliar|fazer|verificar) )/.test(
      value,
    )
  )
    return undefined;
  if (
    /\b(sinais vitais|pressao arterial|frequencia cardiaca|saturacao)\b/.test(
      value,
    )
  )
    return 'vitals';
  if (/\b(exame fisico|auscult\w*|palp\w*|inspec\w*)\b/.test(value))
    return 'exam';
  if (
    /\b(exames? de imagem|exames? complementares?|tomografia|ressonancia|ultrass\w*|raio x|radiograf\w*|rm|tc|usg)\b/.test(
      value,
    )
  )
    return 'investigate';
  return undefined;
}
