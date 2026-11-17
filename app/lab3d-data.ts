import type { DetailedManifestOrgan } from './detailed-models';
import {
  atrialInlets,
  coronaryArteries,
  coronaryVeins,
  heartChambers,
  heartOrgans,
} from './heart-model';

export type LabScale = 'heart' | 'brain' | 'neuron' | 'molecule';
export type LabView = 'natural' | 'colored' | 'ghost';
export type LabAxis = 'axial' | 'coronal' | 'sagital';
export type LabCamera = 'frontal' | 'lateral' | 'superior' | 'oblique';
export type Layer = { id: string; label: string; color: string };

const heartLayer = [
  { id: 'chambers', label: 'Câmaras', color: '#d26770' },
  { id: 'great', label: 'Grandes vasos', color: '#82acf0' },
  { id: 'arteries', label: 'Artérias coronárias', color: '#f78692' },
  { id: 'veins', label: 'Veias cardíacas', color: '#789aef' },
  { id: 'valves', label: 'Valvas e músculos papilares', color: '#f2c380' },
];
const brainLayer = [
  { id: 'frontal', label: 'Lobo frontal', color: '#5f9ff9' },
  { id: 'parietal', label: 'Lobo parietal', color: '#8bc982' },
  { id: 'temporal', label: 'Lobo temporal', color: '#efbd66' },
  { id: 'occipital', label: 'Lobo occipital', color: '#e57482' },
  { id: 'deep', label: 'Estruturas profundas', color: '#ec99b6' },
  { id: 'ventricles', label: 'Ventrículos', color: '#4be5ef' },
  { id: 'cerebellum', label: 'Cerebelo', color: '#dfc469' },
  { id: 'brainstem', label: 'Tronco encefálico', color: '#5ba9e6' },
  { id: 'cranial', label: 'Nervos cranianos', color: '#d7ad66' },
];
export const neuronLayers = [
  { id: 'dendrites', label: 'Dendritos', color: '#e8a962' },
  { id: 'soma', label: 'Corpo celular', color: '#bd94ed' },
  { id: 'axon', label: 'Axônio', color: '#56dbe1' },
  { id: 'myelin', label: 'Bainha de mielina', color: '#b9a6fb' },
  { id: 'terminals', label: 'Terminais axonais', color: '#49e1a1' },
];
export const labLayers = {
  heart: heartLayer,
  brain: brainLayer,
  neuron: neuronLayers,
  molecule: [],
};

export function labOrganLayer(
  organ: DetailedManifestOrgan,
  scope: 'heart' | 'brain',
) {
  const id = organ.organ_id;
  if (scope === 'heart') {
    if (heartChambers.includes(id)) return 'chambers';
    if (organ.path[0] === 'Heart' && /leaflet|papillary/.test(id))
      return 'valves';
    if (organ.path[0] === 'Cardiac vessels')
      return organ.path[1]?.includes('vein') || /vein|sinus/.test(id)
        ? 'veins'
        : 'arteries';
    return heartOrgans.includes(id) ? 'great' : undefined;
  }
  if (organ.path[0] === 'Peripheral nervous system' &&
      /_nerve_(i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii)_[lr]$/.test(id))
    return 'cranial';
  if (organ.path[0] !== 'Central nervous system' || organ.path[1] !== 'Brain')
    return undefined;
  const [, , area, , lobe] = organ.path;
  if (area === 'Cerebrum') {
    if (/sulcus|white_matter_of_telencephalon/.test(id)) return undefined;
    return (
      brainLayer.find((layer) => lobe?.toLowerCase() === layer.id + ' lobe')
        ?.id ?? 'deep'
    );
  }
  if (area === 'Brainstem') return 'brainstem';
  if (area === 'Cerebellum') return 'cerebellum';
  if (area === 'Ventricular system') return 'ventricles';
  return 'deep';
}

const anatomyNames: Record<string, string> = {
  ...Object.fromEntries(
    [...atrialInlets, ...coronaryArteries, ...coronaryVeins].map(
      ({ id, label }) => [id, label],
    ),
  ),
  'bifurcation-of-pulmonary-trunk': 'Bifurcação do tronco pulmonar',
  'right-pulmonary-artery': 'Artéria pulmonar direita',
  'left-pulmonary-artery': 'Artéria pulmonar esquerda',
  'right-atrium': 'Átrio direito',
  'left-atrium': 'Átrio esquerdo',
  'right-ventricle': 'Ventrículo direito',
  'left-ventricle': 'Ventrículo esquerdo',
  'ascending-aorta': 'Aorta ascendente',
  'aortic-arch': 'Arco da aorta',
  'posterior-leaflet-of-left-atrioventricular-valve':
    'Folheto posterior da mitral',
  'inferior-leaflet-of-right-atrioventricular-valve':
    'Folheto inferior da tricúspide',
  'septal-leaflet-of-right-atrioventricular-valve':
    'Folheto septal da tricúspide',
  'right-coronary-leaflet': 'Cúspide coronária direita da aórtica',
  'left-coronary-leaflet': 'Cúspide coronária esquerda da aórtica',
  'non-coronary-leaflet': 'Cúspide não coronária da aórtica',
  'anterior-semilunar-leaflet-of-pulmonary-valve':
    'Cúspide anterior da pulmonar',
  'right-semilunar-leaflet-of-pulmonary-valve': 'Cúspide direita da pulmonar',
  'left-semilunar-leaflet-of-pulmonary-valve': 'Cúspide esquerda da pulmonar',
  'anterior-papillary-muscle-of-right-ventricle':
    'Músculo papilar anterior do VD',
  'inferior-papillary-muscle-of-right-ventricle':
    'Músculo papilar inferior do VD',
  'septal-papillary-muscle-of-right-ventricle': 'Músculo papilar septal do VD',
  'inferior-papillary-muscle-of-left-ventricle':
    'Músculo papilar inferior do VE',

  'pulmonary-trunk': 'Tronco pulmonar',
  'inferior-vena-cava': 'Veia cava inferior',
  'corpus-callosum': 'Corpo caloso',
  hypothalamus: 'Hipotálamo',
  hippocampus: 'Hipocampo',
  'amygdaloid-body': 'Amígdala',
  'caudate-nucleus': 'Núcleo caudado',
  putamen: 'Putâmen',
  'globus-pallidus': 'Globo pálido',
  thalamus: 'Tálamo',
  'lateral-ventricle': 'Ventrículo lateral',
  'third-ventricle': 'Terceiro ventrículo',
  'fourth-ventricle': 'Quarto ventrículo',
  pons: 'Ponte',
  midbrain: 'Mesencéfalo',
  'medulla-oblongata': 'Bulbo',
  'optic-chiasm': 'Quiasma óptico',
  'precentral-gyrus': 'Giro pré-central',
  'postcentral-gyrus': 'Giro pós-central',
  'superior-frontal-gyrus': 'Giro frontal superior',
  'middle-frontal-gyrus': 'Giro frontal médio',
  'middle-temporal-gyrus': 'Giro temporal médio',
  'inferior-temporal-gyrus': 'Giro temporal inferior',
  'occipital-pole': 'Polo occipital',
  'temporal-pole': 'Polo temporal',
  'lentiform-nucleus': 'Núcleo lentiforme',
  fornix: 'Fórnix',
  'red-nucleus': 'Núcleo rubro',
};
export function labOrganName(id: string, fallback: string) {
  const at = id.match(/-(left|right)$/);
  return (
    anatomyNames[id] ??
    (at && anatomyNames[id.slice(0, -at[0].length)]
      ? anatomyNames[id.slice(0, -at[0].length)] +
        (at[1] === 'left' ? ' · esquerdo' : ' · direito')
      : fallback)
  );
}

export const coronaryStages = [
  {
    title: 'Trajeto da coronária',
    text: 'Observe a descendente anterior no sulco entre os ventrículos. Ative o fluxo coronário para acompanhar o sentido do sangue na artéria.',
  },
  {
    title: 'Placa e lúmen',
    text: 'A placa está representada em amarelo. Compare o espaço livre para o fluxo antes e depois dela.',
  },
  {
    title: 'Fio-guia',
    text: 'Arraste o controle para acompanhar o fio atravessando o trecho estreitado no modelo.',
  },
  {
    title: 'Balão',
    text: 'Compare o balão vazio e expandido. A animação representa a abertura do lúmen.',
  },
  {
    title: 'Stent',
    text: 'Uma malha permanece no trecho tratado e o balão sai da cena. Compare o fluxo com a etapa da placa.',
  },
] as const;

export const axisLabels = {
  axial: 'Axial',
  coronal: 'Coronal',
  sagital: 'Sagital',
};
