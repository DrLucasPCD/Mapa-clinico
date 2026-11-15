import { cases } from './content';
import { studyPaths } from './study-paths';
import { ultrasoundCases } from './ultrasound-data';

export const gallbladderImage = ultrasoundCases['27525'].zoneViews.gallbladder![0];
const stroke = cases.find(item => item.id === '2604')!;
const abscess = cases.find(item => item.id === '87566')!;
const fracture = cases.find(item => item.id === '164685')!;
const normalUs = ultrasoundCases['148000'];

const knee = studyPaths.find(item => item.id === 'joelho')!;

export const libraryCases = [
  { id: '2604', title: stroke.title, system: 'Neurológico', modality: 'TC', difficulty: 'Intermediário', symptoms: 'Hemiplegia · déficit motor súbito', source: stroke.source, author: stroke.author, image: stroke.images[0].src, destination: 'case' },
  { id: '87566', title: abscess.title, system: 'Neurológico', modality: 'RM', difficulty: 'Avançado', symptoms: 'Febre · fraqueza · déficit focal', source: abscess.source, author: abscess.author, image: abscess.images[14].src, destination: 'case' },
  { id: '164685', title: fracture.title, system: 'Musculoesquelético', modality: 'RX', difficulty: 'Inicial', symptoms: 'Queda · trauma · dor na mão', source: fracture.source, author: fracture.author, image: fracture.images[0].src, destination: 'case' },
  { id: '54521', title: 'Trauma do joelho direito', system: 'Musculoesquelético', modality: 'RM', difficulty: 'Intermediário', symptoms: 'Trauma · dor no joelho · instabilidade', source: knee.case.source, author: knee.case.author, destination: 'path' },
  { id: '27525', title: 'Colelitíase com sombra acústica', system: 'Digestório', modality: 'USG', difficulty: 'Intermediário', symptoms: 'Dor no hipocôndrio direito · cálculo biliar', source: gallbladderImage.source, author: gallbladderImage.author, image: gallbladderImage.image, destination: 'usg' },
  { id: '148000', title: 'Ultrassom abdominal de referência normal', system: 'Digestório', modality: 'USG', difficulty: 'Inicial', symptoms: 'Comparação anatômica · vesícula sem cálculos', source: normalUs.source, author: normalUs.author, image: normalUs.zoneViews.gallbladder![0].image, destination: 'usg' },
] as const;

export type LibraryCase = typeof libraryCases[number];
