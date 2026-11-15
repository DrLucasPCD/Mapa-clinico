import { visualTasks, type VisualMedia } from './visual-localization';
import { expandedPlantaoCases } from './plantao-expanded';

type InterviewQuestion = { question: string; answer: string; key: boolean };
export type Decision = {
  title: string;
  hint: string;
  options: readonly string[];
  correct: number;
  explanation: string;
};

type PlantaoCase = {
  id: string;
  title: string;
  discipline: string;
  patient: string;
  complaint: string;
  exam: string;
  report: string;
  interviewHint: string;
  interview: readonly InterviewQuestion[];
  decisions: readonly [Decision, Decision, Decision];
  visual: (typeof visualTasks)[number]['id'];
  atlas?: { id: string; name: string };
  reference?: { url: string; label: string };
};

const biliaryInterview = [
  {
    question: 'Como a dor começou e quanto tempo durou?',
    answer:
      'Começou depois do jantar, durou cerca de duas horas e cedeu. Já tive um episódio parecido.',
    key: true,
  },
  {
    question: 'Teve febre ou calafrios?',
    answer: 'Não tive febre nem calafrios.',
    key: true,
  },
  {
    question: 'Notou pele amarela ou urina escura?',
    answer: 'Não notei nenhuma dessas alterações.',
    key: true,
  },
  { question: 'Teve mudança na visão?', answer: 'Não.', key: false },
  {
    question: 'A dor piora quando movimenta o ombro?',
    answer: 'Não muda quando mexo o ombro.',
    key: false,
  },
];

const biliaryDecisions: PlantaoCase['decisions'] = [
  {
    title: 'Qual exame de imagem você pediria primeiro?',
    hint: 'Pense em um exame que mostre cálculos na vesícula e permita avaliar as vias biliares.',
    options: [
      'Radiografia simples de abdome',
      'Ultrassonografia do quadrante superior direito',
      'Colangiorressonância como primeiro exame',
    ],
    correct: 1,
    explanation:
      'Neste cenário com suspeita de origem biliar, a ultrassonografia é usualmente apropriada como exame inicial. Ela permite procurar cálculos e avaliar a vesícula e as vias biliares.',
  },
  {
    title: 'Qual achado você identifica na imagem?',
    hint: 'Observe os focos mais brilhantes no lúmen e a faixa escura em profundidade.',
    options: [
      'Focos ecogênicos com sombra acústica posterior',
      'Reforço acústico atrás dos focos',
      'Líquido livre ao redor da vesícula',
    ],
    correct: 0,
    explanation:
      'Os focos hiperecogênicos estão na vesícula e atenuam o feixe. A perda de ecos atrás deles produz sombra acústica.',
  },
  {
    title: 'Qual hipótese melhor integra a história simulada e o exame?',
    hint: 'Considere a duração da dor, sua resolução e a localização dos cálculos.',
    options: [
      'Colangite aguda',
      'Colecistite aguda estabelecida',
      'Colelitíase sintomática com cólica biliar',
    ],
    correct: 2,
    explanation:
      'A dor episódica que cedeu e os cálculos intravesiculares favorecem cólica biliar neste cenário. Cálculos isolados não estabelecem colecistite. Dor persistente, febre ou icterícia mudariam a investigação.',
  },
];

const cases = [
  {
    id: 'biliary',
    title: 'Dor no hipocôndrio direito',
    discipline: 'Abdome',
    patient: 'Mulher, 35 anos',
    complaint: 'Senti uma dor do lado direito da barriga.',
    exam: 'Afebril, sem icterícia, sem dor persistente à palpação depois que a crise cedeu.',
    report:
      'Múltiplos cálculos intravesiculares com sombra acústica posterior.',
    interviewHint:
      'Pense na evolução da dor e em sinais de inflamação ou obstrução biliar.',
    interview: biliaryInterview,
    decisions: biliaryDecisions,
    visual: 'us-shadow',
    atlas: { id: 'gallbladder', name: 'Vesícula biliar' },
    reference: {
      url: 'https://gravitas.acr.org/ACPortal/GetDataForOneTopic?topicId=132',
      label: 'Escolha do exame · ACR',
    },
  },
  {
    id: 'stroke',
    title: 'Fraqueza súbita de um lado',
    discipline: 'Neurologia',
    patient: 'Homem, 72 anos',
    complaint: 'Meu braço e minha perna esquerdos ficaram fracos de repente.',
    exam: 'Hemiparesia esquerda envolvendo face, braço e perna. Glicemia capilar de 105 mg/dL.',
    report:
      'Sem hemorragia identificada. Artéria cerebral média direita hiperdensa e perda discreta da diferenciação entre substâncias cinzenta e branca no território correspondente.',
    interviewHint:
      'Estabeleça o último momento sem sintomas e procure pistas de um início focal e abrupto.',
    interview: [
      {
        question: 'Quando foi a última vez em que estava sem fraqueza?',
        answer: 'Estava normal há cerca de uma hora, antes do almoço.',
        key: true,
      },
      {
        question: 'A fraqueza apareceu de uma vez ou foi aumentando?',
        answer:
          'Foi de uma vez. Deixei cair o copo e não consegui levantar a perna.',
        key: true,
      },
      {
        question: 'Usa anticoagulante ou teve sangramento recente?',
        answer:
          'Minha família diz que uso remédio para pressão e que não houve sangramento recente.',
        key: true,
      },
      {
        question: 'A fraqueza piora se apoiar o cotovelo?',
        answer: 'Não, continua igual.',
        key: false,
      },
      {
        question: 'Já operou a vesícula?',
        answer: 'Nunca operei.',
        key: false,
      },
    ],
    decisions: [
      {
        title:
          'Qual exame inicial ajuda a distinguir hemorragia de isquemia neste cenário?',
        options: [
          'Radiografia de crânio',
          'TC de crânio sem contraste',
          'Ultrassom de carótidas como único exame',
        ],
        correct: 1,
        hint: 'Escolha um exame rápido que mostre o parênquima e detecte sangue intracraniano.',
        explanation:
          'A TC sem contraste faz parte da avaliação imediata do AVC suspeito. A investigação vascular e a decisão sobre reperfusão dependem do protocolo e da avaliação de urgência.',
      },
      {
        title: 'Qual estrutura apresenta hiperdensidade linear?',
        options: [
          'Artéria cerebral média direita',
          'Artéria cerebral média esquerda',
          'Seio sagital superior',
        ],
        correct: 0,
        hint: 'Na convenção axial, a direita do paciente aparece à esquerda da tela.',
        explanation:
          'O foco linear segue o trajeto da cerebral média direita. No contexto, o sinal sugere trombo arterial.',
      },
      {
        title: 'Qual hipótese integra o início e o lado dos achados?',
        options: [
          'Infarto no hemisfério esquerdo',
          'Mielopatia cervical isolada',
          'AVC isquêmico no território da cerebral média direita',
        ],
        correct: 2,
        hint: 'As fibras motoras que saem do hemisfério direito controlam predominantemente o lado esquerdo.',
        explanation:
          'O déficit contralateral e o sinal vascular direito são coerentes com isquemia no território da cerebral média direita.',
      },
    ],
    visual: 'ct-mca',
    atlas: { id: 'cerebrum', name: 'Encéfalo' },
    reference: {
      url: 'https://acsearch.acr.org/docs/3149012/Narrative/',
      label: 'Imagem no AVC suspeito · ACR',
    },
  },
  {
    id: 'hand-trauma',
    title: 'Dor na mão após queda',
    discipline: 'Trauma e ortopedia',
    patient: 'Mulher, 25 anos',
    complaint: 'Caí com a mão direita no chão. Dói perto do dedo mínimo.',
    exam: 'Edema no bordo ulnar da mão, dor localizada e pele íntegra. Perfusão e sensibilidade distais preservadas.',
    report:
      'Fratura do colo do quinto metacarpo direito com discreta angulação e impactação.',
    interviewHint:
      'Defina o mecanismo, o ponto de maior dor e eventuais sintomas neurovasculares.',
    interview: [
      {
        question: 'Como a mão bateu durante a queda?',
        answer: 'O lado do dedo mínimo bateu primeiro.',
        key: true,
      },
      {
        question: 'Onde você sente a maior dor?',
        answer: 'Pouco abaixo da articulação do dedo mínimo.',
        key: true,
      },
      {
        question: 'Houve dormência ou ferida?',
        answer: 'Não dormiu e não abriu ferida.',
        key: true,
      },
      {
        question: 'Teve sintomas gástricos antes da queda?',
        answer: 'Não.',
        key: false,
      },
      { question: 'Sentiu dor no ombro oposto?', answer: 'Não.', key: false },
    ],
    decisions: [
      {
        title:
          'Qual exame inicial é mais apropriado para a suspeita de fratura?',
        options: [
          'RM da mão com contraste',
          'Ultrassonografia do antebraço',
          'Radiografias da mão direita em incidências complementares',
        ],
        correct: 2,
        hint: 'Comece pelo exame que avalia diretamente a cortical e o alinhamento após trauma.',
        explanation:
          'Radiografias da região são apropriadas inicialmente. Incidências complementares ajudam a caracterizar a fratura e o alinhamento.',
      },
      {
        title: 'Onde está a alteração óssea na radiografia?',
        options: [
          'Colo do quinto metacarpo',
          'Base da falange distal do quinto dedo',
          'Polo proximal do escafoide',
        ],
        correct: 0,
        hint: 'Siga o quinto metacarpo de proximal para distal até pouco antes da articulação metacarpofalângica.',
        explanation:
          'A irregularidade e a angulação aparecem na transição entre o corpo e a cabeça do quinto metacarpo.',
      },
      {
        title:
          'Qual achado clínico adicional é importante verificar antes de orientar o seguimento?',
        options: [
          'Mobilidade da coluna cervical',
          'Desvio rotacional dos dedos ao flexionar a mão',
          'Semelhança do comprimento das unhas',
        ],
        correct: 1,
        hint: 'Observe o alinhamento dos dedos durante a flexão, comparando com a mão oposta.',
        explanation:
          'A sobreposição anormal dos dedos durante a flexão pode revelar rotação. Essa avaliação clínica complementa a medida da angulação radiográfica.',
      },
    ],
    visual: 'rx-metacarpal-neck',
    atlas: {
      id: 'appendicular-skeleton-fifth-metacarpal-bone-right',
      name: 'Quinto metacarpo direito',
    },
    reference: {
      url: 'https://acsearch.acr.org/docs/69418/Narrative/',
      label: 'Imagem no trauma da mão · ACR',
    },
  },
  {
    id: 'fever-focal',
    title: 'Febre e déficit neurológico focal',
    discipline: 'Neurologia',
    patient: 'Homem, 85 anos',
    complaint: 'Estou com febre e sinto dificuldade para mover o lado direito.',
    exam: 'Temperatura de 38,5 °C, paresia direita e cefaleia. O paciente está em avaliação hospitalar.',
    report:
      'Lesões no hemisfério esquerdo com realce em anel e restrição central de difusão no estudo completo. A figura mostra o corte axial FLAIR.',
    interviewHint:
      'Explore a cronologia da febre, da cefaleia e do déficit focal.',
    interview: [
      {
        question: 'O que começou primeiro, a febre ou a fraqueza?',
        answer: 'A febre começou há alguns dias. A fraqueza apareceu hoje.',
        key: true,
      },
      {
        question: 'Teve dor de cabeça diferente do habitual?',
        answer: 'Sim, foi ficando mais forte nos últimos dias.',
        key: true,
      },
      {
        question: 'Qual lado ficou mais fraco?',
        answer: 'O direito, principalmente o braço.',
        key: true,
      },
      {
        question: 'Tem dor no joelho quando caminha?',
        answer: 'Não é o que me trouxe.',
        key: false,
      },
      {
        question: 'Já quebrou algum osso na infância?',
        answer: 'Não lembro de nenhuma fratura.',
        key: false,
      },
    ],
    decisions: [
      {
        title:
          'Qual exame melhor caracteriza uma lesão cerebral e avalia a hipótese de abscesso?',
        options: [
          'RM do encéfalo com difusão, mapa ADC e sequências antes e após contraste',
          'Radiografia dos seios da face isoladamente',
          'Angio-TC cervical como único exame',
        ],
        correct: 0,
        hint: 'Procure uma técnica que avalie tanto difusão no centro da lesão quanto realce periférico.',
        explanation:
          'A RM permite avaliar difusão e padrões de realce. A questão aborda caracterização de lesão suspeita durante a investigação hospitalar.',
      },
      {
        title: 'Onde se localiza a alteração mais evidente neste corte FLAIR?',
        options: [
          'Cerebelo direito',
          'Hemisfério cerebral direito, anteriormente',
          'Hemisfério cerebral esquerdo, posteriormente',
        ],
        correct: 2,
        hint: 'Na vista axial, a lesão posterior que aparece à direita da tela está no hemisfério esquerdo.',
        explanation:
          'A figura mostra uma lesão posterior esquerda com hipersinal periférico. O realce e a restrição de difusão são informações das demais sequências.',
      },
      {
        title: 'Qual hipótese é mais favorecida pelo conjunto de dados?',
        options: [
          'Enxaqueca sem aura',
          'Abscesso cerebral',
          'AVC lacunar isolado',
        ],
        correct: 1,
        hint: 'Integre febre, realce periférico e restrição central de difusão.',
        explanation:
          'O conjunto favorece abscesso no relato clínico. Realce em anel tem diagnósticos diferenciais e precisa ser interpretado com a difusão e o quadro clínico.',
      },
    ],
    visual: 'rm-flair-lesion',
    atlas: { id: 'cerebrum', name: 'Encéfalo' },
    reference: {
      url: 'https://pubmed.ncbi.nlm.nih.gov/37648062/',
      label: 'Imagem no abscesso cerebral · ESCMID',
    },
  },
  {
    id: 'dyspnea',
    title: 'Falta de ar com redução do murmúrio',
    discipline: 'Pneumologia',
    patient: 'Homem, 56 anos',
    complaint: 'Venho cansando cada vez mais para andar.',
    exam: 'Redução bilateral do murmúrio vesicular nas bases e macicez à percussão basal.',
    report:
      'Apagamento dos seios costofrênicos, opacidades basais com menisco e silhueta cardíaca aumentada.',
    interviewHint:
      'Explore velocidade de instalação, sintomas associados e posição que piora o desconforto.',
    interview: [
      {
        question: 'A falta de ar começou de repente?',
        answer: 'Foi aumentando ao longo de uma semana.',
        key: true,
      },
      {
        question: 'Piora quando fica deitado?',
        answer: 'Sim, estou dormindo com mais travesseiros.',
        key: true,
      },
      {
        question: 'Teve febre, calafrios ou escarro purulento?',
        answer: 'Não tive febre, e tossi pouco.',
        key: true,
      },
      { question: 'Seu joelho dói ao dobrar?', answer: 'Não.', key: false },
      {
        question: 'Sente azia depois de comer?',
        answer: 'Não recentemente.',
        key: false,
      },
    ],
    decisions: [
      {
        title:
          'Entre estas opções, qual imagem é apropriada para iniciar a avaliação?',
        options: [
          'RM cardíaca como primeiro exame',
          'Radiografia de tórax',
          'Radiografia de abdome',
        ],
        correct: 1,
        hint: 'A ausculta sugere um achado junto às bases pulmonares e à pleura.',
        explanation:
          'A radiografia permite avaliar as bases e os seios costofrênicos. Outros exames podem caracterizar achados pleurais ou cardíacos conforme o contexto.',
      },
      {
        title: 'Que achado se destaca nas bases pulmonares?',
        options: [
          'Linhas pleurais apicais com ausência de vasos periféricos',
          'Opacidades exclusivamente apicais',
          'Apagamento bilateral dos seios costofrênicos',
        ],
        correct: 2,
        hint: 'Procure os ângulos entre a parede lateral do tórax e as cúpulas diafragmáticas.',
        explanation:
          'As opacidades ascendem nas margens laterais e arredondam os ângulos, formando o sinal do menisco.',
      },
      {
        title: 'O que a radiografia sustenta, sem definir a causa?',
        options: [
          'Derrame pleural bilateral',
          'Pneumotórax bilateral',
          'Consolidação lobar apical',
        ],
        correct: 0,
        hint: 'O líquido pleural tende a se acumular nas regiões dependentes.',
        explanation:
          'O exame sustenta derrames pleurais. No relato original havia também derrame pericárdico, cuja caracterização exigiu avaliação complementar.',
      },
    ],
    visual: 'rx-pleural-effusion',
    atlas: { id: 'lungs', name: 'Pulmões' },
    reference: {
      url: 'https://acsearch.acr.org/docs/3158179/Narrative/',
      label: 'Investigação do derrame pleural · ACR',
    },
  },
  {
    id: 'obstruction',
    title: 'Dor abdominal, distensão e vômitos',
    discipline: 'Abdome',
    patient: 'Homem, 64 anos',
    complaint:
      'Minha barriga inchou, estou vomitando e parei de eliminar gases.',
    exam: 'Abdome distendido e doloroso, sem rigidez. Sinais de desidratação.',
    report:
      'Dilatação do intestino delgado a montante de um foco na fossa ilíaca direita que contém a prótese biliar migrada.',
    interviewHint:
      'Investigue a eliminação de gases e fezes e os procedimentos abdominais prévios.',
    interview: [
      {
        question: 'Quando foi a última vez que eliminou gases ou fezes?',
        answer: 'Ontem cedo. Desde então, não saiu nada.',
        key: true,
      },
      {
        question: 'Já fez cirurgia ou procedimento nas vias biliares?',
        answer: 'Fiz uma endoscopia e colocaram uma prótese há alguns meses.',
        key: true,
      },
      {
        question: 'A dor é contínua ou vem em ondas?',
        answer: 'Vem em ondas fortes. Comecei a vomitar depois.',
        key: true,
      },
      { question: 'Teve zumbido recentemente?', answer: 'Não.', key: false },
      {
        question: 'Houve queda ou torção do tornozelo?',
        answer: 'Não.',
        key: false,
      },
    ],
    decisions: [
      {
        title:
          'Qual exame localiza o ponto de transição e pode avaliar complicações?',
        options: [
          'TC de abdome e pelve com contraste intravenoso, se não contraindicado',
          'Colangiorressonância isolada',
          'Ultrassonografia focada somente na vesícula',
        ],
        correct: 0,
        hint: 'Avalie todo o trajeto das alças e a transição entre segmentos dilatados e colabados.',
        explanation:
          'Na suspeita de obstrução aguda do delgado, a TC de abdome e pelve localiza a transição e ajuda a investigar a causa e possíveis complicações.',
      },
      {
        title: 'O que está indicado pelas setas nos cortes?',
        options: [
          'Cálculo dentro da vesícula',
          'Prótese migrada em meio a material fecal',
          'Hemorragia retroperitoneal',
        ],
        correct: 1,
        hint: 'Compare o foco da fossa ilíaca direita em axial, coronal e sagital.',
        explanation:
          'No caso relatado, a prótese saiu da via biliar e ficou envolta em material fecal no intestino.',
      },
      {
        title: 'Que mecanismo explica melhor o conjunto?',
        options: [
          'Íleo difuso sem ponto de transição',
          'Inflamação isolada da vesícula',
          'Obstrução mecânica do intestino delgado',
        ],
        correct: 2,
        hint: 'Há dilatação a montante de um foco localizado que explica a transição.',
        explanation:
          'Distensão, vômitos, parada de eliminação de gases e ponto de transição sustentam obstrução mecânica neste caso.',
      },
    ],
    visual: 'ct-migrated-stent',
    atlas: { id: 'jejunum', name: 'Jejuno' },
    reference: {
      url: 'https://acsearch.acr.org/docs/69476/Narrative/',
      label: 'Imagem na obstrução intestinal · ACR',
    },
  },
  {
    id: 'hypotension',
    title: 'Hipotensão durante a hemodiálise',
    discipline: 'Cardiologia',
    patient: 'Homem, 56 anos',
    complaint: 'Fiquei muito fraco e com falta de ar durante a sessão.',
    exam: 'PA de 85/52 mmHg, taquicardia e má perfusão. A equipe inicia avaliação imediata à beira do leito.',
    report:
      'O ultrassom à beira do leito mostra derrame pericárdico amplo. No exame dinâmico subsequente há colapso de câmaras direitas.',
    interviewHint:
      'Pergunte sobre o início dos sintomas, a condição renal e o uso de medicamentos.',
    interview: [
      {
        question: 'Quando começaram a fraqueza e a falta de ar?',
        answer: 'Pioraram hoje na sessão. Já tinha desconforto desde ontem.',
        key: true,
      },
      {
        question: 'Qual tratamento faz para a doença renal?',
        answer: 'Faço hemodiálise regularmente.',
        key: true,
      },
      {
        question: 'Usa anticoagulante?',
        answer: 'Uso por causa da fibrilação atrial.',
        key: true,
      },
      {
        question: 'Notou dor em uma articulação recentemente?',
        answer: 'Não.',
        key: false,
      },
      { question: 'Percebeu mudança na audição?', answer: 'Não.', key: false },
    ],
    decisions: [
      {
        title:
          'Que exame à beira do leito pode mostrar líquido ao redor do coração e o efeito sobre suas câmaras?',
        options: [
          'USG abdominal sem avaliação cardíaca',
          'Radiografia de tórax isoladamente',
          'Ecocardiografia',
        ],
        correct: 2,
        hint: 'É necessário observar o pericárdio e o movimento das paredes cardíacas.',
        explanation:
          'A ecocardiografia mostra o líquido e pode avaliar sinais dinâmicos de comprometimento do enchimento.',
      },
      {
        title: 'O que as setas indicam nesta imagem?',
        options: [
          'Espaço anecoico no pericárdio',
          'Coágulo dentro do ventrículo esquerdo',
          'Parede espessada da aorta',
        ],
        correct: 0,
        hint: 'Observe a faixa escura externa às câmaras.',
        explanation:
          'As setas apontam para líquido pericárdico. Os sinais de colapso são avaliados no exame dinâmico.',
      },
      {
        title:
          'Qual hipótese é favorecida por derrame, colapso de câmaras direitas e choque?',
        options: [
          'Derrame sem repercussão hemodinâmica',
          'Tamponamento cardíaco',
          'Pericardite sem derrame',
        ],
        correct: 1,
        hint: 'Considere o que acontece se a pressão externa ao coração compromete o enchimento.',
        explanation:
          'A combinação de instabilidade com sinais ecocardiográficos de restrição ao enchimento favorece tamponamento no relato.',
      },
    ],
    visual: 'us-pericardial-fluid',
    atlas: { id: 'heart', name: 'Coração' },
  },
] as const satisfies readonly PlantaoCase[];

export type PlantaoVariation = { complaint: string; evolution: string };
export type PlantaoReview = { caseId: string; decision: number };
export type PlantaoScenario = Omit<PlantaoCase, 'visual'> &
  VisualMedia & {
    visual?: (typeof visualTasks)[number]['id'];
    modality: string;
    variation: PlantaoVariation;
    generated?: boolean;
  };

const variations: Record<(typeof cases)[number]['id'], PlantaoVariation> = {
  biliary: {
    complaint:
      'Depois de uma refeição, senti dor embaixo das costelas do lado direito.',
    evolution:
      'Começou depois de comer e cedeu por completo naquela mesma noite.',
  },
  stroke: {
    complaint:
      'Tentei me levantar e percebi que não conseguia apoiar a perna esquerda nem segurar o copo.',
    evolution:
      'Minha família me viu bem cerca de 50 minutos antes da fraqueza.',
  },
  'hand-trauma': {
    complaint: 'A mão direita bateu no chão e inchou do lado do dedo mínimo.',
    evolution:
      'Caí e apoiei primeiro a borda da mão direita. A dor começou no mesmo instante.',
  },
  'fever-focal': {
    complaint: 'Depois de alguns dias de febre, meu braço direito ficou fraco.',
    evolution:
      'A febre e a cefaleia vieram antes. A fraqueza focal apareceu hoje.',
  },
  dyspnea: {
    complaint:
      'Estou ficando sem fôlego em caminhadas curtas e não consigo dormir deitado.',
    evolution: 'Passei a cansar mais a cada dia nesta última semana.',
  },
  obstruction: {
    complaint:
      'Fiquei com a barriga estufada, comecei a vomitar e não eliminei mais gases.',
    evolution:
      'Tive cólicas desde ontem, quando parei de evacuar e de eliminar gases.',
  },
  hypotension: {
    complaint: 'No meio da diálise fiquei ofegante e parecia que ia desmaiar.',
    evolution:
      'Já me sentia indisposto, mas a falta de ar e a fraqueza intensa apareceram durante a diálise.',
  },
};

export const plantaoCases: readonly PlantaoScenario[] = [
  ...cases.map((scenario) => {
    const { image, source, credit, licence, modality } = visualTasks.find(
      (task) => task.id === scenario.visual,
    )!;
    return {
      ...scenario,
      image,
      source,
      credit,
      licence,
      modality,
      variation: variations[scenario.id],
    };
  }),
  ...expandedPlantaoCases,
];

const rotate = <T>(items: readonly T[], amount: number) => [
  ...items.slice(amount),
  ...items.slice(0, amount),
];

export function getPlantaoScenario(id: string): PlantaoScenario | undefined {
  const [baseId, seedText] = id.split('~');
  const base = plantaoCases.find((item) => item.id === baseId);
  if (!base || seedText === undefined || !/^[0-9a-z]{1,7}$/.test(seedText)) {
    return seedText === undefined ? base : undefined;
  }
  const seed = Number.parseInt(seedText, 36);
  if (seed > 0xffffffff || `${baseId}~${seed.toString(36)}` !== id)
    return undefined;
  const interview = base.interview.map((item, index) =>
    index === 0 ? { ...item, answer: base.variation.evolution } : item,
  );
  const rotateDecision = (decision: Decision, index: number): Decision => {
    const shift = (seed + index) % decision.options.length;
    return {
      ...decision,
      options: rotate(decision.options, shift),
      correct:
        (decision.correct - shift + decision.options.length) %
        decision.options.length,
    };
  };
  const [exam, image, hypothesis] = base.decisions;

  return {
    ...base,
    id,
    generated: true,
    complaint: base.variation.complaint,
    interview: rotate(interview, seed % interview.length),
    decisions: [
      rotateDecision(exam, 0),
      rotateDecision(image, 1),
      rotateDecision(hypothesis, 2),
    ],
  };
}

export function plantaoReviewKey(caseId: string, decision: number) {
  return caseId === 'biliary' ? String(decision) : `${caseId}/${decision}`;
}

export function resolvePlantaoReview(id: string) {
  const match = /^(?:([a-z0-9~-]+)\/)?([0-2])$/.exec(id);
  if (!match) return undefined;
  const scenario = getPlantaoScenario(match[1] ?? 'biliary');
  if (!scenario) return undefined;
  const review: PlantaoReview = {
    caseId: scenario.id,
    decision: Number(match[2]),
  };
  return { scenario, review };
}
