import figures from './plantao-images.json';
import { visualTasks } from './visual-localization';
import type {
  Decision,
  PlantaoScenario,
  PlantaoVariation,
} from './plantao-cases';

type Choice = readonly [
  correct: string,
  distractor1: string,
  distractor2: string,
];
type Outline = {
  id: string;
  discipline: string;
  title: string;
  patient: string;
  complaint: string;
  history: readonly [evolution: string, symptoms: string, context: string];
  exam: string;
  image: keyof typeof figures | (typeof visualTasks)[number]['id'];
  objective: string;
  finding: Choice;
  conclusion: Choice;
  explanation: string;
  variation: PlantaoVariation;
};

const imagingOptions: Record<string, Choice> = {
  TC: [
    'Tomografia computadorizada',
    'Radiografias simples',
    'Ultrassonografia convencional',
  ],
  RM: [
    'Ressonância magnética',
    'Radiografias simples',
    'Tomografia sem contraste',
  ],
  RX: ['Radiografia simples', 'Ultrassonografia', 'Ressonância magnética'],
  USG: [
    'Ultrassonografia',
    'Tomografia computadorizada',
    'Radiografia simples',
  ],
};
const question = (
  title: string,
  hint: string,
  choices: Choice,
  explanation: string,
  offset: number,
): Decision => ({
  title,
  hint,
  explanation,
  options: [...choices.slice(offset), ...choices.slice(0, offset)],
  correct: (choices.length - offset) % choices.length,
});

function asScenario(outline: Outline, index: number): PlantaoScenario {
  const visual = visualTasks.find((item) => item.id === outline.image);
  const media = visual ?? figures[outline.image as keyof typeof figures];
  const [evolution, symptoms, context] = outline.history;
  return {
    id: outline.id,
    title: outline.title,
    discipline: outline.discipline,
    patient: outline.patient,
    complaint: outline.complaint,
    exam: outline.exam,
    report: outline.finding[0],
    interviewHint:
      'Combine a cronologia dos sintomas, os achados associados e os antecedentes.',
    interview: [
      {
        question: 'Quando começou e como evoluiu?',
        answer: evolution,
        key: true,
      },
      {
        question: 'Quais outros sintomas vieram junto?',
        answer: symptoms,
        key: true,
      },
      {
        question:
          'Que antecedente ou situação pode ajudar a explicar o quadro?',
        answer: context,
        key: true,
      },
      {
        question: 'Qual foi o último exame de rotina sem relação com a queixa?',
        answer: 'Não lembro do resultado e não trouxe o documento.',
        key: false,
      },
    ],
    decisions: [
      question(
        'Qual modalidade permite ' + outline.objective + '?',
        'Compare o que cada exame consegue mostrar na região investigada.',
        imagingOptions[media.modality],
        'Este é o exame usado para responder à pergunta de imagem do cenário.',
        index % 3,
      ),
      question(
        'Qual achado é demonstrado na figura?',
        'Localize primeiro a região e a orientação dos painéis.',
        outline.finding,
        outline.finding[0] + '.',
        (index + 1) % 3,
      ),
      question(
        'Qual interpretação integra o quadro e o exame?',
        'Use os dados do prontuário e o padrão da imagem.',
        outline.conclusion,
        outline.explanation,
        (index + 2) % 3,
      ),
    ],
    ...(visual ? { visual: visual.id } : {}),
    image: media.image,
    modality: media.modality,
    source: media.source,
    credit: media.credit,
    licence: media.licence,
    variation: outline.variation,
  };
}

// Presentations are authored as teaching adaptations of the cited figures.
const outlines: readonly Outline[] = [
  {
    id: 'unilateral-dyspnea',
    discipline: 'Pneumologia',
    title: 'Dispneia súbita e dor à direita',
    patient: 'Homem adulto',
    complaint: 'Senti uma pontada do lado direito e fiquei sem ar.',
    history: [
      'Começou subitamente enquanto andava.',
      'A dor aumenta ao inspirar.',
      'Tenho doença pulmonar crônica.',
    ],
    exam: 'Paciente monitorado, com murmúrio reduzido à direita e sem sinais de choque no momento da imagem.',
    image: 'pneumothorax',
    objective:
      'comparar os pulmões em projeção frontal e identificar uma linha pleural',
    finding: [
      'Linha pleural direita com ausência de trama vascular periférica no painel A',
      'Menisco pleural direito',
      'Opacidade lobar esquerda',
    ],
    conclusion: [
      'Pneumotórax à direita',
      'Derrame pleural volumoso à direita',
      'Atelectasia do lobo superior esquerdo',
    ],
    explanation:
      'Há ar fora do pulmão direito no painel inicial. O painel de controle mostra resolução do pneumotórax.',
    variation: {
      complaint:
        'Ficar em pé não alivia a pontada no peito que veio junto com a falta de ar.',
      evolution: 'Começou durante uma caminhada curta, sem queda ou impacto.',
    },
  },
  {
    id: 'pleuritic-pain',
    discipline: 'Pneumologia',
    title: 'Dor pleurítica e cansaço de início abrupto',
    patient: 'Mulher adulta',
    complaint: 'Começou a doer para respirar e logo fiquei ofegante.',
    history: [
      'A falta de ar começou no mesmo dia, de repente.',
      'Há pontada torácica ao inspirar.',
      'Já investiguei trombose e notei desconforto atrás do joelho.',
    ],
    exam: 'Taquipneia e taquicardia na avaliação hospitalar.',
    image: 'pulmonary-embolism',
    objective:
      'mostrar defeitos de enchimento nas artérias pulmonares em cortes contrastados',
    finding: [
      'Defeitos de enchimento em artérias pulmonares no painel A',
      'Espessamento exclusivo da pleura',
      'Opacificação dos brônquios com contraste',
    ],
    conclusion: [
      'Embolia pulmonar',
      'Pleurite viral isolada',
      'Bronquite sem lesão vascular',
    ],
    explanation:
      'O material dentro das artérias interrompe a coluna de contraste. O relato investigou ainda um aneurisma venoso poplíteo.',
    variation: {
      complaint: 'Perdi o fôlego de repente, e cada inspiração funda dói.',
      evolution: 'Começou em repouso algumas horas antes da avaliação.',
    },
  },
  {
    id: 'painful-groin',
    discipline: 'Abdome',
    title: 'Nódulo doloroso na virilha direita',
    patient: 'Mulher adulta',
    complaint: 'Uma bolinha na virilha direita ficou dura e dolorida.',
    history: [
      'O volume apareceu há dias e passou a doer continuamente.',
      'Tive náusea e mal-estar.',
      'O nódulo ficava menor quando eu me deitava antes de piorar.',
    ],
    exam: 'Massa inguinal baixa, dolorosa e de difícil redução.',
    image: 'appendicitis',
    objective:
      'mostrar a relação entre o conteúdo do saco herniário e a veia femoral em cortes contrastados',
    finding: [
      'Estrutura apendicular inflamada no saco femoral, medial à veia',
      'Trombo dentro da veia com saco vazio',
      'Alça sem sinais inflamatórios acima do ligamento inguinal',
    ],
    conclusion: [
      'Apendicite dentro de hérnia femoral',
      'Linfonodo superficial sem hérnia',
      'Hérnia umbilical complicada',
    ],
    explanation:
      'A posição medial em relação à veia femoral ajuda a identificar o canal femoral. A presença do apêndice inflamado define a apresentação descrita.',
    variation: {
      complaint:
        'O volume perto da virilha parou de diminuir e começou a doer até em repouso.',
      evolution: 'Havia uma saliência intermitente e a dor piorou desde ontem.',
    },
  },
  {
    id: 'bilateral-flank-pain',
    discipline: 'Urologia',
    title: 'Dor lombar e redução do volume urinário',
    patient: 'Homem adulto',
    complaint: 'Dói dos dois lados das costas e estou urinando pouco.',
    history: [
      'A dor começou em cólicas e as crises ficaram mais frequentes.',
      'Tive náuseas e notei a urina escura.',
      'Já tive cálculos urinários.',
    ],
    exam: 'Dor à avaliação dos flancos e investigação de alteração da função renal.',
    image: 'kidney-stone',
    objective:
      'ver pequenos focos hiperdensos nos ureteres em cortes sem contraste',
    finding: [
      'Cálculos proximais nos dois ureteres com dilatação a montante',
      'Cálculo único na bexiga sem dilatação',
      'Massa sólida nos dois rins sem cálculo',
    ],
    conclusion: [
      'Uropatia obstrutiva por litíase ureteral bilateral',
      'Cistite isolada',
      'Lombalgia mecânica sem alteração urinária',
    ],
    explanation:
      'Os cálculos bilaterais e a dilatação do trato acima deles explicam a obstrução. A redução da diurese torna a investigação prioritária.',
    variation: {
      complaint:
        'Além das cólicas nas costas, percebi que quase não urinei hoje.',
      evolution:
        'A dor vai e volta desde ontem, com piora da diurese ao longo do dia.',
    },
  },
  {
    id: 'burn-respiratory-failure',
    discipline: 'Pneumologia',
    title: 'Piora respiratória após queimadura extensa',
    patient: 'Paciente adulto em terapia intensiva',
    complaint: 'A equipe observou piora importante da oxigenação.',
    history: [
      'A necessidade de suporte respiratório aumentou nos últimos dias.',
      'Houve febre e secreção traqueal.',
      'Está internado por queimaduras extensas.',
    ],
    exam: 'Hipoxemia e opacidades bilaterais durante internação, com investigação de pneumonia.',
    image: 'pneumonia',
    objective:
      'registrar opacidades pulmonares bilaterais em uma projeção frontal no leito',
    finding: [
      'Infiltrados pulmonares bilaterais difusos',
      'Linha pleural apical única sem trama periférica',
      'Campo pulmonar completamente limpo',
    ],
    conclusion: [
      'Lesão pulmonar difusa compatível com SDRA no contexto de pneumonia grave',
      'Pneumotórax apical isolado',
      'Consolidação confinada a um único segmento',
    ],
    explanation:
      'A radiografia mostra a extensão bilateral. A hipótese de SDRA depende também da hipoxemia, da cronologia e da investigação da origem do edema.',
    variation: {
      complaint:
        'A saturação caiu durante o acompanhamento e o ventilador passou a exigir mais suporte.',
      evolution: 'Piora progressiva após vários dias de internação.',
    },
  },
  {
    id: 'sudden-brainstem-deficit',
    discipline: 'Neurologia',
    title: 'Rebaixamento abrupto e déficit motor',
    patient: 'Homem adulto',
    complaint: 'A família relata perda súbita de força e sonolência.',
    history: [
      'O episódio começou abruptamente, no mesmo dia.',
      'Houve dificuldade para falar e mover os membros.',
      'Há história de hipertensão.',
    ],
    exam: 'Alteração do nível de consciência e sinais neurológicos agudos em avaliação de urgência.',
    image: 'cerebral-bleed',
    objective:
      'identificar sangue agudo no interior do tronco encefálico em cortes sem contraste',
    finding: [
      'Foco hiperdenso no tronco encefálico no exame inicial',
      'Coleção restrita à convexidade extracerebral',
      'Exame sem alteração de densidade',
    ],
    conclusion: [
      'Hemorragia aguda de tronco encefálico',
      'Enxaqueca sem aura',
      'Lesão isolada de nervo periférico',
    ],
    explanation:
      'A hiperdensidade no tronco, com extensão ventricular no relato, localiza um sangramento central.',
    variation: {
      complaint:
        'Ele estava conversando normalmente e ficou sonolento em poucos minutos.',
      evolution: 'Foi visto bem pouco antes do início, sem trauma reconhecido.',
    },
  },
  {
    id: 'postural-headache-confusion',
    discipline: 'Neurologia',
    title: 'Cefaleia postural seguida de confusão',
    patient: 'Homem adulto',
    complaint: 'Minha cabeça doía em pé. Hoje minha família notou confusão.',
    history: [
      'A cefaleia começou há dias e piorava em pé.',
      'Hoje fiquei sonolento e inseguro para andar.',
      'Não houve queda conhecida.',
    ],
    exam: 'Confusão e alteração neurológica recente em investigação de urgência.',
    image: 'subdural',
    objective:
      'ver coleção extra-axial e desvio da linha média em cortes sem contraste',
    finding: [
      'Coleção semilunar direita com efeito de massa no painel inicial',
      'Hemorragia limitada ao quarto ventrículo',
      'Pequena coleção confinada ao couro cabeludo',
    ],
    conclusion: [
      'Hematoma subdural com efeito de massa',
      'Hemorragia epidural de aspecto biconvexo',
      'Cefaleia tensional sem alteração estrutural',
    ],
    explanation:
      'O padrão semilunar e o desvio da linha média indicam hematoma subdural. O relato investigou hipotensão intracraniana como contexto.',
    variation: {
      complaint: 'A dor aliviava deitado, mas agora veio junto com sonolência.',
      evolution:
        'A cefaleia postural durou vários dias antes da piora neurológica.',
    },
  },
  {
    id: 'acute-scrotum',
    discipline: 'Urologia',
    title: 'Dor escrotal de início abrupto',
    patient: 'Adolescente',
    complaint: 'Uma dor muito forte começou de repente do lado esquerdo.',
    history: [
      'A dor apareceu sem trauma há poucas horas.',
      'Tive náuseas na crise.',
      'Não tive ardor para urinar antes da dor.',
    ],
    exam: 'Hemitestículo esquerdo doloroso em avaliação cirúrgica urgente.',
    image: 'torsion',
    objective:
      'comparar perfusão testicular em tempo real e entre os dois lados',
    finding: [
      'Assimetria de perfusão e redução de fluxo no testículo esquerdo',
      'Fluxo simétrico intenso nos dois testículos',
      'Alteração isolada da parede vesical',
    ],
    conclusion: [
      'Isquemia testicular associada à torção neste caso',
      'Cistite isolada',
      'Epididimite com hiperemia simétrica',
    ],
    explanation:
      'A comparação de fluxo e o quadro súbito favorecem comprometimento vascular. A figura também mostra avaliações de perfusão após o procedimento.',
    variation: {
      complaint: 'A dor me acordou e piorou até eu ficar enjoado.',
      evolution:
        'Em poucas horas apareceu dor escrotal unilateral forte, sem pancada.',
    },
  },
  {
    id: 'unilateral-pelvic-pain',
    discipline: 'Ginecologia e obstetrícia',
    title: 'Dor pélvica intensa na gestação inicial',
    patient: 'Mulher com gestação inicial',
    complaint: 'Apareceu uma dor forte num lado da pelve e comecei a vomitar.',
    history: [
      'A dor ficou intensa rapidamente e não cedeu.',
      'Tive náuseas e vômitos.',
      'Há gestação inicial e um cisto ovariano conhecido.',
    ],
    exam: 'Dor focal no baixo ventre em avaliação ginecológica urgente.',
    image: 'ovarian-torsion',
    objective:
      'caracterizar uma lesão anexial anecoica e avaliar o ovário em tempo real',
    finding: [
      'Lesão cística unilocular no ovário esquerdo',
      'Massa sólida dentro da bexiga',
      'Coleção exclusivamente subcutânea',
    ],
    conclusion: [
      'Suspeita de torção anexial com cisto ovariano associado',
      'Cólica renal comprovada pela imagem',
      'Cistite isolada com cisto vesical',
    ],
    explanation:
      'Dor intensa aguda com náuseas e lesão anexial levantam a hipótese de torção. A figura mostra o cisto associado e o diagnóstico foi estabelecido no relato.',
    variation: {
      complaint:
        'A dor começou num lado do baixo ventre e ficou tão forte que vomitei.',
      evolution:
        'Na gestação inicial, a dor passou de intermitente para intensa e persistente.',
    },
  },
  {
    id: 'pregnancy-spotting',
    discipline: 'Ginecologia e obstetrícia',
    title: 'Sangramento no início da gestação',
    patient: 'Mulher com cesárea anterior',
    complaint: 'Estou grávida de poucas semanas e tive um sangramento.',
    history: [
      'O sangramento começou hoje.',
      'Há desconforto no baixo ventre.',
      'Meu parto anterior foi por cesárea.',
    ],
    exam: 'Paciente estável com gestação inicial e sangramento em avaliação obstétrica.',
    image: 'ectopic',
    objective:
      'localizar o saco gestacional em relação à cicatriz uterina durante a avaliação inicial',
    finding: [
      'Saco gestacional na região da cicatriz anterior de cesárea no painel A',
      'Saco no fundo uterino afastado da cicatriz',
      'Massa exclusivamente ovariana sem saco gestacional visível',
    ],
    conclusion: [
      'Gestação ectópica em cicatriz de cesárea',
      'Gestação tópica fúndica',
      'Cisto ovariano simples como única alteração',
    ],
    explanation:
      'A localização baixa e anterior junto à cicatriz é o achado-chave. Os demais painéis documentam o procedimento do relato.',
    variation: {
      complaint:
        'Vi uma pequena perda de sangue e lembrei que já tive cesárea.',
      evolution:
        'Foi o primeiro episódio de sangramento após o início confirmado da gestação.',
    },
  },
  {
    id: 'infant-vomiting',
    discipline: 'Pediatria',
    title: 'Vômitos em jato no lactente',
    patient: 'Lactente de quatro semanas',
    complaint:
      'Ele vomita com força depois de mamar e logo quer mamar de novo.',
    history: [
      'Os episódios ficaram mais frequentes nesta semana.',
      'O vômito é de leite, sem cor verde.',
      'As fraldas têm ficado menos molhadas.',
    ],
    exam: 'Lactente em avaliação da hidratação e da saída gástrica.',
    image: 'pyloric',
    objective:
      'medir a espessura muscular e o comprimento do canal pilórico durante a passagem do conteúdo',
    finding: [
      'Canal pilórico alongado com espessamento e protrusão mucosa',
      'Alça com padrão em alvo no quadrante inferior',
      'Píloro persistentemente amplo com trânsito livre',
    ],
    conclusion: [
      'Estenose hipertrófica do piloro',
      'Invaginação intestinal como achado demonstrado',
      'Regurgitação fisiológica sem alteração do piloro',
    ],
    explanation:
      'A idade, o vômito não bilioso e o padrão ecográfico do piloro são coerentes com obstrução da saída gástrica.',
    variation: {
      complaint:
        'Depois de quase toda mamada ele vomita longe, e as fraldas ficaram mais secas.',
      evolution:
        'Os vômitos começaram esporádicos e aumentaram ao longo de alguns dias.',
    },
  },
  {
    id: 'shoulder-contour-loss',
    discipline: 'Trauma e ortopedia',
    title: 'Ombro deformado após trauma',
    patient: 'Homem adulto',
    complaint: 'O ombro mudou de formato e não consigo levantar o braço.',
    history: [
      'O problema começou após trauma e a limitação persistiu.',
      'O braço não voltou ao movimento habitual.',
      'O ombro já passou por fixação óssea.',
    ],
    exam: 'Perda do contorno lateral do ombro e mobilidade muito limitada.',
    image: 'dislocation',
    objective:
      'conferir a posição da cabeça umeral em relação à glenoide em projeções ósseas',
    finding: [
      'Cabeça umeral deslocada em relação à glenoide, com material de fixação prévio',
      'Articulação glenoumeral congruente e clavícula fraturada',
      'Alteração restrita ao cotovelo',
    ],
    conclusion: [
      'Luxação anterior glenoumeral persistente',
      'Lesão acromioclavicular isolada',
      'Contusão sem desalinhamento articular',
    ],
    explanation:
      'O desalinhamento é glenoumeral. No caso publicado, a luxação anterior persistiu após tratamento de lesão associada.',
    variation: {
      complaint:
        'Desde a lesão, o ombro ficou mais saliente na frente e não consigo erguer o braço.',
      evolution:
        'A deformidade nunca desapareceu entre a lesão e a reavaliação.',
    },
  },
  {
    id: 'abdominal-pain-vascular',
    discipline: 'Vascular',
    title: 'Dor abdominal com massa pulsátil',
    patient: 'Homem idoso',
    complaint: 'Senti uma dor profunda na barriga que vai para as costas.',
    history: [
      'A dor ficou forte de forma súbita.',
      'Tive mal-estar e vômitos.',
      'Já me falaram de uma dilatação na aorta.',
    ],
    exam: 'Dor abdominal e suspeita de complicação vascular em ambiente hospitalar.',
    image: 'rupture-aaa',
    objective:
      'delimitar o lúmen da aorta abdominal, o trombo mural e a região de ruptura em cortes',
    finding: [
      'Aorta abdominal aneurismática com ruptura contida',
      'Aorta de calibre normal e cálculo ureteral',
      'Massa confinada à parede da bexiga',
    ],
    conclusion: [
      'Complicação aguda de aneurisma de aorta abdominal',
      'Gastrite sem alteração vascular',
      'Apendicite sem alteração aórtica',
    ],
    explanation:
      'O lúmen realçado, o trombo mural e a área de ruptura identificada na imagem definem o problema vascular.',
    variation: {
      complaint:
        'Começou uma dor muito forte no centro da barriga, irradiando para a lombar.',
      evolution: 'A dor cresceu rapidamente e permaneceu desde o início.',
    },
  },
  {
    id: 'pain-following-aortic-repair',
    discipline: 'Vascular',
    title: 'Reavaliação de dor após cirurgia da aorta',
    patient: 'Homem adulto com cirurgia aórtica prévia',
    complaint:
      'Voltei a sentir dor no peito e fui encaminhado para avaliar a aorta.',
    history: [
      'A dor reapareceu no acompanhamento.',
      'Às vezes irradia para as costas.',
      'Já fui operado da aorta ascendente.',
    ],
    exam: 'Paciente encaminhado para imagem vascular de seguimento.',
    image: 'aortic-dissection',
    objective:
      'delinear verdadeiro e falso lúmen e planejar reconstruções vasculares volumétricas',
    finding: [
      'Lúmens verdadeiro e falso envolvendo a aorta e ramos do arco',
      'Ausência de alteração na aorta com embolia isolada',
      'Dilatação exclusiva do ventrículo esquerdo',
    ],
    conclusion: [
      'Dissecção aórtica residual envolvendo o arco',
      'Pneumotórax apical',
      'Estenose coronariana isolada demonstrada na figura',
    ],
    explanation:
      'A figura mostra dois lúmens e a origem dos vasos relacionados. As imagens orientam o planejamento anatômico do caso.',
    variation: {
      complaint:
        'A equipe pediu para revisar a região do arco depois que voltei a ter dor torácica.',
      evolution:
        'Sintomas reapareceram após um intervalo de acompanhamento pós-operatório.',
    },
  },
  {
    id: 'pelvic-trauma-followup',
    discipline: 'Trauma e ortopedia',
    title: 'Trauma de pelve em reavaliação pós-fixação',
    patient: 'Adulto após trauma de alta energia',
    complaint: 'Minha pelve foi estabilizada e preciso rever o alinhamento.',
    history: [
      'A dor começou após um acidente.',
      'Não consegui ficar de pé logo após o trauma.',
      'A equipe colocou um fixador e parafusos.',
    ],
    exam: 'Paciente em reavaliação após estabilização de lesão complexa do anel pélvico.',
    image: 'pelvic-fracture',
    objective:
      'documentar o alinhamento do anel pélvico e o posicionamento do fixador numa projeção frontal',
    finding: [
      'Fixador externo com pinos supra-acetabulares e parafusos sacroilíacos',
      'Artroplastia bilateral completa de quadril',
      'Fixação isolada no fêmur distal',
    ],
    conclusion: [
      'Fratura instável do anel pélvico após fixação',
      'Luxação antiga do ombro',
      'Artrose isolada sem relação com o trauma',
    ],
    explanation:
      'A radiografia é pós-estabilização. Mostra componentes anteriores e posteriores usados no tratamento da lesão do anel pélvico.',
    variation: {
      complaint:
        'Quero entender onde ficaram os pinos colocados para firmar a pelve.',
      evolution: 'Reavaliação no período após a estabilização do trauma.',
    },
  },
  {
    id: 'orthopnea-and-edema',
    discipline: 'Cardiologia',
    title: 'Ortopneia e aumento do cansaço',
    patient: 'Homem adulto com cardiopatia',
    complaint: 'Não consigo deitar sem ficar com muito mais falta de ar.',
    history: [
      'A dispneia piorou nos últimos dias.',
      'Os tornozelos incharam e passei a dormir sentado.',
      'Já tenho insuficiência cardíaca.',
    ],
    exam: 'Estertores bilaterais e sinais de congestão em avaliação hospitalar.',
    image: 'pulmonary-edema',
    objective:
      'registrar em projeção frontal as opacidades pulmonares e a distribuição da congestão',
    finding: [
      'Opacidades bilaterais de edema e derrames pleurais no painel A',
      'Pneumotórax à direita sem opacidades pulmonares',
      'Lesão apical unilateral isolada',
    ],
    conclusion: [
      'Edema pulmonar em contexto de insuficiência cardíaca descompensada',
      'Contusão pulmonar isolada',
      'Pneumotórax bilateral como padrão dominante',
    ],
    explanation:
      'A imagem de admissão demonstra congestão bilateral. A interpretação usa também o quadro de insuficiência cardíaca e ortopneia.',
    variation: {
      complaint:
        'À noite preciso me sentar para respirar, e minhas pernas estão inchadas.',
      evolution:
        'A tolerância ao decúbito piorou progressivamente esta semana.',
    },
  },
  {
    id: 'acute-epigastric-pain',
    discipline: 'Abdome',
    title: 'Dor epigástrica súbita com irritação peritoneal',
    patient: 'Homem adulto',
    complaint: 'A dor começou de uma vez na boca do estômago e se espalhou.',
    history: [
      'Foi súbita e forte, tornando-se generalizada.',
      'Qualquer movimento piora a dor.',
      'Já tinha episódios de dor epigástrica.',
    ],
    exam: 'Dor difusa com defesa abdominal em avaliação urgente.',
    image: 'duodenal-perforation',
    objective:
      'localizar pequenos bolsões de ar livre e investigar um ponto de perfuração em cortes',
    finding: [
      'Ar livre intraperitoneal anterior e no andar superior do abdome',
      'Ar restrito a alças com parede íntegra',
      'Derrame pericárdico isolado',
    ],
    conclusion: [
      'Perfuração de víscera oca provável',
      'Gastrite sem perfuração',
      'Cólica biliar sem sinais de complicação',
    ],
    explanation:
      'O ar fora do tubo digestivo sustenta pneumoperitônio. A localização e o relato clínico ajudam a investigar uma origem gastroduodenal.',
    variation: {
      complaint:
        'Uma dor muito forte começou no alto da barriga e agora dói até ao mexer.',
      evolution: 'A dor se tornou difusa em pouco tempo.',
    },
  },
  {
    id: 'distended-child',
    discipline: 'Pediatria',
    title: 'Distensão abdominal com parada de evacuação',
    patient: 'Criança em idade escolar',
    complaint: 'A barriga cresceu, está doendo e não consigo evacuar.',
    history: [
      'A distensão aumentou durante o dia.',
      'Tive cólicas e vômitos.',
      'Já vinha com dificuldade para evacuar.',
    ],
    exam: 'Abdome muito distendido em investigação de obstrução.',
    image: 'volvulus',
    objective:
      'mostrar o contorno da alça distendida e os níveis hidroaéreos em posição ortostática',
    finding: [
      'Alça colônica muito distendida com configuração em grão de café',
      'Foco calcificado isolado no hipocôndrio',
      'Padrão sem dilatação intestinal',
    ],
    conclusion: [
      'Vólvulo do sigmoide',
      'Adenite mesentérica sem obstrução',
      'Refluxo gastroesofágico isolado',
    ],
    explanation:
      'A alça muito distendida que se origina na pelve e assume aspecto de grão de café foi associada à torção sigmoide no relato.',
    variation: {
      complaint: 'A barriga ficou dura de tão inchada e parei de soltar gases.',
      evolution: 'O quadro tornou-se mais intenso em poucas horas.',
    },
  },
  {
    id: 'perineal-infection',
    discipline: 'Urologia',
    title: 'Dor perineal intensa com progressão rápida',
    patient: 'Homem adulto',
    complaint: 'A dor no períneo aumentou rápido e o inchaço está subindo.',
    history: [
      'Começou há pouco e piorou rapidamente.',
      'Tive febre e mal-estar.',
      'O edema se espalhou para a região suprapúbica.',
    ],
    exam: 'Dor intensa, edema perineal e sinais de infecção em avaliação cirúrgica.',
    image: 'nec-fasciitis',
    objective:
      'mapear gás nos planos profundos do períneo, escroto e parede abdominal em cortes',
    finding: [
      'Gás extenso nos tecidos do períneo e da parede abdominal anterior',
      'Gás restrito à luz do reto',
      'Hidrocele simples sem alteração dos tecidos',
    ],
    conclusion: [
      'Infecção necrosante perineal compatível com gangrena de Fournier',
      'Hidrocele simples',
      'Cistite sem extensão de infecção',
    ],
    explanation:
      'O gás nos tecidos profundos e a evolução rapidamente progressiva indicam uma infecção extensa no caso.',
    variation: {
      complaint: 'O inchaço no períneo aumentou muito e comecei a ter febre.',
      evolution: 'Houve progressão visível do edema ao longo do mesmo dia.',
    },
  },
  {
    id: 'febrile-renal-syndrome',
    discipline: 'Abdome',
    title: 'Dor epigástrica, febre e lesão renal',
    patient: 'Homem adulto',
    complaint: 'Tive febre alta, dor forte na barriga e a urina diminuiu.',
    history: [
      'A febre veio antes da dor abdominal.',
      'Senti náuseas e tive queda do volume urinário.',
      'O exame demonstrou plaquetopenia e houve investigação de exposição a roedores.',
    ],
    exam: 'Dor epigástrica, injúria renal aguda e plaquetopenia durante a investigação.',
    image: 'pancreatitis',
    objective:
      'comparar a infiltração da gordura peripancreática e da fáscia renal em cortes seriados',
    finding: [
      'Infiltração peripancreática e exsudato perirrenal',
      'Calcificações pancreáticas difusas sem edema',
      'Ar livre como único achado',
    ],
    conclusion: [
      'Síndrome febril renal que mimetiza pancreatite no relato de hantavirose',
      'Pancreatite crônica calcificante demonstrada',
      'Hérnia femoral isolada',
    ],
    explanation:
      'O padrão inicial parecia pancreatite. A combinação com alterações renais e hematológicas levou à investigação etiológica que identificou hantavírus no relato.',
    variation: {
      complaint:
        'Depois da febre vieram dor no alto da barriga e bem menos urina.',
      evolution: 'A queda da diurese apareceu durante a piora abdominal.',
    },
  },
  {
    id: 'cancer-saddle-numbness',
    discipline: 'Neurologia',
    title: 'Fraqueza nas pernas e anestesia em sela',
    patient: 'Adulto com antecedente oncológico',
    complaint:
      'Minhas pernas enfraqueceram e perdi a sensibilidade para sentar.',
    history: [
      'Os sintomas começaram com dor lombar e progrediram.',
      'Houve alteração para urinar.',
      'Tenho antecedente de câncer ou investigação oncológica em curso.',
    ],
    exam: 'Déficit bilateral e alteração sensitiva em sela, em avaliação de urgência.',
    image: 'cauda-equina',
    objective:
      'investigar as raízes da cauda equina e realce nodular no canal vertebral',
    finding: [
      'Alterações nodulares relacionadas às raízes nas imagens de RM',
      'Alteração restrita aos músculos do quadril',
      'Fratura isolada de arco costal',
    ],
    conclusion: [
      'Síndrome da cauda equina por doença leptomeníngea neste relato',
      'Mononeuropatia ulnar',
      'Lombalgia mecânica sem déficit',
    ],
    explanation:
      'Sintomas em sela e vesicais apontam para a cauda equina. O padrão de imagem e o antecedente oncológico motivaram investigação leptomeníngea.',
    variation: {
      complaint:
        'Além da fraqueza nas duas pernas, não sinto como antes a região entre elas.',
      evolution:
        'Depois de dor lombar, surgiram sintomas nas duas pernas e dificuldade urinária.',
    },
  },
  {
    id: 'febrile-elbow',
    discipline: 'Trauma e ortopedia',
    title: 'Cotovelo doloroso e febre em criança',
    patient: 'Criança em idade escolar',
    complaint: 'O cotovelo inchou, está quente e dói para mexer.',
    history: [
      'A dor passou de leve a intensa em poucos dias.',
      'Tive febre e evito dobrar o braço.',
      'Não houve queda compatível com o início da dor.',
    ],
    exam: 'Dor com mobilização, edema articular e suspeita de infecção.',
    image: 'septic-joint',
    objective:
      'avaliar derrame articular e edema no interior da medula óssea radial',
    finding: [
      'Derrame no cotovelo e alteração da medula na metáfise proximal do rádio',
      'Fratura isolada de clavícula',
      'Luxação sem líquido articular nem edema ósseo',
    ],
    conclusion: [
      'Artrite séptica com osteomielite adjacente no caso',
      'Contusão simples sem componente infeccioso',
      'Tendinite isolada sem derrame',
    ],
    explanation:
      'O líquido articular e a alteração óssea adjacente, em contexto febril, sustentam a investigação de infecção conjunta.',
    variation: {
      complaint: 'Até mexer um pouco o cotovelo dói, e comecei a ter febre.',
      evolution:
        'Edema e febre apareceram ao longo dos dias seguintes ao início da dor.',
    },
  },
  {
    id: 'headache-on-device-infection',
    discipline: 'Neurologia',
    title: 'Cefaleia aguda em paciente com infecção de dispositivo',
    patient: 'Adulto com dispositivo cardíaco',
    complaint:
      'Enquanto investigavam a infecção, começou uma dor forte na cabeça.',
    history: [
      'A cefaleia é nova e recente.',
      'Tive febre antes da dor.',
      'A equipe investiga infecção do dispositivo cardíaco.',
    ],
    exam: 'Cefaleia aguda em contexto infeccioso com investigação neurológica hospitalar.',
    image: 'intracranial-sah',
    objective:
      'ver sangue agudo nos sulcos e comparar com uma aquisição angiográfica por raios X em cortes',
    finding: [
      'Sangue sulcal focal na convexidade frontal direita no painel A',
      'Coleção subdural compressiva contendo ar',
      'Hemorragia limitada ao interior do globo ocular',
    ],
    conclusion: [
      'Hemorragia subaracnoidea focal com aneurisma infeccioso no relato',
      'Cefaleia tensional sem alteração',
      'Infarto lacunar sem hemorragia',
    ],
    explanation:
      'O sangue acompanha um sulco cortical. O segundo painel e a investigação vascular documentam a alteração arterial associada.',
    variation: {
      complaint:
        'A cefaleia apareceu agora, durante o tratamento de uma infecção cardíaca.',
      evolution:
        'A cefaleia começou depois de vários dias de sintomas infecciosos.',
    },
  },
  {
    id: 'newborn-respiratory-distress',
    discipline: 'Pediatria',
    title: 'Desconforto respiratório neonatal',
    patient: 'Recém-nascido',
    complaint:
      'A equipe identificou respiração rápida e esforço nas primeiras horas.',
    history: [
      'O esforço respiratório iniciou no período neonatal imediato.',
      'As retrações aumentaram durante a observação.',
      'O caso é avaliado na unidade neonatal.',
    ],
    exam: 'Taquipneia e retrações em monitoramento.',
    image: 'pneumomediastinum',
    objective:
      'reconhecer ar mediastinal pelo deslocamento do timo em projeção frontal',
    finding: [
      'Ar mediastinal eleva os lobos do timo, em sinal de vela',
      'Derrame isolado em uma base pulmonar',
      'Centralização normal do timo sem ar adjacente',
    ],
    conclusion: [
      'Pneumomediastino neonatal',
      'Derrame pleural bilateral',
      'Massa tímica sem ar no mediastino',
    ],
    explanation:
      'O ar no mediastino destaca e eleva o timo, produzindo o sinal de vela no relato.',
    variation: {
      complaint:
        'Nas primeiras horas, o bebê começou a respirar com esforço visível.',
      evolution: 'As retrações surgiram durante a observação neonatal.',
    },
  },
  {
    id: 'incidental-vascular-spleen',
    discipline: 'Vascular',
    title: 'Achado vascular na região do hilo esplênico',
    patient: 'Adulto em investigação onco-hematológica',
    complaint:
      'Um exame mostrou uma imagem vascular no lado esquerdo do abdome.',
    history: [
      'O achado apareceu durante uma investigação recente.',
      'Não houve dor súbita intensa.',
      'Tenho antecedente hematológico e plaquetas baixas.',
    ],
    exam: 'Paciente estável, em investigação de lesão vascular incidental.',
    image: 'aneurysm-splenic',
    objective:
      'avaliar o realce arterial do foco e sua relação com a artéria esplênica em cortes',
    finding: [
      'Estrutura arredondada com realce arterial junto ao hilo esplênico',
      'Coleção anecoica confinada à bexiga',
      'Calcificação sem realce em um corpo vertebral',
    ],
    conclusion: [
      'Aneurisma da artéria esplênica no caso',
      'Cisto simples do baço',
      'Cálculo no colédoco',
    ],
    explanation:
      'O foco tem densidade de contraste arterial e está junto ao trajeto da artéria esplênica. O estudo publicado confirmou o aneurisma.',
    variation: {
      complaint:
        'Fui chamado de volta por uma alteração perto do baço que apareceu no exame.',
      evolution:
        'O achado foi incidental, sem quadro de dor abdominal abrupta.',
    },
  },
  {
    id: 'gait-and-cognition',
    discipline: 'Neurologia',
    title: 'Alteração de marcha com lentificação cognitiva',
    patient: 'Adulto idoso',
    complaint: 'Ando com passos mais curtos e estou demorando para pensar.',
    history: [
      'A marcha piorou ao longo de meses.',
      'A família percebeu lentificação e urgência urinária.',
      'Não houve um episódio súbito de fraqueza focal.',
    ],
    exam: 'Marcha alterada em avaliação neurológica e investigação da circulação liquórica.',
    image: 'delirium',
    objective:
      'examinar os ventrículos, o sinal periventricular e a relação da artéria basilar com o terceiro ventrículo',
    finding: [
      'Dilatação ventricular e compressão junto ao terceiro ventrículo pela basilar ectásica',
      'Ventrículos de tamanho habitual com atrofia exclusiva do cerebelo',
      'Coleção subdural bilateral com ventrículos comprimidos',
    ],
    conclusion: [
      'Hidrocefalia obstrutiva por dolicoectasia vertebrobasilar no caso',
      'Hidrocefalia de pressão normal sem causa obstrutiva demonstrada',
      'Lesão isolada da medula torácica',
    ],
    explanation:
      'Além da dilatação, a RM mostra o mecanismo anatômico da obstrução. Os sintomas poderiam sugerir hidrocefalia de pressão normal sem a imagem.',
    variation: {
      complaint:
        'Estou tropeçando mais e minha família diz que fiquei lento nos últimos meses.',
      evolution:
        'Marcha e atenção pioraram de forma gradual, sem início abrupto.',
    },
  },
  {
    id: 'episodic-palpitation-adrenal',
    discipline: 'Abdome',
    title: 'Crises de cefaleia e palpitações',
    patient: 'Mulher adulta',
    complaint: 'Tenho crises de dor de cabeça, suor e coração acelerado.',
    history: [
      'As crises vêm em episódios.',
      'Também percebi picos de pressão.',
      'Um exame identificou uma massa na região da adrenal.',
    ],
    exam: 'Paciente em investigação de lesão suprarrenal e de suas repercussões clínicas.',
    image: 'ct-adrenal-mass',
    objective:
      'medir a atenuação em unidades Hounsfield e delimitar a massa suprarrenal',
    finding: [
      'Massa suprarrenal direita heterogênea',
      'Massa confinada ao interior da vesícula',
      'Dilatação exclusiva do ureter esquerdo',
    ],
    conclusion: [
      'Feocromocitoma como hipótese no contexto clínico',
      'Cisto simples de bexiga',
      'Colelitíase assintomática como explicação das crises',
    ],
    explanation:
      'As crises e a origem suprarrenal sugerem avaliação de secreção hormonal. A TC localiza a lesão e o relato documentou feocromocitoma.',
    variation: {
      complaint:
        'De vez em quando me sinto suada, com a pressão alta e o coração disparado.',
      evolution: 'Há episódios separados por períodos de melhora.',
    },
  },
  {
    id: 'painful-midline-scar',
    discipline: 'Abdome',
    title: 'Nódulo endurecido na cicatriz abdominal',
    patient: 'Adulto com cirurgia abdominal prévia',
    complaint: 'Sinto uma área dura e dolorida no alto da cicatriz.',
    history: [
      'O endurecimento apareceu depois da cirurgia.',
      'Dói à pressão direta.',
      'A cicatriz fica na linha média.',
    ],
    exam: 'Foco endurecido superficial na cicatriz, sem sinal peritoneal no cenário.',
    image: 'ct-abdominal-wall',
    objective:
      'confirmar densidade óssea e comparar os planos axial e coronal da parede abdominal',
    finding: [
      'Estrutura ossificada junto à cicatriz anterior da linha média',
      'Coleção anecoica sem cálcio no fígado',
      'Cálculo no ureter distal',
    ],
    conclusion: [
      'Ossificação heterotópica na parede abdominal',
      'Abscesso renal',
      'Hérnia inguinal como achado da figura',
    ],
    explanation:
      'O foco tem densidade semelhante à do osso e está fora do esqueleto, na região da cicatriz operatória.',
    variation: {
      complaint:
        'Achei um ponto bem duro junto à incisão que incomoda quando aperto.',
      evolution: 'O nódulo apareceu durante o seguimento pós-operatório.',
    },
  },
  {
    id: 'fever-and-cervical-nodes',
    discipline: 'Cabeça e pescoço',
    title: 'Febre com nódulos dolorosos no pescoço',
    patient: 'Mulher jovem',
    complaint: 'Há vários caroços no pescoço e estou com febre.',
    history: [
      'Os nódulos apareceram há alguns dias.',
      'Há mal-estar e dor cervical.',
      'Tenho antecedentes familiares de autoimunidade.',
    ],
    exam: 'Adenomegalias cervicais bilaterais em avaliação etiológica.',
    image: 'ct-necrotic-node',
    objective:
      'mapear níveis linfonodais e comparar realce periférico e atenuação central em cortes',
    finding: [
      'Linfonodo cervical esquerdo com centro hipodenso',
      'Massa dentro da luz da traqueia',
      'Fratura do processo espinhoso cervical',
    ],
    conclusion: [
      'Linfadenite necrosante que exige confirmação etiológica',
      'Pneumotórax como causa dos nódulos',
      'Hipertrofia muscular isolada',
    ],
    explanation:
      'O aspecto necrótico amplia os diagnósticos diferenciais. O relato chegou ao diagnóstico de Kikuchi-Fujimoto com investigação complementar.',
    variation: {
      complaint:
        'Os caroços surgiram com febre e ficaram doloridos ao virar o pescoço.',
      evolution: 'A febre acompanhou a progressão cervical nos últimos dias.',
    },
  },
  {
    id: 'recurrent-epigastric-pain',
    discipline: 'Abdome',
    title: 'Dor epigástrica recorrente e perda de peso',
    patient: 'Adulto',
    complaint: 'Tenho dores recorrentes na boca do estômago e perdi peso.',
    history: [
      'A dor volta há vários meses.',
      'Às vezes irradia para as costas.',
      'Os episódios se tornaram mais frequentes.',
    ],
    exam: 'Dor epigástrica e investigação de doença pancreática crônica.',
    image: 'ct-pancreatic-calcifications',
    objective:
      'identificar calcificações pancreáticas de alta atenuação numa reconstrução coronal',
    finding: [
      'Calcificações múltiplas no pâncreas e no trajeto ductal',
      'Ar livre subdiafragmático como único achado',
      'Calcificações confinadas à bexiga',
    ],
    conclusion: [
      'Pancreatite crônica calcificante',
      'Apendicite aguda',
      'Gastrite sem alteração pancreática',
    ],
    explanation:
      'As calcificações no parênquima e no ducto são compatíveis com pancreatite crônica nesse relato.',
    variation: {
      complaint:
        'Aquela dor no alto da barriga ficou mais frequente e agora também sinto nas costas.',
      evolution:
        'O quadro é recorrente, com intervalos melhores ao longo dos meses.',
    },
  },
  {
    id: 'vomiting-ataxia-during-pregnancy',
    discipline: 'Ginecologia e obstetrícia',
    title: 'Vômitos persistentes com ataxia na gestação',
    patient: 'Mulher grávida em investigação neurológica',
    complaint: 'Depois de vários dias vomitando, passei a cambalear.',
    history: [
      'Os vômitos precederam os sintomas neurológicos.',
      'Houve desequilíbrio e confusão.',
      'A ingestão alimentar ficou muito baixa.',
    ],
    exam: 'Ataxia e alteração mental em gestante com hiperêmese.',
    image: 'rm-medial-thalamus',
    objective:
      'avaliar alterações de sinal na sequência FLAIR nos tálamos mediais',
    finding: [
      'Hipersinal talâmico medial no painel inicial',
      'Hemorragia lobar expansiva com grande desvio',
      'Lesão isolada na medula cervical',
    ],
    conclusion: [
      'Encefalopatia de Wernicke no contexto de hiperêmese',
      'Gastroenterite como explicação neurológica completa',
      'Neuropatia isolada de membro inferior',
    ],
    explanation:
      'A deficiência de tiamina é uma hipótese importante após vômitos prolongados. O padrão talâmico apoia a correlação descrita.',
    variation: {
      complaint:
        'Tenho vomitado tanto que quase não como, e agora estou perdendo o equilíbrio.',
      evolution:
        'O desequilíbrio apareceu depois do período de baixa ingestão.',
    },
  },
  {
    id: 'bilateral-l5-radiculopathy',
    discipline: 'Neurologia',
    title: 'Dor lombar irradiada e déficit bilateral',
    patient: 'Homem adulto',
    complaint: 'A dor desce para as duas pernas e comecei a perder força.',
    history: [
      'A lombalgia foi seguida de piora nas duas pernas.',
      'Tenho dormência e dificuldade para caminhar.',
      'O problema é mais intenso na distribuição da raiz L5.',
    ],
    exam: 'Déficit motor bilateral durante avaliação especializada.',
    image: 'rm-lumbar-intracanal',
    objective:
      'distinguir realce intracanal e estruturas do saco dural na sequência T1 contrastada',
    finding: [
      'Lesão intracanal em L4–L5 comprimindo o saco dural',
      'Derrame em torno do joelho como achado dominante',
      'Deslocamento isolado da articulação coxofemoral',
    ],
    conclusion: [
      'Lesão intradural que no relato correspondia a material discal',
      'Lombalgia mecânica sem compressão',
      'Neuropatia do nervo mediano',
    ],
    explanation:
      'Na imagem, material discal intradural pode simular um tumor. A confirmação do conteúdo discal veio da análise anatomopatológica.',
    variation: {
      complaint:
        'Minhas duas pernas ficaram dormentes e o pé começou a falhar ao andar.',
      evolution:
        'A piora motora aconteceu depois de um período com dor irradiada.',
    },
  },
  {
    id: 'thoracic-spinal-compression',
    discipline: 'Neurologia',
    title: 'Desequilíbrio e rigidez nas pernas',
    patient: 'Homem adulto',
    complaint: 'Minhas pernas ficaram rígidas e ando com muita dificuldade.',
    history: [
      'O desequilíbrio foi se instalando.',
      'A alteração é nas duas pernas.',
      'Não foi associada a uma lesão isolada de joelho.',
    ],
    exam: 'Sinais de comprometimento medular torácico na avaliação neurológica.',
    image: 'rm-thoracic-cyst',
    objective:
      'mostrar o líquido dorsal em T2 e a relação com a medula no corte axial',
    finding: [
      'Coleção dorsal hiperintensa deslocando a medula anteriormente',
      'Fratura aguda de metacarpo',
      'Dilatação ventricular encefálica isolada',
    ],
    conclusion: [
      'Compressão medular por cisto aracnoide torácico neste caso',
      'Neuropatia isolada do nervo fibular',
      'Síndrome vestibular sem lesão medular',
    ],
    explanation:
      'A associação entre a coleção dorsal e o deslocamento da medula explica o padrão compressivo.',
    variation: {
      complaint:
        'Fiquei inseguro para caminhar e minhas pernas parecem travar.',
      evolution: 'Os sintomas bilaterais progrediram aos poucos.',
    },
  },
  {
    id: 'thenar-enlargement-child',
    discipline: 'Trauma e ortopedia',
    title: 'Massa na base do polegar',
    patient: 'Criança com massa na mão',
    complaint: 'Apareceu um caroço na base do polegar e ele aumentou.',
    history: [
      'A massa cresceu aos poucos.',
      'Incomoda em algumas atividades da mão.',
      'Não apareceu logo depois de uma pancada.',
    ],
    exam: 'Massa localizada em região relacionada ao primeiro metacarpo.',
    image: 'rx-thumb-mass',
    objective:
      'ver mineralização próxima ao primeiro metacarpo em três incidências da mão',
    finding: [
      'Massa calcificada adjacente ao primeiro metacarpo',
      'Fratura do colo do quinto metacarpo',
      'Luxação isolada da interfalângica distal',
    ],
    conclusion: [
      'Massa mineralizada de partes moles que exige caracterização',
      'Fratura aguda comprovada',
      'Celulite difusa sem massa',
    ],
    explanation:
      'As incidências ajudam a localizar a massa. A confirmação de osteocondrolipoma no relato dependeu de avaliação especializada e histologia.',
    variation: {
      complaint:
        'Tenho uma bolinha firme perto do polegar que começou a aparecer quando seguro objetos.',
      evolution:
        'A massa aumentou gradualmente, sem evento traumático inicial.',
    },
  },
  {
    id: 'painful-shoulder-calcified-mass',
    discipline: 'Trauma e ortopedia',
    title: 'Dor no ombro com massa calcificada',
    patient: 'Adulto com queixa no ombro esquerdo',
    complaint: 'Tenho dor profunda e dificuldade para mexer o ombro.',
    history: [
      'Os sintomas persistem e pioram com o movimento.',
      'A amplitude reduziu.',
      'Não houve trauma compatível com luxação aguda.',
    ],
    exam: 'Ombro doloroso com limitação de movimento.',
    image: 'rx-shoulder-calcification',
    objective:
      'mostrar a distribuição da calcificação nas incidências AP, perfil escapular e axilar',
    finding: [
      'Lesão calcificada em relação à articulação glenoumeral',
      'Depósito no interior da traqueia',
      'Luxação glenoumeral inequívoca sem calcificação',
    ],
    conclusion: [
      'Lesão por depósito cristalino, confirmada no relato',
      'Fratura traumática recente como único achado',
      'Radiculopatia cervical sem alteração no ombro',
    ],
    explanation:
      'A calcificação é periarticular e a investigação do caso identificou cristais de pirofosfato de cálcio.',
    variation: {
      complaint:
        'Está cada vez mais difícil alcançar objetos acima da cabeça por causa da dor.',
      evolution: 'A limitação veio progressivamente, sem episódio de trauma.',
    },
  },
  {
    id: 'recheck-picc',
    discipline: 'Cardiologia',
    title: 'Controle de cateter após cirurgia cardíaca',
    patient: 'Adulto em pós-operatório cardíaco',
    complaint: 'A equipe pediu para confirmar a posição do acesso venoso.',
    history: [
      'O acesso foi implantado durante esta internação.',
      'O posicionamento é a principal dúvida deste exame.',
      'Houve cirurgia cardíaca recente.',
    ],
    exam: 'Paciente monitorado e em reavaliação da posição do PICC.',
    image: 'rx-picc-tip',
    objective:
      'seguir o trajeto radiopaco do PICC em uma projeção frontal do tórax',
    finding: [
      'Ponta do PICC próxima à junção da cava superior com o átrio direito',
      'Ponta do cateter no interior de um brônquio',
      'Ponta abaixo do diafragma junto à veia cava inferior',
    ],
    conclusion: [
      'Ponta na região cavoatrial no quadro apresentado',
      'Posição intraóssea confirmada',
      'Posição traqueal documentada',
    ],
    explanation:
      'No painel, a seta identifica o segmento terminal do PICC. A posição deve ser interpretada no contexto do tipo de cateter e do estudo completo.',
    variation: {
      complaint:
        'Querem conferir de novo até onde o cateter chega antes de continuar usando o acesso.',
      evolution:
        'O controle foi solicitado após alguns dias de pós-operatório.',
    },
  },
  {
    id: 'glabellar-nodule',
    discipline: 'Cabeça e pescoço',
    title: 'Nódulo na linha média entre as sobrancelhas',
    patient: 'Paciente com nódulo glabelar',
    complaint: 'Há uma bolinha no meio da testa que começou a crescer.',
    history: [
      'O volume cresceu lentamente.',
      'Não ficou quente nem dolorido no início.',
      'Está bem no meio, entre as sobrancelhas.',
    ],
    exam: 'Lesão superficial glabelar em investigação de sua extensão.',
    image: 'us-glabellar-cyst',
    objective:
      'caracterizar em alta frequência uma massa superficial e sua vascularização ao Doppler',
    finding: [
      'Lesão superficial encapsulada, com aspecto predominantemente cístico',
      'Coleção dentro de um ventrículo cerebral visível no Doppler',
      'Fratura nasal deslocada como único achado',
    ],
    conclusion: [
      'Lesão glabelar cística que precisa avaliação da extensão',
      'Tumor intracraniano excluído pela janela superficial',
      'Aneurisma cerebral demonstrado',
    ],
    explanation:
      'O ultrassom mostra o componente superficial. No relato, a ressonância ajudou a avaliar a extensão intracraniana.',
    variation: {
      complaint:
        'Uma saliência bem no centro da testa ficou maior e começou a chamar atenção.',
      evolution: 'O crescimento foi lento, sem surgimento abrupto.',
    },
  },
  {
    id: 'fever-and-liver-pain',
    discipline: 'Abdome',
    title: 'Febre e dor persistente no abdome superior',
    patient: 'Adulto com febre',
    complaint: 'A dor no alto da barriga não passa e estou tendo calafrios.',
    history: [
      'A febre e a dor persistem há dias.',
      'O apetite diminuiu.',
      'A equipe investiga uma lesão focal hepática.',
    ],
    exam: 'Dor no andar superior do abdome com sinais de infecção.',
    image: 'us-liver-collection',
    objective:
      'caracterizar em escala de cinza o conteúdo líquido e ecogênico de uma coleção no fígado',
    finding: [
      'Coleção hepática heterogênea com material ecogênico interno',
      'Vesícula sem cálculos e parênquima hepático homogêneo em toda a figura',
      'Derrame exclusivamente pericárdico',
    ],
    conclusion: [
      'Abscesso hepático no contexto do relato',
      'Cisto simples da bexiga',
      'Hepatomegalia homogênea sem coleção',
    ],
    explanation:
      'A combinação da coleção complexa com febre orienta a suspeita. A causa do abscesso precisa de investigação complementar.',
    variation: {
      complaint:
        'Passei a ter febre com tremores e uma dor forte no alto do abdome.',
      evolution: 'A febre voltou vários dias seguidos e a dor se manteve.',
    },
  },
  {
    id: 'renal-mass-venous-extension',
    discipline: 'Urologia',
    title: 'Massa renal com suspeita de extensão vascular',
    patient: 'Adulto com massa renal esquerda',
    complaint: 'Detectaram uma massa no rim e pediram para avaliar os vasos.',
    history: [
      'A massa foi encontrada em investigação recente.',
      'Houve episódios de hematúria.',
      'A equipe avalia a possibilidade de invasão venosa.',
    ],
    exam: 'Paciente em estadiamento de neoplasia renal.',
    image: 'renal-tumor',
    objective:
      'seguir a extensão tumoral da veia renal à cava inferior em cortes contrastados',
    finding: [
      'Extensão da lesão pela veia renal esquerda até a cava inferior',
      'Dilatação exclusiva do ureter, com veias livres',
      'Cisto cortical sem relação com vasos',
    ],
    conclusion: [
      'Neoplasia renal com trombo tumoral venoso no relato',
      'Ureterolitíase como único achado',
      'Cistite isolada',
    ],
    explanation:
      'O trajeto da extensão segue a drenagem venosa do rim. Sua altura na cava tem implicações para o planejamento do caso.',
    variation: {
      complaint:
        'Explicaram que precisam saber até onde a massa renal alcança por dentro das veias.',
      evolution:
        'A extensão vascular foi investigada após a identificação da massa.',
    },
  },
  {
    id: 'fever-diffuse-micronodules',
    discipline: 'Pneumologia',
    title: 'Febre persistente, perda de peso e dispneia',
    patient: 'Mulher adulta em investigação infecciosa',
    complaint: 'Estou cansada, com febre recorrente e perdendo peso.',
    history: [
      'A febre vem persistindo.',
      'Tive sudorese e dificuldade respiratória.',
      'A equipe pesquisa infecção disseminada.',
    ],
    exam: 'Sintomas respiratórios e sistêmicos em investigação pulmonar.',
    image: 'miliary-nodules',
    objective:
      'avaliar a distribuição de micronódulos em cortes finos na janela pulmonar',
    finding: [
      'Micronódulos difusos nos dois campos pulmonares',
      'Pneumotórax direito sem nódulos',
      'Consolidação única com todos os outros campos livres',
    ],
    conclusion: [
      'Padrão miliar que no relato correspondeu a tuberculose disseminada',
      'Pneumotórax espontâneo',
      'Atelectasia focal como único diagnóstico',
    ],
    explanation:
      'A distribuição difusa dos micronódulos sustenta o padrão miliar. A confirmação de tuberculose depende de dados clínicos e microbiológicos.',
    variation: {
      complaint: 'Há vários dias acordo suada e tenho cada vez menos fôlego.',
      evolution: 'A dispneia apareceu depois da febre e de sintomas gerais.',
    },
  },
  {
    id: 'multifocal-spinal-masses',
    discipline: 'Neurologia',
    title: 'Paraparesia com lesões em níveis diferentes',
    patient: 'Adulto com piora motora',
    complaint:
      'Minhas duas pernas falharam após um período com dor nas costas.',
    history: [
      'A dor vinha antes do episódio de fraqueza.',
      'A alteração afeta as duas pernas.',
      'O exame avalia mais de um segmento da coluna.',
    ],
    exam: 'Paraparesia em investigação de lesões dentro do canal vertebral.',
    image: 'spinal-ependymoma',
    objective:
      'mapear lesões intradurais em sequência T2 nos segmentos torácico e lombar',
    finding: [
      'Múltiplas lesões intradurais nos segmentos torácico e lombar',
      'Fratura isolada de uma costela',
      'Somente protrusão discal cervical sem massa no canal',
    ],
    conclusion: [
      'Lesões intradurais multifocais associadas a ependimoma no relato',
      'Lombalgia sem lesão estrutural',
      'Lesão de nervo periférico unilateral',
    ],
    explanation:
      'A distribuição em níveis diferentes é visível na figura. A identificação do tipo tumoral dependeu da investigação do caso.',
    variation: {
      complaint:
        'As pernas cederam juntas e a dor nas costas já vinha me incomodando.',
      evolution:
        'Houve piora neurológica após um período de sintomas na coluna.',
    },
  },
  {
    id: 'large-hepatic-masses',
    discipline: 'Abdome',
    title: 'Sensação de peso no abdome e aumento hepático',
    patient: 'Mulher jovem com antecedente oncológico',
    complaint: 'Estou sentindo peso do lado direito e minha barriga cresceu.',
    history: [
      'A plenitude abdominal aumentou progressivamente.',
      'Há desconforto no hipocôndrio.',
      'Já fui tratada por neoplasia colorretal.',
    ],
    exam: 'Hepatomegalia em investigação de lesões focais.',
    image: 'hepatic-masses',
    objective:
      'comparar ecogenicidade e componentes sólidos e líquidos das massas do fígado',
    finding: [
      'Duas massas hepáticas predominantemente sólidas, heterogêneas e hipoecoicas',
      'Pequenos cálculos exclusivamente no lúmen vesicular',
      'Fígado sem lesão focal',
    ],
    conclusion: [
      'Lesões hepáticas sólidas que exigem caracterização adicional',
      'Cistos hepáticos simples inequívocos',
      'Apendicite como achado da figura',
    ],
    explanation:
      'Em contexto oncológico, o aspecto ao ultrassom não define a histologia. O relato estabeleceu PEComa por investigação especializada.',
    variation: {
      complaint:
        'Fico cheia mais rápido e sinto um peso no lado direito mesmo sem comer.',
      evolution: 'A plenitude e o aumento abdominal pioraram aos poucos.',
    },
  },
  {
    id: 'left-atrial-mass-flow',
    discipline: 'Cardiologia',
    title: 'Dispneia com alteração do fluxo venoso pulmonar',
    patient: 'Adulto encaminhado para avaliação cardíaca',
    complaint:
      'Fico sem ar ao esforço e o exame mostrou uma massa perto do coração.',
    history: [
      'A falta de ar piorou progressivamente.',
      'Há limitação aos esforços habituais.',
      'A equipe investiga a influência da massa sobre o fluxo.',
    ],
    exam: 'Dispneia em investigação da anatomia do átrio esquerdo e das veias pulmonares.',
    image: 'pulmonary-vein',
    objective:
      'avaliar o fluxo da veia pulmonar em cores e a relação com a parede do átrio em tempo real',
    finding: [
      'Massa relacionada ao átrio esquerdo e jato localizado em Doppler na entrada da veia pulmonar',
      'Vegetação demonstrada na valva tricúspide como único achado',
      'Derrame anecoico externo às câmaras sem massa',
    ],
    conclusion: [
      'Estenose venosa pulmonar associada à massa atrial no caso',
      'Pneumotórax isolado',
      'Disfunção de valva pulmonar como achado direto',
    ],
    explanation:
      'O Doppler documenta o jato na entrada venosa. A anatomia do átrio e da veia esclarece a correlação observada.',
    variation: {
      complaint:
        'Uma massa apareceu no exame e me disseram que pode estar atrapalhando a chegada de sangue ao coração.',
      evolution:
        'Os sintomas aumentaram aos esforços antes da avaliação específica.',
    },
  },
  {
    id: 'prenatal-heart-orientation',
    discipline: 'Ginecologia e obstetrícia',
    title: 'Alteração de orientação do coração fetal',
    patient: 'Gestante em avaliação fetal',
    complaint:
      'No pré-natal, disseram que o coração do bebê aponta para outro lado.',
    history: [
      'A alteração apareceu no exame de rotina.',
      'Foi solicitada avaliação dirigida.',
      'A equipe quer confirmar a lateralidade do coração e dos órgãos.',
    ],
    exam: 'Investigação fetal direcionada ao situs e ao coração.',
    image: 'fetal-laterality',
    objective:
      'acompanhar a vista fetal de quatro câmaras e definir a orientação do ápice',
    finding: [
      'Ápice cardíaco fetal orientado para a direita na vista de quatro câmaras',
      'Apagamento de seios costofrênicos em radiografia neonatal',
      'Colapso de câmaras direitas por derrame pericárdico',
    ],
    conclusion: [
      'Dextrocardia que exige caracterização do situs',
      'Situs inversus de todos os órgãos confirmado por este único plano',
      'Pneumomediastino neonatal',
    ],
    explanation:
      'A direção do ápice estabelece a orientação cardíaca no caso. A lateralidade global depende de avaliar também as demais estruturas.',
    variation: {
      complaint:
        'Fui encaminhada porque a posição do coração no ultrassom do bebê chamou atenção.',
      evolution: 'O achado apareceu durante a avaliação do terceiro trimestre.',
    },
  },
];

export const expandedPlantaoCases = outlines.map(asScenario);
