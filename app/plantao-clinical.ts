import type { Decision, PlantaoScenario } from './plantao-cases';

type Priority = 'imediata' | 'prioritaria' | 'programada';
type ClinicalPlan = {
  priority: Priority;
  sign: string;
  next: string;
  alternative: string;
  why: string;
  reference?: { label: string; url: string };
};

const priorityOptions: Record<Priority, string> = {
  imediata:
    'Atendimento imediato, com avaliação e medidas iniciais em paralelo',
  prioritaria:
    'Avaliação prioritária neste atendimento, conforme sinais vitais e evolução',
  programada:
    'Seguimento direcionado, com orientação de retorno se houver piora',
};
const emergencyCare = {
  label: 'Avaliação inicial em emergências · OMS/ICRC',
  url: 'https://www.who.int/publications-detail-redirect/9789241513081',
};
const plans: Record<string, ClinicalPlan> = {
  biliary: {
    priority: 'programada',
    sign: 'A dor cedeu completamente e o cenário não apresenta febre, icterícia ou sinais peritoneais.',
    next: 'Orientar avaliação eletiva dos cálculos sintomáticos e retorno se houver dor persistente, febre ou icterícia',
    alternative:
      'Indicar internação e antibiótico apenas porque a vesícula contém cálculos',
    why: 'Os sintomas resolvidos favorecem cólica biliar sem complicação atual. A recorrência justifica discutir tratamento definitivo e explicar quando reavaliar.',
  },
  stroke: {
    priority: 'imediata',
    sign: 'Déficit focal súbito com início recente e possibilidade de tratamento tempo-dependente.',
    next: 'Acionar o protocolo de AVC, registrar o último momento sem déficit e acelerar a avaliação para reperfusão',
    alternative:
      'Oferecer antitrombótico empiricamente antes de excluir hemorragia',
    why: 'Cronologia, glicemia e avaliação neurológica orientam a urgência. A decisão sobre reperfusão exige avaliação rápida de elegibilidade e neuroimagem.',
    reference: {
      label: 'Manejo inicial do AVC · AHA/ASA',
      url: 'https://professional.heart.org/en/science-news/2026-guideline-for-the-early-management-of-patients-with-acute-ischemic-stroke/top-things-to-know',
    },
  },
  'hand-trauma': {
    priority: 'prioritaria',
    sign: 'O trauma é localizado, com perfusão e sensibilidade preservadas.',
    next: 'Documentar rotação e exame neurovascular, imobilizar e organizar avaliação ortopédica conforme o alinhamento',
    alternative:
      'Orientar uso livre da mão com base apenas na pouca angulação descrita',
    why: 'A rotação clínica e a função dos dedos influenciam o manejo mesmo quando a angulação radiográfica parece discreta.',
  },
  'fever-focal': {
    priority: 'imediata',
    sign: 'Febre com déficit focal novo exige investigar infecção intracraniana e deterioração neurológica.',
    next: 'Discutir o caso urgentemente com neurocirurgia e infectologia para definir coleta de material e tratamento',
    alternative:
      'Priorizar punção lombar antes de esclarecer o risco de efeito de massa',
    why: 'A suspeita de abscesso com déficit focal exige avaliação hospitalar coordenada. O quadro clínico e a viabilidade de coleta orientam a sequência do tratamento.',
  },
  dyspnea: {
    priority: 'prioritaria',
    sign: 'Dispneia progressiva e limitação ao esforço exigem documentar oxigenação e investigar a causa.',
    next: 'Medir saturação, avaliar repercussão respiratória e investigar causas pleurais ou cardíacas antes de definir intervenções',
    alternative:
      'Assumir insuficiência cardíaca como única causa pela radiografia e encerrar a avaliação',
    why: 'A imagem apoia a presença de derrame, mas a gravidade clínica e a etiologia orientam se são necessários exames adicionais ou drenagem.',
  },
  obstruction: {
    priority: 'prioritaria',
    sign: 'Distensão, vômitos, parada de gases e desidratação sustentam obstrução com risco de complicação.',
    next: 'Manter jejum, corrigir perdas e solicitar avaliação cirúrgica com reavaliação de sinais de isquemia ou peritonite',
    alternative:
      'Prescrever laxante oral para acelerar a eliminação da prótese',
    why: 'A transição mecânica exige abordar perdas e investigar sofrimento intestinal. Neste caso, o corpo estranho ajuda a definir a estratégia cirúrgica.',
  },
  hypotension: {
    priority: 'imediata',
    sign: 'Hipotensão com má perfusão caracteriza choque e exige medidas imediatas.',
    next: 'Iniciar avaliação e suporte do choque e acionar a equipe para drenagem pericárdica urgente quando confirmado tamponamento',
    alternative:
      'Atribuir a hipotensão à diálise e observar até a próxima sessão',
    why: 'O derrame com colapso de câmaras direitas explica o comprometimento do enchimento. Aguardar uma evolução espontânea pode atrasar o tratamento definitivo.',
  },
  'unilateral-dyspnea': {
    priority: 'prioritaria',
    sign: 'O paciente está monitorado e sem choque no cenário, mas a dispneia súbita e o murmúrio unilateral exigem reavaliação rápida.',
    next: 'Monitorar oxigenação e estabilidade e discutir manejo pleural conforme sintomas, repercussão e doença pulmonar de base',
    alternative: 'Dar alta com analgésico pela ausência inicial de choque',
    why: 'Um pneumotórax pode progredir. Se surgirem sinais de tensão e instabilidade, a conduta é emergencial e guiada pela avaliação clínica.',
  },
  'pleuritic-pain': {
    priority: 'prioritaria',
    sign: 'Dispneia súbita e dor pleurítica exigem identificar instabilidade e estimar risco tromboembólico.',
    next: 'Estratificar gravidade e risco de sangramento para decidir anticoagulação, observação ou escalonamento',
    alternative:
      'Indicar reperfusão sistêmica para qualquer trombo demonstrado, independentemente da estabilidade',
    why: 'A intensidade do tratamento depende da repercussão hemodinâmica, da disfunção ventricular direita e do risco hemorrágico.',
    reference: {
      label: 'Manejo da embolia pulmonar · AHA/ACC',
      url: 'https://professional.heart.org/en/science-news/2026-guideline-for-the-evaluation-and-management-of-acute-pulmonary-embolism-in-adults/top-things-to-know',
    },
  },
  'painful-groin': {
    priority: 'prioritaria',
    sign: 'Massa dolorosa e de difícil redução sugere encarceramento e risco de sofrimento do conteúdo.',
    next: 'Encaminhar à cirurgia com prioridade e manter jejum enquanto se avaliam sinais de estrangulamento',
    alternative:
      'Insistir em manobras repetidas e forçadas de redução sem avaliação cirúrgica',
    why: 'A dor persistente e os sinais inflamatórios tornam importante avaliar a viabilidade do conteúdo e tratar a causa.',
  },
  'bilateral-flank-pain': {
    priority: 'prioritaria',
    sign: 'Oligúria e possível obstrução bilateral ameaçam a função renal.',
    next: 'Avaliar eletrólitos e função renal e discutir descompressão urinária urgente com a urologia',
    alternative:
      'Esperar eliminação espontânea em casa sem acompanhar função renal ou diurese',
    why: 'Obstrução em ambos os ureteres e queda da diurese exigem avaliar lesão renal e necessidade de alívio da obstrução.',
  },
  'burn-respiratory-failure': {
    priority: 'imediata',
    sign: 'Hipoxemia em piora com necessidade crescente de suporte ventilatório.',
    next: 'Reavaliar suporte respiratório com terapia intensiva, aplicar estratégia ventilatória protetora se indicada e investigar a causa',
    alternative:
      'Fixar uma causa somente pelo padrão radiográfico e manter o suporte sem reavaliação',
    why: 'A evolução da oxigenação e a mecânica pulmonar orientam o suporte. Infecção e causas não infecciosas precisam ser investigadas.',
  },
  'sudden-brainstem-deficit': {
    priority: 'imediata',
    sign: 'Alteração abrupta de consciência e sinais de tronco encefálico podem comprometer a proteção de via aérea.',
    next: 'Priorizar via aérea e monitorização e acionar a equipe de AVC hemorrágico e neurocrítica',
    alternative:
      'Iniciar tratamento de AVC isquêmico sem interpretar o sangramento identificado',
    why: 'A topografia e a extensão hemorrágica exigem avaliação neurocrítica e vigilância de deterioração.',
  },
  'postural-headache-confusion': {
    priority: 'imediata',
    sign: 'Confusão nova após dias de cefaleia indica deterioração neurológica.',
    next: 'Acionar neurocirurgia urgentemente e discutir a investigação da hipotensão intracraniana junto ao controle do efeito de massa',
    alternative:
      'Tratar apenas a cefaleia postural e programar retorno ambulatorial',
    why: 'O desvio de linha média e a alteração de consciência mudam a prioridade. A causa subjacente também pode influenciar recorrência.',
  },
  'acute-scrotum': {
    priority: 'imediata',
    sign: 'Dor escrotal unilateral abrupta e náuseas levantam suspeita de torção com isquemia tempo-dependente.',
    next: 'Acionar urologia imediatamente e evitar atrasar a avaliação cirúrgica se a suspeita clínica for alta',
    alternative:
      'Aguardar uma segunda ultrassonografia eletiva para só então chamar a urologia',
    why: 'A viabilidade testicular depende da duração da isquemia. Um exame complementar não deve atrasar a decisão urgente quando a clínica é forte.',
    reference: {
      label: 'Escroto agudo · AUA',
      url: 'https://auau.auanet.org/sites/default/files/US2021%20Lesson%2029.pdf',
    },
  },
  'unilateral-pelvic-pain': {
    priority: 'imediata',
    sign: 'Dor intensa unilateral com vômitos e cisto anexial pode representar torção.',
    next: 'Solicitar avaliação ginecológica cirúrgica urgente e interpretar o ultrassom junto à clínica',
    alternative:
      'Excluir torção apenas porque existe algum fluxo ovariano ao Doppler',
    why: 'Fluxo detectável não exclui torção. A suspeita clínica em gestante com dor intensa orienta a avaliação especializada rápida.',
  },
  'pregnancy-spotting': {
    priority: 'prioritaria',
    sign: 'Sangramento na gestação inicial com cicatriz uterina, sem instabilidade descrita, exige localizar a gestação.',
    next: 'Encaminhar para obstetrícia especializada e definir conduta conforme localização, estabilidade e risco hemorrágico',
    alternative:
      'Realizar esvaziamento uterino de rotina sem avaliar a relação com a cicatriz',
    why: 'Implantação em cicatriz de cesárea modifica o risco e o manejo. A decisão exige avaliação especializada.',
    reference: {
      label: 'Encaminhamento na suspeita de ectópica · NICE',
      url: 'https://www.nice.org.uk/guidance/qs69/chapter/Quality-statement-1-Timely-referral-to-early-pregnancy-assessment-services',
    },
  },
  'infant-vomiting': {
    priority: 'prioritaria',
    sign: 'Vômitos em jato e redução de fraldas molhadas sugerem obstrução da saída gástrica com desidratação.',
    next: 'Avaliar hidratação e eletrólitos, corrigir distúrbios e encaminhar para cirurgia pediátrica',
    alternative:
      'Levar direto ao procedimento definitivo sem avaliar desidratação ou distúrbios eletrolíticos',
    why: 'Na estenose do piloro, a correção metabólica precede o procedimento definitivo, que deve ser coordenado com a equipe pediátrica.',
  },
  'shoulder-contour-loss': {
    priority: 'prioritaria',
    sign: 'Deformidade persistente após fratura tratada exige examinar perfusão, sensibilidade e estabilidade.',
    next: 'Documentar o exame neurovascular e discutir redução planejada com ortopedia, considerando a cronicidade e a fixação prévia',
    alternative:
      'Fazer redução forçada como se fosse luxação aguda simples, sem revisar a fratura ou o implante',
    why: 'Uma luxação persistente com material de fixação pode exigir abordagem diferente de um episódio agudo sem fratura.',
  },
  'abdominal-pain-vascular': {
    priority: 'imediata',
    sign: 'Dor súbita associada a aneurisma e ruptura contida pode evoluir rapidamente para choque.',
    next: 'Acionar cirurgia vascular imediatamente e organizar suporte e reparo em via de emergência',
    alternative: 'Observar como caso eletivo porque a ruptura está contida',
    why: 'Ruptura contida é uma emergência vascular. A estabilização e a decisão de reparo precisam ocorrer em paralelo.',
  },
  'pain-following-aortic-repair': {
    priority: 'prioritaria',
    sign: 'Dor recorrente após cirurgia aórtica requer reavaliar sinais de síndrome aórtica aguda e repercussão dos ramos.',
    next: 'Revisar evolução e perfusão, discutir a anatomia com equipe de aorta e definir urgência da intervenção',
    alternative:
      'Atribuir a dor à cicatriz apenas porque a aorta ascendente já foi operada',
    why: 'A dissecção residual pode envolver o arco e seus ramos. Sintomas, estabilidade e evolução anatômica orientam o plano.',
  },
  'pelvic-trauma-followup': {
    priority: 'programada',
    sign: 'O cenário é de controle após estabilização, sem sangramento ativo ou piora aguda descritos.',
    next: 'Rever alinhamento e fixação com ortopedia e orientar carga e reabilitação conforme a estabilidade da lesão',
    alternative:
      'Liberar carga total apenas porque o fixador aparece bem posicionado na projeção frontal',
    why: 'A reabilitação depende do padrão completo da fratura, da estabilidade e da avaliação pós-operatória.',
  },
  'orthopnea-and-edema': {
    priority: 'prioritaria',
    sign: 'Ortopneia com estertores e edema indica congestão. Oxigenação e perfusão definem se é preciso escalar imediatamente.',
    next: 'Avaliar oxigenação, perfusão e congestão, ajustar suporte e tratamento descongestivo à repercussão clínica',
    alternative:
      'Administrar reposição volêmica de rotina sem avaliar os sinais de congestão',
    why: 'As medidas dependem da pressão arterial, perfusão e grau de congestão. A imagem ajuda a confirmar o quadro e acompanhar a resposta.',
  },
  'acute-epigastric-pain': {
    priority: 'imediata',
    sign: 'Dor súbita generalizada com defesa sugere perfuração e risco de peritonite.',
    next: 'Manter jejum, iniciar suporte conforme sinais vitais e acionar cirurgia urgente para controle da fonte',
    alternative: 'Tratar como dispepsia e aguardar resposta ambulatorial',
    why: 'A irritação peritoneal e o pneumoperitônio sustentam uma urgência cirúrgica.',
  },
  'distended-child': {
    priority: 'prioritaria',
    sign: 'Distensão importante e parada de eliminação em criança sugerem obstrução e risco de sofrimento intestinal.',
    next: 'Manter jejum, corrigir perdas e envolver cirurgia pediátrica para avaliar descompressão ou operação',
    alternative:
      'Dar laxante e adiar avaliação porque havia constipação prévia',
    why: 'O estado da alça e sinais de peritonite diferenciam situações em que se pode discutir descompressão das que exigem cirurgia imediata.',
  },
  'perineal-infection': {
    priority: 'imediata',
    sign: 'Dor intensa, febre e progressão rápida para fora do períneo sugerem infecção necrosante.',
    next: 'Acionar cirurgia e iniciar suporte e antimicrobianos empíricos em paralelo à avaliação para desbridamento urgente',
    alternative:
      'Tratar somente a pele com medicação tópica enquanto aguarda melhora',
    why: 'O controle da fonte é central na infecção profunda. A progressão clínica não deve aguardar confirmação eletiva.',
  },
  'febrile-renal-syndrome': {
    priority: 'prioritaria',
    sign: 'Febre, plaquetopenia e oligúria exigem acompanhar risco hemorrágico, perfusão e função renal.',
    next: 'Monitorar diurese, eletrólitos e hemodinâmica e investigar causas infecciosas e renais em paralelo',
    alternative:
      'Ancorar o tratamento em pancreatite sem reavaliar a injúria renal e a plaquetopenia',
    why: 'Os achados pancreáticos podem aparecer em outras doenças. A evolução renal e a investigação etiológica mudaram o manejo no relato.',
  },
  'cancer-saddle-numbness': {
    priority: 'imediata',
    sign: 'Anestesia em sela, fraqueza bilateral e alteração urinária são sinais de alarme que exigem avaliação imediata.',
    next: 'Solicitar avaliação de urgência da coluna e RM, comunicando ao time especializado o déficit e os sintomas esfincterianos',
    alternative:
      'Solicitar fisioterapia e reservar a RM para depois de um período de tratamento sintomático',
    why: 'Os sinais neurológicos são de alarme. A causa pode ser compressiva ou infiltrativa e define o manejo especializado.',
    reference: {
      label: 'Investigação de cauda equina · ACR',
      url: 'https://acsearch.acr.org/docs/69483/Narrative/',
    },
  },
  'febrile-elbow': {
    priority: 'prioritaria',
    sign: 'Febre e dor à mobilização com derrame em criança sugerem infecção articular.',
    next: 'Acionar ortopedia e equipe pediátrica para avaliar coleta, drenagem e antimicrobianos conforme estabilidade',
    alternative:
      'Tratar como entorse sem avaliar o líquido articular ou a febre',
    why: 'Infecção articular e óssea requer abordagem coordenada. O estado clínico define a urgência das medidas e da coleta.',
  },
  'headache-on-device-infection': {
    priority: 'imediata',
    sign: 'Cefaleia aguda com suspeita de hemorragia em contexto de infecção sistêmica.',
    next: 'Acionar avaliação neurovascular urgente e integrar a investigação da infecção do dispositivo',
    alternative:
      'Abordar somente a infecção do dispositivo e adiar a avaliação do sangramento',
    why: 'A hemorragia e o possível aneurisma infeccioso exigem decisões conjuntas entre as equipes neurovascular e infecciosa.',
  },
  'newborn-respiratory-distress': {
    priority: 'imediata',
    sign: 'Retrações e taquipneia em recém-nascido exigem avaliar imediatamente o esforço e a oxigenação.',
    next: 'Monitorar o recém-nascido, ajustar suporte à repercussão e reavaliar sinais de escape aéreo progressivo',
    alternative:
      'Drenar o tórax apenas pelo sinal de vela, sem documentar repercussão ou pneumotórax',
    why: 'Pneumomediastino e pneumotórax têm implicações diferentes. A evolução clínica orienta necessidade de suporte ou intervenção.',
  },
  'incidental-vascular-spleen': {
    priority: 'programada',
    sign: 'O aneurisma foi encontrado incidentalmente e o cenário não descreve dor aguda ou instabilidade.',
    next: 'Encaminhar à equipe vascular para caracterizar tamanho, risco de ruptura e estratégia de seguimento ou tratamento',
    alternative: 'Ignorar o achado porque foi incidental e não produz dor',
    why: 'Mesmo assintomático, um aneurisma precisa de avaliação de risco individual. A condição hematológica influencia o plano.',
  },
  'gait-and-cognition': {
    priority: 'prioritaria',
    sign: 'Marcha e cognição em declínio com hidrocefalia obstrutiva exigem avaliação neurológica dirigida.',
    next: 'Discutir a obstrução com neurocirurgia e avaliar evolução clínica antes de escolher estratégia liquórica',
    alternative:
      'Assumir hidrocefalia de pressão normal sem considerar o mecanismo obstrutivo demonstrado',
    why: 'O mecanismo altera a investigação e o procedimento. O quadro clínico complementa a avaliação da derivação do líquor.',
  },
  'episodic-palpitation-adrenal': {
    priority: 'prioritaria',
    sign: 'Crises adrenérgicas e massa suprarrenal exigem avaliar pressão e secreção hormonal.',
    next: 'Solicitar avaliação endócrina e confirmação bioquímica antes de procedimentos sobre a massa',
    alternative:
      'Realizar biópsia percutânea imediata sem investigar atividade catecolaminérgica',
    why: 'Uma lesão secretora pode descompensar durante manipulação. A investigação funcional e o preparo especializado mudam a segurança do procedimento.',
  },
  'painful-midline-scar': {
    priority: 'programada',
    sign: 'O nódulo é focal e tardio, com ausência de irritação peritoneal no cenário.',
    next: 'Correlacionar a imagem com a cicatriz, avaliar repercussão da dor e encaminhar para revisão cirúrgica eletiva',
    alternative:
      'Iniciar antibiótico para abscesso somente por haver um nódulo doloroso',
    why: 'A imagem localiza ossificação fora do esqueleto. Sintomas persistentes e prejuízo funcional orientam a revisão eletiva.',
  },
  'fever-and-cervical-nodes': {
    priority: 'prioritaria',
    sign: 'Febre e linfonodos necróticos exigem avaliar via aérea e pesquisar causas infecciosas, inflamatórias e neoplásicas.',
    next: 'Investigar etiologia e discutir amostra linfonodal quando indicada antes de definir tratamento específico',
    alternative:
      'Dar diagnóstico definitivo de tuberculose pela necrose central sem investigação microbiológica ou tecidual',
    why: 'A necrose é um padrão compartilhado por condições distintas. A confirmação muda o manejo.',
  },
  'recurrent-epigastric-pain': {
    priority: 'prioritaria',
    sign: 'Dor recorrente com perda de peso exige investigar insuficiência pancreática e outras causas.',
    next: 'Avaliar estado nutricional, função pancreática exócrina e glicemia e planejar seguimento especializado',
    alternative:
      'Tratar apenas a dor episódica sem avaliar perda ponderal ou função pancreática',
    why: 'O manejo da pancreatite crônica inclui repercussões nutricionais, endócrinas e controle da causa.',
  },
  'vomiting-ataxia-during-pregnancy': {
    priority: 'imediata',
    sign: 'Ataxia e alteração mental após vômitos prolongados indicam uma complicação neurológica que exige avaliação e suporte imediatos.',
    next: 'Iniciar avaliação hospitalar e reposição de tiamina prontamente, com correção da desidratação e dos distúrbios metabólicos',
    alternative:
      'Aguardar a RM de controle para decidir se a deficiência deve ser tratada',
    why: 'A suspeita clínica em contexto de hiperêmese requer resposta precoce. A imagem ajuda na investigação, sem determinar o início do tratamento.',
  },
  'bilateral-l5-radiculopathy': {
    priority: 'prioritaria',
    sign: 'Déficit motor bilateral progressivo exige avaliar sinais esfincterianos e compressão do saco dural.',
    next: 'Solicitar avaliação da equipe de coluna com prioridade e revisar gravidade, progressão e mecanismo compressivo',
    alternative:
      'Indicar apenas analgesia e fisioterapia de rotina apesar da piora motora',
    why: 'A perda de força muda a urgência da investigação e pode indicar necessidade de descompressão especializada.',
  },
  'thoracic-spinal-compression': {
    priority: 'prioritaria',
    sign: 'A alteração bilateral de marcha com rigidez pode refletir mielopatia compressiva progressiva.',
    next: 'Encaminhar à equipe de coluna para avaliar progressão neurológica e benefício de descompressão',
    alternative: 'Investigar apenas o joelho por haver limitação de marcha',
    why: 'A combinação de sinais bilaterais com compressão torácica direciona a avaliação para a medula.',
  },
  'thenar-enlargement-child': {
    priority: 'programada',
    sign: 'A massa cresce lentamente e o cenário não descreve comprometimento neurovascular ou trauma agudo.',
    next: 'Verificar função da mão e encaminhar avaliação especializada da massa antes de propor retirada',
    alternative:
      'Drenar a massa como se fosse coleção infecciosa sem caracterização',
    why: 'A relação com osso, tendões e estruturas da mão influencia a investigação e o planejamento.',
  },
  'painful-shoulder-calcified-mass': {
    priority: 'programada',
    sign: 'Dor e perda de amplitude são progressivas, sem trauma agudo ou instabilidade descritos.',
    next: 'Correlacionar a lesão com o exame e encaminhar avaliação ortopédica para caracterização e manejo funcional',
    alternative:
      'Assumir uma tendinite calcária comum e ignorar a massa periarticular atípica',
    why: 'O depósito localizado exige diferenciar massas e doença articular. O diagnóstico do relato dependeu de investigação complementar.',
  },
  'recheck-picc': {
    priority: 'prioritaria',
    sign: 'O acesso está em uso ou prestes a ser usado, e sua posição precisa ser confirmada.',
    next: 'Conferir a ponta e o trajeto, documentar a posição e discutir ajuste com a equipe de acesso se houver migração ou posição inadequada',
    alternative: 'Liberar a linha somente porque houve refluxo de sangue',
    why: 'Refluxo não define a localização terminal. A decisão combina posição documentada, tipo de linha e uso pretendido.',
  },
  'glabellar-nodule': {
    priority: 'programada',
    sign: 'Massa lenta na linha média sem sinais de infecção aguda, mas com necessidade de avaliar extensão.',
    next: 'Planejar imagem da extensão e avaliação especializada antes de intervenções na lesão',
    alternative:
      'Remover o componente superficial sem investigar possível comunicação profunda',
    why: 'Lesões medianas podem se estender a planos profundos. Delimitar a anatomia ajuda a planejar a abordagem.',
  },
  'fever-and-liver-pain': {
    priority: 'prioritaria',
    sign: 'Febre persistente e coleção hepática sugerem infecção que pode evoluir com repercussão sistêmica.',
    next: 'Avaliar sinais de sepse, obter amostras quando possível e discutir antimicrobianos e drenagem conforme a coleção',
    alternative:
      'Programar apenas controle ultrassonográfico eletivo, sem avaliar a infecção',
    why: 'A estabilidade, o tamanho e a causa da coleção orientam tratamento e controle da fonte.',
  },
  'renal-mass-venous-extension': {
    priority: 'prioritaria',
    sign: 'A suspeita de extensão para a cava muda estadiamento e planejamento vascular.',
    next: 'Completar estadiamento e discutir a relação com a cava em equipe urológica, oncológica e vascular',
    alternative:
      'Planejar retirada renal sem mapear a altura da extensão venosa',
    why: 'A altura e a extensão do trombo tumoral influenciam riscos e a equipe necessária para o procedimento.',
  },
  'fever-diffuse-micronodules': {
    priority: 'prioritaria',
    sign: 'Febre e dispneia com padrão difuso levantam infecção disseminada e possível transmissão respiratória.',
    next: 'Avaliar oxigenação, instituir precauções respiratórias quando houver suspeita transmissível e investigar confirmação microbiológica',
    alternative:
      'Concluir o diagnóstico somente pelo padrão miliar e ignorar medidas de precaução',
    why: 'O padrão de imagem não define o agente. A avaliação clínica e microbiológica orienta o tratamento e as precauções.',
  },
  'multifocal-spinal-masses': {
    priority: 'imediata',
    sign: 'Paraparesia recente com lesões intradurais exige descartar deterioração medular em curso.',
    next: 'Acionar avaliação neurocirúrgica, mapear a extensão e correlacionar o nível dos sintomas com as lesões',
    alternative:
      'Tratar como lombalgia comum enquanto aguarda seguimento eletivo',
    why: 'Mais de um nível pode estar envolvido. O exame neurológico orienta qual alteração exige atenção imediata.',
  },
  'large-hepatic-masses': {
    priority: 'prioritaria',
    sign: 'Massas grandes e história oncológica exigem caracterização, mesmo quando os sintomas não são agudos.',
    next: 'Organizar caracterização por imagem e discussão multidisciplinar antes de atribuir a histologia ou indicar biópsia',
    alternative:
      'Classificar todas as massas como metástases pelo antecedente, sem investigação da lesão',
    why: 'A história modifica a probabilidade, mas a caracterização influencia o modo de obter diagnóstico e a estratégia terapêutica.',
  },
  'left-atrial-mass-flow': {
    priority: 'prioritaria',
    sign: 'Dispneia progressiva com alteração do fluxo venoso pulmonar exige avaliar repercussão cardiopulmonar.',
    next: 'Quantificar o impacto hemodinâmico e discutir a anatomia e o tratamento da obstrução com equipe cardíaca',
    alternative:
      'Prescrever somente tratamento para broncoespasmo apesar da limitação do fluxo demonstrada',
    why: 'A relação da massa com a veia e a repercussão clínica orientam a escolha de intervenção.',
  },
  'prenatal-heart-orientation': {
    priority: 'programada',
    sign: 'O cenário é de achado no pré-natal, sem sinais de sofrimento fetal agudo.',
    next: 'Solicitar avaliação fetal especializada para caracterizar o situs, o coração e possíveis anomalias associadas',
    alternative:
      'Concluir alteração de todos os órgãos pela orientação isolada do ápice',
    why: 'Dextrocardia descreve a orientação do coração. O manejo pré-natal depende da avaliação anatômica e funcional completa.',
  },
};

function optionDecision(
  title: string,
  hint: string,
  correct: string,
  alternatives: readonly string[],
  explanation: string,
  offset: number,
): Decision {
  const options = [correct, ...alternatives];
  return {
    title,
    hint,
    explanation,
    options: [...options.slice(offset), ...options.slice(0, offset)],
    correct: (options.length - offset) % options.length,
  };
}

export function getClinicalPlan(scenario: PlantaoScenario) {
  const baseId = scenario.id.split('~')[0];
  const plan = plans[baseId];
  if (!plan) throw new Error(`Conduta ausente no caso ${baseId}`);
  let offset = 0;
  for (let index = 0; index < scenario.id.length; index += 1) {
    offset = (offset + scenario.id.charCodeAt(index)) % 3;
  }
  const urgency = optionDecision(
    'Qual é a prioridade neste momento?',
    'Estime a estabilidade e o risco de deterioração antes de pedir exames.',
    priorityOptions[plan.priority],
    Object.entries(priorityOptions)
      .filter(([priority]) => priority !== plan.priority)
      .map(([, label]) => label),
    plan.sign,
    offset,
  );
  const hypothesis =
    baseId === 'hand-trauma'
      ? optionDecision(
          'Qual hipótese integra o mecanismo e a localização da dor?',
          'Relacione o impacto no bordo ulnar com a dor logo antes da articulação do dedo mínimo.',
          'Fratura do quinto metacarpo direito',
          [
            'Fratura do escafoide com dor predominante na tabaqueira anatômica',
            'Luxação isolada da falange distal do dedo mínimo',
          ],
          'O impacto no bordo ulnar e a dor focal sobre o metacarpo favorecem essa lesão. A radiografia caracteriza a fratura.',
          (offset + 1) % 3,
        )
      : {
          ...scenario.decisions[2],
          title: 'Qual hipótese você prioriza neste contexto?',
        };
  const management = optionDecision(
    'Qual é a próxima conduta mais apropriada para este cenário?',
    'Considere o risco imediato e o que pode mudar o desfecho ou o seguimento.',
    plan.next,
    [
      plan.alternative,
      'Encerrar a avaliação após a melhora da queixa, sem plano de reavaliação',
    ],
    plan.why,
    (offset + 2) % 3,
  );
  return {
    decisions: [urgency, hypothesis, management] as const,
    reference: plan.reference ?? scenario.reference ?? emergencyCare,
  };
}
