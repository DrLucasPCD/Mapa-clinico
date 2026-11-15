import { cases } from './content';
import { ultrasoundCases, type UltrasoundView } from './ultrasound-data';

export const visualModalities = ['TC', 'RM', 'RX', 'USG', 'Atlas 3D'] as const;
export type VisualModality = (typeof visualModalities)[number];
export type VisualMedia = {
  image: string;
  source: string;
  licence: string;
  credit: string;
};
type VisualTask = VisualMedia & {
  id: string;
  modality: Exclude<VisualModality, 'Atlas 3D'>;
  title: string;
  prompt: string;
  target: { x: number; y: number; rx: number; ry: number };
  explanation: string;
};

const gallbladderImage = ultrasoundCases['27525'].zoneViews.gallbladder![0];
const stroke = cases.find((item) => item.id === '2604')!;
const abscess = cases.find((item) => item.id === '87566')!;
const fracture = cases.find((item) => item.id === '164685')!;
const normalUs = ultrasoundCases['148000'].zoneViews;
function ultrasoundMedia({
  image,
  source,
  author,
}: UltrasoundView): VisualMedia {
  return {
    image,
    source,
    credit: author + ' · Radiopaedia',
    licence: 'https://radiopaedia.org/licence',
  };
}

// Original figures are pinned to keep answer coordinates stable across discovery runs.
const published = {
  adrenal: {
    image: '/study/achados/adrenal.webp',
    source: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13752510/',
    licence: 'https://creativecommons.org/licenses/by/4.0/',
    credit:
      'AlMaimoni R, AlFaraj A, AlSaif O, AlWosaibei A, Busbaih A, Hussein S. · Figura 1 · PubMed Central',
  },
  abdominalWall: {
    image: '/study/achados/parede-abdominal.webp',
    source: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13750455/',
    licence: 'https://creativecommons.org/licenses/by/4.0/',
    credit: 'Han JH, Kang SI, Kim S. · Figura 1 · PubMed Central',
  },
  migratedStent: {
    image: '/study/achados/stent-migrado.webp',
    source: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13750454/',
    licence: 'https://creativecommons.org/licenses/by/4.0/',
    credit:
      'Alshamsi S, Faris M, Alsayed O, Javed SM, Al Aleeli S, Mohammed R. · Figura 1 · PubMed Central',
  },
  cervicalNode: {
    image: '/study/achados/linfonodo-cervical.webp',
    source: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13753505/',
    licence: 'https://creativecommons.org/licenses/by/4.0/',
    credit: 'David R, Khan Basheer J. · Figura 1 · PubMed Central',
  },
  pancreas: {
    image: '/study/achados/pancreas.webp',
    source: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13748112/',
    licence: 'https://creativecommons.org/licenses/by/4.0/',
    credit:
      'Sazal RS, Faisal AA, Sikder S, Ahmed M, Mubin MRUS, Ifti SS. · Figura 3 · PubMed Central',
  },
  thalamus: {
    image: '/study/achados/talamo.webp',
    source: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13739398/',
    licence: 'https://creativecommons.org/licenses/by/4.0/',
    credit: 'Ryan S, Best L, Jones L, Donnelly L. · Figura 1 · PubMed Central',
  },
  lumbarSpine: {
    image: '/study/achados/coluna-lombar.webp',
    source: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13738226/',
    licence: 'https://creativecommons.org/licenses/by/4.0/',
    credit: 'He B, Huang T, Tan H, Meng Z, Sun B. · Figura 1 · PubMed Central',
  },
  thoracicSpine: {
    image: '/study/achados/medula-toracica.webp',
    source: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13731194/',
    licence: 'https://creativecommons.org/licenses/by/4.0/',
    credit: 'Huo CW, Mobbs RJ, Wang YY. · Figura 1 · PubMed Central',
  },
  shoulderMri: {
    image: '/study/achados/ombro-rm.webp',
    source: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13729088/',
    licence: 'https://creativecommons.org/licenses/by/4.0/',
    credit:
      'Watanabe C, Harada Y, Matsumura S, Yokoya S, Adachi N. · Figura 3 · PubMed Central',
  },
  cardiacSilhouette: {
    image: '/study/achados/silhueta-cardiaca.webp',
    source: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13747032/',
    licence: 'https://creativecommons.org/licenses/by/4.0/',
    credit: 'Khan A, Keyes DA, Kumar S, Cox LM. · Figura 2 · PubMed Central',
  },
  thumbMass: {
    image: '/study/achados/mao-massa.webp',
    source: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13735907/',
    licence: 'https://creativecommons.org/licenses/by/4.0/',
    credit:
      'Andre JG, Schneidau C, Chang J, Stutz C. · Figura 2 · PubMed Central',
  },
  shoulderRadiograph: {
    image: '/study/achados/ombro-rx.webp',
    source: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13729088/',
    licence: 'https://creativecommons.org/licenses/by/4.0/',
    credit:
      'Watanabe C, Harada Y, Matsumura S, Yokoya S, Adachi N. · Figura 1 · PubMed Central',
  },
  pleuralEffusion: {
    image: '/study/achados/derrame-pleural.webp',
    source: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13695089/',
    licence: 'https://creativecommons.org/licenses/by/4.0/',
    credit: 'Israr S, Ilandari Dewa NS, Teo ME. · Figura 1 · PubMed Central',
  },
  picc: {
    image: '/study/achados/picc.webp',
    source: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13560834/',
    licence: 'https://creativecommons.org/licenses/by/4.0/',
    credit: 'Tsoumpelis JP, Martin SJ, Polomsky M. · Figura 1 · PubMed Central',
  },
  pericardialEffusion: {
    image: '/study/achados/derrame-pericardico.webp',
    source: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13747032/',
    licence: 'https://creativecommons.org/licenses/by/4.0/',
    credit: 'Khan A, Keyes DA, Kumar S, Cox LM. · Figura 3 · PubMed Central',
  },
  glabellarCyst: {
    image: '/study/achados/cisto-glabelar.webp',
    source: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13741461/',
    licence: 'https://creativecommons.org/licenses/by/4.0/',
    credit:
      'Wiedenhoefer R, Feige U, Shah M, Gunst L, Feuchtinger T, Puzik A. · Figura 1 · PubMed Central',
  },
  hepaticCollection: {
    image: '/study/achados/colecao-hepatica.webp',
    source: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13743346/',
    licence: 'https://creativecommons.org/licenses/by/4.0/',
    credit: 'Liu XX, Li ZX, Wu M, Tian M, Ren H. · Figura 1 · PubMed Central',
  },
} satisfies Record<string, VisualMedia>;

export const visualTasks = [
  {
    id: 'us-shadow',
    modality: 'USG',
    title: 'Sombra acústica no USG',
    prompt:
      'Marque o centro da sombra escura imediatamente atrás do cálculo central.',
    image: gallbladderImage.image,
    source: gallbladderImage.source,
    credit: gallbladderImage.author + ' · Radiopaedia',
    licence: 'https://radiopaedia.org/licence',
    target: { x: 0.53, y: 0.68, rx: 0.073, ry: 0.106 },
    explanation:
      'A sombra se estende em profundidade a partir do cálculo ecogênico, na direção do feixe.',
  },
  {
    id: 'ct-mca',
    modality: 'TC',
    title: 'Artéria hiperdensa na TC',
    prompt:
      'Marque o segmento hiperdenso da artéria cerebral média direita na TC de admissão.',
    image: stroke.images[0].src,
    source: stroke.source,
    credit: stroke.author + ' · Radiopaedia',
    licence: 'https://radiopaedia.org/licence',
    target: { x: 0.35, y: 0.365, rx: 0.092, ry: 0.032 },
    explanation:
      'Na TC axial, o lado direito do paciente aparece à esquerda da tela. Procure a hiperdensidade linear no trajeto da cerebral média.',
  },
  {
    id: 'rm-patella',
    modality: 'RM',
    title: 'Patela na RM',
    prompt: 'Marque o centro da patela na imagem T1, no painel esquerdo.',
    image: '/study/knee-mri-hellerhoff.jpg',
    source:
      'https://commons.wikimedia.org/wiki/File:VKB-Riss_MRT_T1_PDW_sag.jpg',
    credit: 'Hellerhoff · Wikimedia Commons',
    licence: 'https://creativecommons.org/licenses/by-sa/3.0/',
    target: { x: 0.091, y: 0.315, rx: 0.041, ry: 0.101 },
    explanation:
      'A patela fica à frente do fêmur distal. Seu interior tem sinal medular alto na sequência T1, delimitado pela cortical escura.',
  },
  {
    id: 'rx-metacarpal-neck',
    modality: 'RX',
    title: 'Fratura no RX da mão',
    prompt:
      'Marque o colo do quinto metacarpo, imediatamente abaixo da articulação do dedo mínimo.',
    image: fracture.images[0].src,
    source: fracture.source,
    credit: fracture.author + ' · Radiopaedia',
    licence: 'https://radiopaedia.org/licence',
    target: { x: 0.68, y: 0.523, rx: 0.045, ry: 0.036 },
    explanation:
      'O colo é a transição entre o corpo e a cabeça do quinto metacarpo. Neste exame, a cortical perde a continuidade nesse nível.',
  },
  {
    id: 'rm-flair-lesion',
    modality: 'RM',
    title: 'Lesão na RM FLAIR',
    prompt:
      'Neste corte axial, marque o centro da lesão arredondada no hemisfério esquerdo do paciente.',
    image: abscess.images[14].src,
    source: abscess.source,
    credit: abscess.author + ' · Radiopaedia',
    licence: 'https://radiopaedia.org/licence',
    target: { x: 0.68, y: 0.699, rx: 0.087, ry: 0.081 },
    explanation:
      'A lesão aparece à direita da tela, rodeada por hipersinal em FLAIR. No relato, as demais sequências e o contexto infeccioso favoreceram abscesso.',
  },
  {
    id: 'us-gallbladder-lumen',
    modality: 'USG',
    title: 'Lúmen da vesícula no USG',
    prompt:
      'No painel esquerdo, marque o centro da região escura no interior da vesícula.',
    image: normalUs.gallbladder![0].image,
    source: normalUs.gallbladder![0].source,
    credit: normalUs.gallbladder![0].author + ' · Radiopaedia',
    licence: 'https://radiopaedia.org/licence',
    target: { x: 0.274, y: 0.219, rx: 0.041, ry: 0.055 },
    explanation:
      'A bile no lúmen é anecoica neste quadro. Compare com o exercício de colelitíase, em que o cálculo brilhante produz uma sombra atrás dele.',
  },
  {
    id: 'ct-adrenal-mass',
    modality: 'TC',
    title: 'Massa suprarrenal na TC',
    ...published.adrenal,
    prompt:
      'Na TC axial, localize a massa entre o fígado e a região dos grandes vasos, junto à ponta da seta branca.',
    target: { x: 0.459, y: 0.467, rx: 0.045, ry: 0.063 },
    explanation:
      'A lesão está na topografia da suprarrenal direita e tem atenuação heterogênea. O relato a caracterizou como feocromocitoma após a investigação.',
  },
  {
    id: 'ct-abdominal-wall',
    modality: 'TC',
    title: 'Ossificação na parede abdominal',
    ...published.abdominalWall,
    prompt:
      'Marque o foco com densidade óssea na linha média da parede abdominal anterior, no painel axial A.',
    target: { x: 0.246, y: 0.399, rx: 0.032, ry: 0.051 },
    explanation:
      'Nesse corte, o foco está na parede anterior, superficial às alças. A imagem coronal ajuda a acompanhar sua extensão junto à cicatriz.',
  },
  {
    id: 'ct-migrated-stent',
    modality: 'TC',
    title: 'Prótese migrada na TC',
    ...published.migratedStent,
    prompt:
      'No painel coronal central, marque o foco com a prótese biliar migrada, próximo à ponta da seta na fossa ilíaca direita.',
    target: { x: 0.444, y: 0.763, rx: 0.041, ry: 0.064 },
    explanation:
      'A prótese migrada está envolta em material fecal no ponto de obstrução. As alças a montante aparecem dilatadas no estudo.',
  },
  {
    id: 'ct-necrotic-node',
    modality: 'TC',
    title: 'Linfonodo cervical na TC',
    ...published.cervicalNode,
    prompt:
      'Marque o centro do linfonodo com área hipodensa indicado pela seta azul maior no lado esquerdo do paciente.',
    target: { x: 0.6, y: 0.351, rx: 0.041, ry: 0.051 },
    explanation:
      'A área de menor atenuação representa necrose no linfonodo. Esse padrão precisa ser correlacionado com a história e outros exames para definir a causa.',
  },
  {
    id: 'ct-pancreatic-calcifications',
    modality: 'TC',
    title: 'Calcificações pancreáticas',
    ...published.pancreas,
    prompt:
      'Marque o agrupamento de calcificações pancreáticas indicado pela seta vermelha que parte da esquerda da tela.',
    target: { x: 0.453, y: 0.272, rx: 0.065, ry: 0.065 },
    explanation:
      'Os focos muito densos localizam-se no pâncreas neste relato de pancreatite crônica calcificante.',
  },
  {
    id: 'rm-medial-thalamus',
    modality: 'RM',
    title: 'Hipersinal talâmico no FLAIR',
    ...published.thalamus,
    prompt:
      'No painel inicial, à esquerda, localize o hipersinal medial do tálamo junto à ponta da seta verde.',
    target: { x: 0.293, y: 0.521, rx: 0.032, ry: 0.052 },
    explanation:
      'O painel de controle mostra resolução do hipersinal descrito pelos autores. No caso, o achado ocorreu em um quadro de encefalopatia de Wernicke.',
  },
  {
    id: 'rm-lumbar-intracanal',
    modality: 'RM',
    title: 'Lesão intracanal lombar',
    ...published.lumbarSpine,
    prompt:
      'Marque o centro da lesão com realce no canal vertebral em L4–L5, vista no painel sagital A.',
    target: { x: 0.3, y: 0.474, rx: 0.039, ry: 0.07 },
    explanation:
      'A lesão comprime o saco dural. O estudo anatomopatológico identificou material discal no caso publicado.',
  },
  {
    id: 'rm-thoracic-cyst',
    modality: 'RM',
    title: 'Cisto dorsal à medula na RM',
    ...published.thoracicSpine,
    prompt:
      'No painel axial à direita, marque o espaço hiperintenso do cisto, imediatamente atrás da medula.',
    target: { x: 0.673, y: 0.644, rx: 0.027, ry: 0.044 },
    explanation:
      'O cisto aracnoide ocupa o espaço dorsal e desloca a medula para a frente. A vista sagital mostra a extensão longitudinal.',
  },
  {
    id: 'rm-shoulder-deposit',
    modality: 'RM',
    title: 'Depósito na articulação do ombro',
    ...published.shoulderMri,
    prompt:
      'Localize a lesão indicada pela seta no painel axial C, no lado direito da figura.',
    target: { x: 0.805, y: 0.682, rx: 0.047, ry: 0.1 },
    explanation:
      'A lesão está na região glenoumeral. O caso descreveu depósito de cristais de pirofosfato de cálcio, correlacionado com radiografias e histologia.',
  },
  {
    id: 'rx-cardiac-silhouette',
    modality: 'RX',
    title: 'Silhueta cardíaca no RX de tórax',
    ...published.cardiacSilhouette,
    prompt:
      'Marque o interior da silhueta cardíaca, entre os pulmões e acima do diafragma.',
    target: { x: 0.636, y: 0.6, rx: 0.111, ry: 0.143 },
    explanation:
      'A projeção AP portátil pode ampliar a silhueta cardíaca. A radiografia, isoladamente, não distingue aumento das câmaras de derrame pericárdico.',
  },
  {
    id: 'rx-thumb-mass',
    modality: 'RX',
    title: 'Massa calcificada junto ao polegar',
    ...published.thumbMass,
    prompt:
      'No painel frontal A, à esquerda, localize a pequena massa junto ao primeiro metacarpo, na base do polegar.',
    target: { x: 0.252, y: 0.63, rx: 0.029, ry: 0.052 },
    explanation:
      'A lesão está adjacente ao primeiro metacarpo. As incidências adicionais ajudam a confirmar sua relação com o osso e os tecidos moles.',
  },
  {
    id: 'rx-shoulder-calcification',
    modality: 'RX',
    title: 'Calcificação no RX do ombro',
    ...published.shoulderRadiograph,
    prompt:
      'No painel C, marque a região calcificada junto à articulação, abaixo da seta amarela.',
    target: { x: 0.846, y: 0.249, rx: 0.052, ry: 0.079 },
    explanation:
      'A calcificação está na região glenoumeral. O caso correlaciona sua localização nas três incidências e na ressonância.',
  },
  {
    id: 'rx-pleural-effusion',
    modality: 'RX',
    title: 'Derrame pleural no RX de tórax',
    ...published.pleuralEffusion,
    prompt:
      'Marque o seio costofrênico direito apagado, no mesmo lado do marcador R.',
    target: { x: 0.139, y: 0.702, rx: 0.054, ry: 0.054 },
    explanation:
      'O líquido arredonda ou apaga o ângulo que normalmente é agudo entre o diafragma e a parede lateral. Nesta imagem, o achado é bilateral.',
  },
  {
    id: 'rx-picc-tip',
    modality: 'RX',
    title: 'Ponta de PICC no RX de tórax',
    ...published.picc,
    prompt:
      'Siga o trajeto do PICC e marque sua ponta junto à seta preta na região cavoatrial.',
    target: { x: 0.376, y: 0.417, rx: 0.044, ry: 0.045 },
    explanation:
      'No relato, a seta assinala a ponta do cateter no segmento inferior da veia cava superior, próximo ao átrio direito.',
  },
  {
    id: 'us-pericardial-fluid',
    modality: 'USG',
    title: 'Derrame pericárdico no ecocardiograma',
    ...published.pericardialEffusion,
    prompt:
      'Marque o espaço anecoico pericárdico junto à ponta da seta vermelha inferior, fora das câmaras.',
    target: { x: 0.392, y: 0.769, rx: 0.06, ry: 0.055 },
    explanation:
      'O líquido é visto como um espaço escuro externo às câmaras. Para avaliar tamponamento, é necessário correlacionar a imagem dinâmica com a hemodinâmica.',
  },
  {
    id: 'us-glabellar-cyst',
    modality: 'USG',
    title: 'Lesão cística superficial na glabela',
    ...published.glabellarCyst,
    prompt:
      'No painel superior em escala de cinza, marque a lesão superficial escura situada acima da linha óssea brilhante.',
    target: { x: 0.342, y: 0.182, rx: 0.113, ry: 0.048 },
    explanation:
      'A imagem mostra uma massa superficial encapsulada. Uma janela superficial de ultrassom não define, sozinha, eventual extensão intracraniana.',
  },
  {
    id: 'us-liver-collection',
    modality: 'USG',
    title: 'Coleção hepática no USG',
    ...published.hepaticCollection,
    prompt:
      'Marque o interior da grande coleção heterogênea delimitada pelos cálipers, no fígado.',
    target: { x: 0.496, y: 0.427, rx: 0.119, ry: 0.097 },
    explanation:
      'A coleção é predominantemente hipoecoica, com material ecogênico no interior. No caso publicado, ela correspondeu a um abscesso hepático.',
  },
  {
    id: 'us-portal-vein',
    modality: 'USG',
    title: 'Veia porta no USG',
    ...ultrasoundMedia(normalUs.liver![1]),
    prompt:
      'No painel direito, marque o lúmen da veia porta principal, indicado pela sigla MPV.',
    target: { x: 0.78, y: 0.285, rx: 0.074, ry: 0.035 },
    explanation:
      'A veia porta apresenta paredes ecogênicas. Neste quadro, seu lúmen aparece acima do segmento marcado como veia cava inferior.',
  },
  {
    id: 'us-right-renal-sinus',
    modality: 'USG',
    title: 'Seio renal direito',
    ...ultrasoundMedia(normalUs['right-kidney']![0]),
    prompt:
      'No painel esquerdo, marque a região central mais ecogênica do rim direito.',
    target: { x: 0.295, y: 0.309, rx: 0.094, ry: 0.062 },
    explanation:
      'A gordura e as interfaces do seio renal explicam o centro mais brilhante, em contraste com o parênquima periférico.',
  },
  {
    id: 'us-left-renal-parenchyma',
    modality: 'USG',
    title: 'Parênquima renal esquerdo',
    ...ultrasoundMedia(normalUs['left-kidney']![0]),
    prompt:
      'No painel direito, marque o parênquima do rim esquerdo na borda voltada para o transdutor, acima do seio ecogênico.',
    target: { x: 0.826, y: 0.235, rx: 0.076, ry: 0.047 },
    explanation:
      'A borda do rim é menos ecogênica que o seio central. O alvo corresponde ao parênquima renal voltado para a superfície do exame.',
  },
  {
    id: 'us-splenic-parenchyma',
    modality: 'USG',
    title: 'Parênquima esplênico',
    ...ultrasoundMedia(normalUs.spleen![0]),
    prompt:
      'No painel esquerdo, localize o parênquima homogêneo do baço, acima do hilo.',
    target: { x: 0.269, y: 0.208, rx: 0.072, ry: 0.079 },
    explanation:
      'O parênquima tem granulação relativamente homogênea. As interfaces mais ecogênicas se concentram perto do hilo e dos limites do órgão.',
  },
  {
    id: 'us-bladder-transverse',
    modality: 'USG',
    title: 'Bexiga em corte transversal',
    ...ultrasoundMedia(normalUs.bladder![0]),
    prompt:
      'Marque o centro anecoico da bexiga no painel transversal à direita.',
    target: { x: 0.769, y: 0.445, rx: 0.131, ry: 0.119 },
    explanation:
      'A urina aparece escura no interior da bexiga. Observe o reforço acústico atrás do lúmen em relação aos tecidos vizinhos.',
  },
  {
    id: 'us-stone-second-view',
    modality: 'USG',
    title: 'Cálculos na vesícula em outra janela',
    ...ultrasoundMedia(ultrasoundCases['27525'].zoneViews.gallbladder![1]),
    prompt:
      'Marque um dos cálculos brilhantes do terço central da vesícula, na origem das sombras verticais.',
    target: { x: 0.543, y: 0.487, rx: 0.14, ry: 0.052 },
    explanation:
      'Na vista alternativa, os focos ecogênicos continuam projetando sombras posteriores. O alvo aceita os cálculos da região central.',
  },
] as const satisfies readonly VisualTask[];
export const atlasVisualTask = {
  id: 'atlas-patella',
  modality: 'Atlas 3D',
  title: 'Patela no Atlas 3D',
  prompt: 'Clique no osso situado à frente da articulação do joelho direito.',
  target: 'patella-right',
  choices: [
    { id: 'femur-right', label: 'Osso superior' },
    { id: 'tibia-right', label: 'Osso inferior' },
    { id: 'patella-right', label: 'Osso pequeno anterior' },
  ],
  explanation:
    'A patela é o pequeno osso anterior ao fêmur distal, incorporado ao mecanismo extensor do joelho.',
} as const;

export type VisualId =
  | (typeof visualTasks)[number]['id']
  | typeof atlasVisualTask.id;
