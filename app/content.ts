import type { Acquisition } from './image-integration';
export type Lesson = {
  id: string;
  name: string;
  latin: string;
  system: string;
  anatomia: string;
  funcao: string;
  clinica: string;
  levels: string[];
  bridge: string;
  audio?: string;
  source: string;
  origin?: string;
  insertion?: string;
  action?: string;
};
const open = 'https://openstax.org/books/anatomy-and-physiology-2e/pages/';
export const lessons: Lesson[] = [
  {
    id: 'heart',
    name: 'Coração',
    latin: 'Cor · Mediastino médio',
    system: 'cardiovascular',
    anatomia:
      'O coração possui dois átrios e dois ventrículos. O septo separa os lados direito e esquerdo; as valvas orientam o fluxo entre câmaras e grandes artérias.',
    funcao:
      'O ventrículo direito impulsiona sangue para os pulmões. O esquerdo o envia à circulação sistêmica. Sístole é a fase de contração; diástole, a de relaxamento e enchimento.',
    clinica:
      'A localização do coração orienta a inspeção, palpação e ausculta. Os focos de ausculta correspondem a locais de melhor transmissão sonora, não à posição exata de cada valva.',
    levels: [
      'Identifique átrios, ventrículos e grandes vasos antes de memorizar seus trajetos.',
      'Relacione pré-carga, contratilidade e pós-carga ao volume sistólico.',
      'Integre dispneia, edema e ausculta com a avaliação por imagem; nenhum sinal isolado confirma insuficiência cardíaca.',
      'Organize hipóteses e sinais de instabilidade. Discuta com a equipe a indicação dos exames conforme o contexto e protocolos locais.',
    ],
    bridge:
      'No RX de tórax PA, o ventrículo esquerdo forma parte do contorno esquerdo inferior. Projeções AP podem ampliar a silhueta cardíaca.',
    audio: '02-coracao',
    source: open + '19-1-heart-anatomy',
  },
  {
    id: 'cerebr',
    name: 'Encéfalo',
    latin: 'Encephalon · Sistema nervoso central',
    system: 'nervous',
    anatomia:
      'O telencéfalo contém córtex, substância branca e núcleos profundos. Tronco encefálico e cerebelo conectam e modulam diferentes funções motoras e sensitivas.',
    funcao:
      'Redes corticais processam informação e planejam ações. Vias motoras descendentes e vias sensitivas estabelecem relações entre o encéfalo, a medula e o corpo.',
    clinica:
      'Localize antes de nomear a doença: compare força, sensibilidade, linguagem e pares cranianos. Um déficit focal agudo exige avaliação urgente.',
    levels: [
      'Reconheça os lobos frontal, parietal, temporal e occipital e os principais sulcos.',
      'Relacione decussação das vias motoras à manifestação contralateral de lesões supratentoriais.',
      'Correlacione hemiparesia, afasia ou negligência com o território vascular, sem inferir diagnóstico apenas pelo atlas.',
      'Construa uma síntese temporal e topográfica. Revise elegibilidade para intervenções com a equipe e diretrizes atuais, sem atrasar a avaliação de urgência.',
    ],
    bridge:
      'TC sem contraste e RM mostram contrastes diferentes. A TC pode demonstrar sangue agudo; DWI e ADC ajudam a avaliar restrição de difusão.',
    audio: '04-cerebro',
    source: open + '13-2-the-central-nervous-system',
  },
  {
    id: 'lungs',
    name: 'Pulmões',
    latin: 'Pulmones · Cavidades pleurais',
    system: 'respiratory',
    anatomia:
      'O pulmão direito tem três lobos; o esquerdo, dois. A pleura visceral reveste os pulmões e a parietal reveste a parede torácica.',
    funcao:
      'Ventilação leva ar aos alvéolos. A troca gasosa depende da difusão e da relação entre ventilação e perfusão.',
    clinica:
      'Compare expansibilidade, percussão e sons respiratórios em regiões simétricas. Dispneia precisa ser interpretada junto de sinais vitais e contexto.',
    levels: [
      'Localize lobos, fissuras e diafragma.',
      'Relacione pressão intrapleural e ação diafragmática à ventilação.',
      'Diferencie padrões de consolidação, derrame e pneumotórax correlacionando exame físico e imagem.',
      'Avalie sinais de gravidade e escolha exames conforme a estabilidade. Achados devem ser discutidos com supervisão clínica.',
    ],
    bridge:
      'Em uma radiografia, ar é radiotransparente. Aumento de opacidade possui diferentes causas e precisa ser localizado e contextualizado.',
    audio: '03-pulmoes',
    source: open + '22-2-the-lungs',
  },
  {
    id: 'deltoid-muscles',
    name: 'Deltoide',
    latin: 'Deltoid',
    system: 'muscular',
    anatomia:
      'Siga os pontos de fixação deste músculo no atlas. Sua disposição espacial ajuda a compreender a direção da força produzida.',
    funcao:
      'Parte anterior: flexão e rotação medial do braço; parte média: abdução; parte posterior: extensão e rotação lateral.',
    clinica:
      'Compare movimento ativo e passivo, força, dor e sensibilidade. A limitação funcional pode ter origem muscular, tendínea, articular ou neurológica.',
    levels: [
      'Localize o músculo e reconheça os ossos de origem e inserção.',
      'Relacione o trajeto das fibras com a ação e a alavanca articular.',
      'Integre força, amplitude de movimento e dor ao exame osteomioarticular.',
      'Construa hipóteses anatômicas e discuta exames complementares e conduta com supervisão.',
    ],
    bridge:
      'A ultrassonografia e a RM demonstram músculos e tendões. A interpretação depende da técnica, do plano e da correlação clínica.',
    origin: 'Terço lateral da clavícula, acrômio e espinha da escápula.',
    insertion: 'Tuberosidade deltoidea do úmero.',
    action:
      'Parte anterior: flexão e rotação medial do braço; parte média: abdução; parte posterior: extensão e rotação lateral.',
    source: 'https://www.ncbi.nlm.nih.gov/books/NBK482410/',
  },
  {
    id: 'rotator-cuff-muscles-supraspinatus',
    name: 'Supraespinal',
    latin: 'Supraspinatus',
    system: 'muscular',
    anatomia:
      'Siga os pontos de fixação deste músculo no atlas. Sua disposição espacial ajuda a compreender a direção da força produzida.',
    funcao:
      'Inicia a abdução do braço e contribui para a estabilização glenoumeral.',
    clinica:
      'Compare movimento ativo e passivo, força, dor e sensibilidade. A limitação funcional pode ter origem muscular, tendínea, articular ou neurológica.',
    levels: [
      'Localize o músculo e reconheça os ossos de origem e inserção.',
      'Relacione o trajeto das fibras com a ação e a alavanca articular.',
      'Integre força, amplitude de movimento e dor ao exame osteomioarticular.',
      'Construa hipóteses anatômicas e discuta exames complementares e conduta com supervisão.',
    ],
    bridge:
      'A ultrassonografia e a RM demonstram músculos e tendões. A interpretação depende da técnica, do plano e da correlação clínica.',
    origin: 'Fossa supraespinosa da escápula (superior à espinha da escápula).',
    insertion: 'Faceta superior do tubérculo maior do úmero.',
    action:
      'Inicia a abdução do braço e contribui para a estabilização glenoumeral.',
    source: 'https://www.ncbi.nlm.nih.gov/books/NBK482410/',
  },
  {
    id: 'rotator-cuff-muscles-infraspinatus',
    name: 'Infraespinal',
    latin: 'Infraspinatus',
    system: 'muscular',
    anatomia:
      'Siga os pontos de fixação deste músculo no atlas. Sua disposição espacial ajuda a compreender a direção da força produzida.',
    funcao: 'Rotação lateral do braço e estabilização glenoumeral.',
    clinica:
      'Compare movimento ativo e passivo, força, dor e sensibilidade. A limitação funcional pode ter origem muscular, tendínea, articular ou neurológica.',
    levels: [
      'Localize o músculo e reconheça os ossos de origem e inserção.',
      'Relacione o trajeto das fibras com a ação e a alavanca articular.',
      'Integre força, amplitude de movimento e dor ao exame osteomioarticular.',
      'Construa hipóteses anatômicas e discuta exames complementares e conduta com supervisão.',
    ],
    bridge:
      'A ultrassonografia e a RM demonstram músculos e tendões. A interpretação depende da técnica, do plano e da correlação clínica.',
    origin: 'Fossa infraespinosa da escápula (inferior à espinha da escápula).',
    insertion:
      'Faceta média do tubérculo maior do úmero, entre as inserções do supraespinal e redondo menor.',
    action: 'Rotação lateral do braço e estabilização glenoumeral.',
    source: 'https://www.ncbi.nlm.nih.gov/books/NBK482410/',
  },
  {
    id: 'rotator-cuff-muscles-subscapularis',
    name: 'Subescapular',
    latin: 'Subscapularis',
    system: 'muscular',
    anatomia:
      'Siga os pontos de fixação deste músculo no atlas. Sua disposição espacial ajuda a compreender a direção da força produzida.',
    funcao: 'Adução e rotação medial do braço; estabilização glenoumeral.',
    clinica:
      'Compare movimento ativo e passivo, força, dor e sensibilidade. A limitação funcional pode ter origem muscular, tendínea, articular ou neurológica.',
    levels: [
      'Localize o músculo e reconheça os ossos de origem e inserção.',
      'Relacione o trajeto das fibras com a ação e a alavanca articular.',
      'Integre força, amplitude de movimento e dor ao exame osteomioarticular.',
      'Construa hipóteses anatômicas e discuta exames complementares e conduta com supervisão.',
    ],
    bridge:
      'A ultrassonografia e a RM demonstram músculos e tendões. A interpretação depende da técnica, do plano e da correlação clínica.',
    origin: 'Face anterior da escápula, na fossa subescapular.',
    insertion: 'Tubérculo menor do úmero.',
    action: 'Adução e rotação medial do braço; estabilização glenoumeral.',
    source: 'https://www.ncbi.nlm.nih.gov/books/NBK482410/',
  },
  {
    id: 'superficial-gluteal-muscles-gluteus-medius',
    name: 'Glúteo médio',
    latin: 'Gluteus medius',
    system: 'muscular',
    anatomia:
      'Siga os pontos de fixação deste músculo no atlas. Sua disposição espacial ajuda a compreender a direção da força produzida.',
    funcao:
      'Abdução do quadril; fibras anteriores auxiliam rotação medial, fibras posteriores auxiliam rotação lateral; estabiliza a pelve no apoio unipodal.',
    clinica:
      'Compare movimento ativo e passivo, força, dor e sensibilidade. A limitação funcional pode ter origem muscular, tendínea, articular ou neurológica.',
    levels: [
      'Localize o músculo e reconheça os ossos de origem e inserção.',
      'Relacione o trajeto das fibras com a ação e a alavanca articular.',
      'Integre força, amplitude de movimento e dor ao exame osteomioarticular.',
      'Construa hipóteses anatômicas e discuta exames complementares e conduta com supervisão.',
    ],
    bridge:
      'A ultrassonografia e a RM demonstram músculos e tendões. A interpretação depende da técnica, do plano e da correlação clínica.',
    origin:
      'Face externa do ílio entre as linhas glúteas anterior e posterior.',
    insertion: 'Facetas lateral e superoposterior do trocânter maior do fêmur.',
    action:
      'Abdução do quadril; fibras anteriores auxiliam rotação medial, fibras posteriores auxiliam rotação lateral; estabiliza a pelve no apoio unipodal.',
    source: 'https://www.ncbi.nlm.nih.gov/books/NBK557509/',
  },
  {
    id: 'rectus-abdominis',
    name: 'Reto abdominal',
    latin: 'Rectus abdominis',
    system: 'muscular',
    anatomia:
      'Siga os pontos de fixação deste músculo no atlas. Sua disposição espacial ajuda a compreender a direção da força produzida.',
    funcao:
      'Flexão do tronco; estabilização e controle da inclinação pélvica; compressão abdominal e auxílio na expiração ativa.',
    clinica:
      'Compare movimento ativo e passivo, força, dor e sensibilidade. A limitação funcional pode ter origem muscular, tendínea, articular ou neurológica.',
    levels: [
      'Localize o músculo e reconheça os ossos de origem e inserção.',
      'Relacione o trajeto das fibras com a ação e a alavanca articular.',
      'Integre força, amplitude de movimento e dor ao exame osteomioarticular.',
      'Construa hipóteses anatômicas e discuta exames complementares e conduta com supervisão.',
    ],
    bridge:
      'A ultrassonografia e a RM demonstram músculos e tendões. A interpretação depende da técnica, do plano e da correlação clínica.',
    origin: 'Crista púbica e sínfise púbica.',
    insertion: 'Processo xifoide e cartilagens costais da 5ª à 7ª costelas.',
    action:
      'Flexão do tronco; estabilização e controle da inclinação pélvica; compressão abdominal e auxílio na expiração ativa.',
    source: 'https://www.ncbi.nlm.nih.gov/books/NBK538328/',
  },
  {
    id: 'liver',
    name: 'Fígado',
    latin: 'Hepar · Hipocôndrio direito',
    system: 'digestive',
    anatomia:
      'O fígado ocupa principalmente o quadrante superior direito, imediatamente abaixo do diafragma. Recebe fluxo da veia porta e da artéria hepática.',
    funcao:
      'Participa do metabolismo, da síntese de proteínas plasmáticas e da produção de bile. O fluxo portal conecta a absorção intestinal ao processamento hepático.',
    clinica:
      'Icterícia, dor e alterações do exame abdominal orientam hipóteses, mas exigem integração com exames laboratoriais e de imagem.',
    levels: [
      'Reconheça relações com diafragma, estômago e vesícula biliar.',
      'Diferencie circulação portal, arterial e drenagem venosa hepática.',
      'Relacione alterações focais e difusas com história, fatores de risco e padrão laboratorial.',
      'Avalie necessidade de exames complementares e discuta limites de interpretação das diferentes fases de contraste.',
    ],
    bridge:
      'A anatomia vascular é importante na TC com contraste. A aparência de uma lesão depende da fase de aquisição.',
    source:
      open +
      '23-6-accessory-organs-in-digestion-the-liver-pancreas-and-gallbladder',
  },
  {
    id: 'metacarpal',
    name: 'Metacarpos',
    latin: 'Ossa metacarpi · Esqueleto da mão',
    system: 'skeletal',
    anatomia:
      'Cinco metacarpos formam a palma da mão. Cada um apresenta base, corpo e cabeça; o quinto se articula com a falange proximal do dedo mínimo.',
    funcao:
      'A arquitetura da mão combina estabilidade e mobilidade para pinça e preensão. O alinhamento dos dedos é essencial à função.',
    clinica:
      'Após trauma, avalie pele, perfusão, sensibilidade e alinhamento rotacional, além da dor focal. Uma radiografia não substitui o exame da mão.',
    levels: [
      'Identifique o primeiro e o quinto metacarpos e oriente a lateralidade.',
      'Relacione alavancas e tendões à posição dos fragmentos em uma fratura.',
      'Descreva localização, desvio, angulação e envolvimento articular em incidências complementares.',
      'Integre deformidade rotacional, feridas e estado neurovascular à discussão da conduta com a equipe.',
    ],
    bridge:
      'Fratura do colo do quinto metacarpo é conhecida como fratura do boxeador, mas pode ocorrer por outros mecanismos.',
    source: 'https://radiopaedia.org/articles/metacarpal-fracture-2',
  },
];
export function lessonFor(id: string) {
  return lessons.find((l) => id.includes(l.id));
}
export type ClinicalCase = {
  id: string;
  title: string;
  modality: string;
  author: string;
  presentation: string;
  findings: string;
  region: string;
  system: string;
  regionLabel: string;
  images: { src: string; label: string }[];
  acquisition?: Acquisition;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  source: string;
  certainty: string;
};
export const cases: ClinicalCase[] = [
  {
    id: '2604',
    title: 'Déficit motor e artéria hiperdensa',
    modality: 'TC',
    author: 'Frank Gaillard',
    presentation:
      'Paciente idoso com hemiplegia à esquerda. Caso publicado na Radiopaedia; idade exata e sexo não informados na apresentação consultada.',
    findings:
      'TC sem contraste com artéria cerebral média direita hiperdensa e redução da diferenciação entre substâncias cinzenta e branca no território correspondente. Um dia depois, há progressão da hipoatenuação.',
    region: 'cerebrum',
    system: 'nervous',
    regionLabel:
      'Hemisfério direito: região de referência. Não é segmentação da lesão do paciente.',
    images: [
      {
        src: '/radiology/ct-admission.jpg',
        label: 'Axial · admissão · sem contraste',
      },
      { src: '/radiology/ct-followup.jpg', label: 'Axial · 1 dia depois' },
    ],
    question: 'Qual lado do encéfalo se relaciona ao déficit motor descrito?',
    options: ['Direito', 'Esquerdo', 'Não existe relação de lateralidade'],
    correct: 0,
    explanation:
      'A via corticoespinal cruza predominantemente no bulbo. Lesões supratentoriais à direita podem produzir déficit motor à esquerda. O atlas destaca o encéfalo como referência, sem reconstruir a extensão real deste infarto.',
    source: 'https://radiopaedia.org/cases/2604',
    certainty: 'Diagnóstico considerado certo pela fonte',
  },
  {
    id: '164685',
    title: 'Trauma da mão e quinto metacarpo',
    modality: 'RX',
    author: 'Jose Rodriguez Vazquez',
    presentation:
      'Mulher, 25 anos, avaliada após queda com trauma da mão direita. A fonte descreve fratura aguda do colo do quinto metacarpo.',
    findings:
      'Fratura do colo do quinto metacarpo direito, com discreto desvio, impactação e angulação.',
    region: 'appendicular-skeleton-fifth-metacarpal-bone-right',
    system: 'skeletal',
    regionLabel:
      'Quinto metacarpo direito como referência. Modelo masculino genérico; não representa a paciente.',
    images: [
      {
        src: '/radiology/rx-hand.jpg',
        label: 'Mão direita · incidência frontal',
      },
    ],
    question: 'Qual estrutura está envolvida na fratura descrita?',
    options: ['Rádio distal', 'Colo do quinto metacarpo', 'Escafoide'],
    correct: 1,
    explanation:
      'A fratura do colo do quinto metacarpo recebe o nome de fratura do boxeador. O nome não determina o mecanismo: nesta paciente, a apresentação foi uma queda.',
    source: 'https://radiopaedia.org/cases/164685',
    certainty: 'Diagnóstico considerado certo pela fonte',
  },
  {
    id: '87566',
    title: 'Febre, déficit focal e lesão cerebral',
    modality: 'RM',
    author: 'Luu Hanh',
    presentation:
      'Homem, 85 anos, com fraqueza súbita do lado direito do corpo e febre.',
    findings:
      'Lesões nos lobos parieto-occipital e temporal esquerdos, com restrição central de difusão, realce em anel e sinal do duplo halo. Achados descritos como compatíveis com abscessos.',
    region: 'cerebrum',
    system: 'nervous',
    regionLabel:
      'Hemisfério esquerdo como referência anatômica; os abscessos não foram segmentados em 3D.',
    images: [
      {
        src: '/radiology/mri-brain.jpg',
        label: 'FLAIR · detalhe anotado do duplo halo',
      },
    ],
    question: 'Qual combinação de achados favorece abscesso neste contexto?',
    options: [
      'Somente o tamanho da lesão',
      'Somente hipersinal em T2',
      'Restrição central de difusão, realce em anel e contexto infeccioso',
    ],
    correct: 2,
    explanation:
      'A combinação favorece abscesso, mas não constitui prova isolada. Outras lesões podem apresentar restrição. A fonte classifica o diagnóstico como quase certo.',
    source: 'https://radiopaedia.org/cases/87566',
    certainty: 'Diagnóstico considerado quase certo pela fonte',
  },
];
