import { cases } from './content';
import { studyPaths } from './study-paths';
import { ultrasoundCases } from './ultrasound-data';

export const gallbladderImage = ultrasoundCases['27525'].zoneViews.gallbladder![0];
export const biliaryImagingReference = 'https://gravitas.acr.org/ACPortal/GetDataForOneTopic?topicId=132';
const stroke = cases.find(item => item.id === '2604')!;

export const interview = [
  { question: 'Como a dor começou e quanto tempo durou?', answer: 'Começou depois do jantar, durou cerca de duas horas e cedeu. Já tive um episódio parecido.', key: true },
  { question: 'Teve febre ou calafrios?', answer: 'Não tive febre nem calafrios.', key: true },
  { question: 'Notou pele amarela ou urina escura?', answer: 'Não notei nenhuma dessas alterações.', key: true },
  { question: 'Teve mudança na visão?', answer: 'Não.', key: false },
  { question: 'A dor piora quando movimenta o ombro?', answer: 'Não muda quando mexo o ombro.', key: false },
];

export const plantaoDecisions = [
  {
    title: 'Qual exame de imagem você pediria primeiro?',
    hint: 'Pense em um exame que mostre cálculos na vesícula e permita avaliar as vias biliares.',
    options: ['Radiografia simples de abdome', 'Ultrassonografia do quadrante superior direito', 'Colangiorressonância como primeiro exame'],
    correct: 1,
    explanation: 'Neste cenário com suspeita de origem biliar, a ultrassonografia é usualmente apropriada como exame inicial. Ela permite procurar cálculos e avaliar a vesícula e as vias biliares.',
  },
  {
    title: 'Qual achado você identifica na imagem?',
    hint: 'Observe os focos mais brilhantes no lúmen e a faixa escura em profundidade.',
    options: ['Focos ecogênicos com sombra acústica posterior', 'Reforço acústico atrás dos focos', 'Líquido livre ao redor da vesícula'],
    correct: 0,
    explanation: 'Os focos hiperecogênicos estão na vesícula e atenuam o feixe. A perda de ecos atrás deles produz sombra acústica.',
  },
  {
    title: 'Qual hipótese melhor integra a história simulada e o exame?',
    hint: 'Considere a duração da dor, sua resolução e a localização dos cálculos.',
    options: ['Colangite aguda', 'Colecistite aguda estabelecida', 'Colelitíase sintomática com cólica biliar'],
    correct: 2,
    explanation: 'A dor episódica que cedeu e os cálculos intravesiculares favorecem cólica biliar neste cenário. Cálculos isolados não estabelecem colecistite. Dor persistente, febre ou icterícia mudariam a investigação.',
  },
];

export const visualTasks = [
  { id: 'us-shadow', title: 'Sombra acústica no USG', prompt: 'Marque o centro da sombra escura imediatamente atrás do cálculo central.', image: gallbladderImage.image, source: gallbladderImage.source, credit: gallbladderImage.author + ' · Radiopaedia', licence: 'https://radiopaedia.org/licence', target: { x: .53, y: .68, rx: .073, ry: .106 }, explanation: 'A sombra se estende em profundidade a partir do cálculo ecogênico, na direção do feixe.' },
  { id: 'ct-mca', title: 'Artéria hiperdensa na TC', prompt: 'Marque o segmento hiperdenso da artéria cerebral média direita na TC de admissão.', image: stroke.images[0].src, source: stroke.source, credit: stroke.author + ' · Radiopaedia', licence: 'https://radiopaedia.org/licence', target: { x: .35, y: .365, rx: .092, ry: .032 }, explanation: 'Na TC axial, o lado direito do paciente aparece à esquerda da tela. Procure a hiperdensidade linear no trajeto da cerebral média.' },
  { id: 'rm-patella', title: 'Patela na RM', prompt: 'Marque o centro da patela na imagem T1, no painel esquerdo.', image: '/study/knee-mri-hellerhoff.jpg', source: 'https://commons.wikimedia.org/wiki/File:VKB-Riss_MRT_T1_PDW_sag.jpg', credit: 'Hellerhoff · Wikimedia Commons', licence: 'https://creativecommons.org/licenses/by-sa/3.0/', target: { x: .091, y: .315, rx: .041, ry: .101 }, explanation: 'A patela fica à frente do fêmur distal. Seu interior tem sinal medular alto na sequência T1, delimitado pela cortical escura.' },
] as const;
export const atlasVisualTask = {
  id: 'atlas-patella', title: 'Patela no Atlas 3D',
  prompt: 'Clique no osso situado à frente da articulação do joelho direito.',
  target: 'patella-right',
  choices: [{ id: 'femur-right', label: 'Osso superior' }, { id: 'tibia-right', label: 'Osso inferior' }, { id: 'patella-right', label: 'Osso pequeno anterior' }],
  explanation: 'A patela é o pequeno osso anterior ao fêmur distal, incorporado ao mecanismo extensor do joelho.',
} as const;

const abscess = cases.find(item => item.id === '87566')!;
const fracture = cases.find(item => item.id === '164685')!;
const knee = studyPaths.find(item => item.id === 'joelho')!;
const normalUs = ultrasoundCases['148000'];

export const libraryCases = [
  { id: '2604', title: stroke.title, system: 'Neurológico', modality: 'TC', difficulty: 'Intermediário', symptoms: 'Hemiplegia · déficit motor súbito', source: stroke.source, author: stroke.author, image: stroke.images[0].src, destination: 'case' },
  { id: '87566', title: abscess.title, system: 'Neurológico', modality: 'RM', difficulty: 'Avançado', symptoms: 'Febre · fraqueza · déficit focal', source: abscess.source, author: abscess.author, image: abscess.images[14].src, destination: 'case' },
  { id: '164685', title: fracture.title, system: 'Musculoesquelético', modality: 'RX', difficulty: 'Inicial', symptoms: 'Queda · trauma · dor na mão', source: fracture.source, author: fracture.author, image: fracture.images[0].src, destination: 'case' },
  { id: '54521', title: 'Trauma do joelho direito', system: 'Musculoesquelético', modality: 'RM', difficulty: 'Intermediário', symptoms: 'Trauma · dor no joelho · instabilidade', source: knee.case.source, author: knee.case.author, destination: 'path' },
  { id: '27525', title: 'Colelitíase com sombra acústica', system: 'Digestório', modality: 'USG', difficulty: 'Intermediário', symptoms: 'Dor no hipocôndrio direito · cálculo biliar', source: gallbladderImage.source, author: gallbladderImage.author, image: gallbladderImage.image, destination: 'usg' },
  { id: '148000', title: 'Ultrassom abdominal de referência normal', system: 'Digestório', modality: 'USG', difficulty: 'Inicial', symptoms: 'Comparação anatômica · vesícula sem cálculos', source: normalUs.source, author: normalUs.author, image: normalUs.zoneViews.gallbladder![0].image, destination: 'usg' },
] as const;

export type LibraryCase = typeof libraryCases[number];
