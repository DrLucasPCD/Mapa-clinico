import { cases } from './content';
import { ultrasoundCases } from './ultrasound-data';

type AtlasTarget = {
  id: string;
  label: string;
  detail: string;
  maleOnly?: boolean;
};

type Question = {
  id: string;
  prompt: string;
  options: string[];
  correct: number;
  explanation: string;
};

type StudyPath = {
  id: string;
  title: string;
  system: string;
  summary: string;
  targets: AtlasTarget[];
  focus: [string, string, string, string];
  images: { src: string; label: string }[];
  imageTask: string;
  findings: string;
  imageCredit?: { label: string; url: string; licence: string };
  case: { title: string; presentation: string; discussion: string; author: string; source: string };
  references: { label: string; url: string }[];
  questions: Question[];
};

const stroke = cases.find(item => item.id === '2604')!;
const biliary = ultrasoundCases['27525'];

export const studyPaths: StudyPath[] = [
  {
    id: 'avc',
    title: 'AVC e circulação cerebral',
    system: 'Neuroanatomia',
    summary: 'Relacione a artéria cerebral média, a TC de crânio e o lado do déficit motor.',
    targets: [
      { id: 'middle-cerebral-artery-m1-segment-right', label: 'Artéria cerebral média direita (M1)', detail: 'O segmento M1 começa na bifurcação da carótida interna e segue lateralmente rumo ao sulco lateral. Seus ramos incluem perfurantes para estruturas profundas.', maleOnly: true },
      { id: 'internal-carotid-artery-right', label: 'Carótida interna direita', detail: 'Siga o vaso até sua divisão terminal em artérias cerebral anterior e cerebral média.', maleOnly: true },
    ],
    focus: [
      'Identifique a carótida interna e a origem da artéria cerebral média.',
      'Relacione o trajeto da artéria cerebral média com as faces laterais dos lobos frontal, parietal e temporal.',
      'Correlacione o lado dos achados na TC com o lado do déficit motor.',
      'Separe o achado vascular (artéria hiperdensa) dos sinais de alteração do parênquima ao comparar as duas TCs.',
    ],
    images: stroke.images,
    imageTask: 'Compare a TC de admissão com a do dia seguinte. Observe a densidade do vaso e a distinção entre substância cinzenta e branca.',
    findings: stroke.findings,
    case: {
      title: stroke.title,
      presentation: stroke.presentation,
      discussion: stroke.explanation,
      author: stroke.author,
      source: stroke.source,
    },
    references: [{ label: 'Artéria cerebral média · Radiopaedia', url: 'https://radiopaedia.org/articles/middle-cerebral-artery' }],
    questions: [
      {
        id: 'lado', prompt: stroke.question, options: stroke.options, correct: stroke.correct,
        explanation: 'As fibras da via corticoespinal cruzam predominantemente no bulbo. Uma lesão supratentorial direita pode explicar a hemiplegia esquerda.',
      },
      {
        id: 'tc', prompt: 'Além da hiperdensidade da artéria, qual achado parenquimatoso é descrito na TC de admissão?',
        options: ['Realce em anel', 'Perda da diferenciação entre substância cinzenta e branca', 'Dilatação isolada dos ventrículos'],
        correct: 1, explanation: 'A fonte descreve perda da diferenciação no território da cerebral média direita. No controle, a hipoatenuação do parênquima é mais evidente.',
      },
    ],
  },
  {
    id: 'biliar',
    title: 'Dor no hipocôndrio direito',
    system: 'Aparelho digestório',
    summary: 'Explore as vias biliares e reconheça a sombra acústica em um caso de colelitíase.',
    targets: [
      { id: 'gallbladder', label: 'Vesícula biliar', detail: 'Localize o fundo, o corpo e o colo na face visceral do fígado. A vesícula armazena e concentra bile.' },
      { id: 'bile-duct', label: 'Ducto biliar', detail: 'O ducto cístico se une ao hepático comum para formar o colédoco, que conduz a bile em direção ao duodeno.' },
    ],
    focus: [
      'Localize a vesícula na face inferior do fígado.',
      'Trace o caminho da bile da vesícula até o duodeno.',
      'Diferencie um cálculo visto na vesícula de um achado no colédoco pela localização.',
      'Descreva quais achados estão documentados no caso e quais informações seriam necessárias para discutir complicações.',
    ],
    images: biliary.zoneViews.gallbladder!.map(view => ({ src: view.image, label: view.label })),
    imageTask: 'Nas duas vistas, procure focos brilhantes no interior da vesícula e observe o que acontece com os ecos atrás deles.',
    findings: 'A fonte documenta múltiplos cálculos na vesícula e redução dos ecos em profundidade atrás deles, produzindo sombra acústica posterior.',
    case: {
      title: 'Dor no quadrante superior direito e sombra acústica',
      presentation: 'Mulher de 35 anos com dor no quadrante superior direito do abdome.',
      discussion: 'Neste caso, a localização intravesicular dos focos ecogênicos com sombra posterior sustenta colelitíase. A página do caso descreve os cálculos e a sombra acústica.',
      author: biliary.author,
      source: biliary.source,
    },
    references: [{ label: 'Fígado, pâncreas e vesícula · OpenStax', url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/23-6-accessory-organs-in-digestion-the-liver-pancreas-and-gallbladder' }],
    questions: [
      {
        id: 'sombra', prompt: 'Qual achado atrás dos focos ecogênicos favorece cálculos no exame apresentado?',
        options: ['Reforço acústico posterior', 'Sombra acústica posterior', 'Fluxo ao Doppler colorido'],
        correct: 1, explanation: 'A atenuação do feixe pelos cálculos reduz os ecos em profundidade e forma uma faixa escura posterior.',
      },
      {
        id: 'ductos', prompt: 'A união do ducto cístico com o ducto hepático comum forma qual estrutura?',
        options: ['Ducto pancreático principal', 'Ducto hepático direito', 'Colédoco'],
        correct: 2, explanation: 'O colédoco recebe a bile por essa confluência e segue em direção ao duodeno.',
      },
    ],
  },
  {
    id: 'joelho',
    title: 'Joelho e ligamento cruzado anterior',
    system: 'Musculoesquelético',
    summary: 'Relacione a anatomia dos cruzados à RM e à instabilidade após trauma.',
    targets: [
      { id: 'anterior-cruciate-ligament-right', label: 'Ligamento cruzado anterior direito', detail: 'Une a área intercondilar anterior da tíbia à face medial do côndilo lateral do fêmur. Restringe a translação anterior da tíbia.', maleOnly: true },
      { id: 'posterior-cruciate-ligament-right', label: 'Ligamento cruzado posterior direito', detail: 'Parte da região intercondilar posterior da tíbia em direção ao côndilo femoral medial. Restringe a translação posterior da tíbia.', maleOnly: true },
      { id: 'patella-right', label: 'Patela direita', detail: 'A patela situa-se à frente da articulação e ajuda a orientar o lado anterior no corte sagital.', maleOnly: true },
    ],
    focus: [
      'Identifique a patela e diferencie o cruzado anterior do posterior.',
      'Relacione a fixação tibial do cruzado anterior à sua função.',
      'Procure continuidade das fibras nos cortes sagitais e correlacione com a história de trauma.',
      'No caso original, diferencie o achado direto no ligamento dos sinais indiretos de instabilidade.',
    ],
    images: [{ src: '/study/knee-mri-hellerhoff.jpg', label: 'RM de referência de outro exame · sagital, T1 à esquerda e densidade de prótons à direita' }],
    imageTask: 'Use o corte sagital de referência para localizar a incisura intercondilar. Em seguida, examine as sequências sagitais do caso original na etapa Caso.',
    findings: 'A imagem de referência mostra ruptura do ligamento cruzado anterior. No exame do caso, a fonte relata descontinuidade das fibras, hipersinal e translação anterior da tíbia.',
    imageCredit: {
      label: 'Hellerhoff · Wikimedia Commons',
      url: 'https://commons.wikimedia.org/wiki/File:VKB-Riss_MRT_T1_PDW_sag.jpg',
      licence: 'https://creativecommons.org/licenses/by-sa/3.0/',
    },
    case: {
      title: 'Trauma do joelho direito',
      presentation: 'Homem de 30 anos com dor no joelho direito após trauma da articulação.',
      discussion: 'A RM descrita no caso mostra descontinuidade do ligamento cruzado anterior e translação anterior da tíbia. O cruzado posterior mantém continuidade, embora esteja encurvado.',
      author: 'Hidayatullah Hamidi, com colaboração de Najibullah Rasouly',
      source: 'https://radiopaedia.org/cases/54521',
    },
    references: [{ label: 'Anatomia das articulações sinoviais · OpenStax', url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/9-6-anatomy-of-selected-synovial-joints' }],
    questions: [
      {
        id: 'funcao', prompt: 'Qual movimento da tíbia em relação ao fêmur o cruzado anterior ajuda a limitar?',
        options: ['Translação posterior', 'Translação anterior', 'Flexão plantar'],
        correct: 1, explanation: 'O cruzado anterior restringe a translação anterior da tíbia. A translação anterior pode ser um sinal indireto de lesão.',
      },
      {
        id: 'rm', prompt: 'Qual é o achado direto no ligamento cruzado anterior descrito no caso?',
        options: ['Descontinuidade das fibras', 'Translação anterior da tíbia', 'Encurvamento do ligamento cruzado posterior'],
        correct: 0, explanation: 'A descontinuidade é vista nas próprias fibras do cruzado anterior. A translação tibial e o encurvamento do cruzado posterior são achados indiretos neste contexto.',
      },
    ],
  },
];

export const pathSteps = ['Atlas', 'Imagem', 'Caso', 'Questões', 'Revisão'] as const;
export type PathStep = typeof pathSteps[number];
export const pathCoreSteps = ['Atlas', 'Imagem', 'Caso'] as const;
type CoreStep = typeof pathCoreSteps[number];

export type QuestionRecord = { answer: number; due: number; streak: number };
export type PathProgress = {
  lastPath?: string;
  paths: Record<string, { step?: PathStep; studied?: CoreStep[]; questions?: Record<string, QuestionRecord> }>;
};

const day = 24 * 60 * 60 * 1000;
const reviewIntervals = [1, 3, 7, 14, 30];

export function reviewAnswer(answer: number, correct: number, now: number, previous?: QuestionRecord): QuestionRecord {
  if (answer !== correct) return { answer, streak: 0, due: now };
  if (previous && previous.answer === correct && previous.due > now) return previous;
  const streak = Math.min((previous?.streak ?? 0) + 1, reviewIntervals.length);
  return { answer, streak, due: now + reviewIntervals[streak - 1] * day };
}
