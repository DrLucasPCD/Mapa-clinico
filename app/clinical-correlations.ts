export const clinicalReferences = {
  neuro: {
    label: 'OpenStax · Exame e localização neurológica',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/16-1-overview-of-the-neurological-exam',
  },
  motor: {
    label: 'OpenStax · Exames de sensibilidade e motricidade',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/16-4-the-sensory-and-motor-exams',
  },
  myelopathy: {
    label: 'ACR · Imagem na mielopatia',
    url: 'https://acsearch.acr.org/docs/69484/Narrative/',
  },
  hearing: {
    label: 'AAO-HNS · Perda auditiva súbita',
    url: 'https://www.entnet.org/quality-practice/quality-products/clinical-practice-guidelines/sudden-hearing-loss-update/',
  },
  gait: {
    label: 'OpenStax · Coordenação e marcha',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/16-5-the-coordination-and-gait-exams',
  },
  cranial: {
    label: 'OpenStax · Exame dos nervos cranianos',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/16-3-the-cranial-nerve-exam',
  },
  cognition: {
    label: 'OpenStax · Exame do estado mental',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/16-2-the-mental-status-exam',
  },
  csf: {
    label: 'OpenStax · Circulação e sistema ventricular',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/13-3-circulation-and-the-central-nervous-system',
  },
  stroke: {
    label: 'AHA/ASA · Avaliação no AVC isquêmico agudo',
    url: 'https://professional.heart.org/en/science-news/2026-guideline-for-the-early-management-of-patients-with-acute-ischemic-stroke',
  },
  oculomotor: {
    label: 'AAO · Paralisia adquirida do nervo oculomotor',
    url: 'https://www.aao.org/eyenet/article/acquired-isolated-third-nerve-palsy',
  },
  heart: {
    label: 'AHA/ACC/HFSA · Insuficiência cardíaca',
    url: 'https://professional.heart.org/en/-/media/832EA0F4E73948848612F228F7FA2D35.pdf',
  },
  coronary: {
    label: 'ACC/AHA · Síndromes coronarianas agudas',
    url: 'https://professional.heart.org/en/science-news/2025-guideline-for-the-management-of-patients-with-acute-coronary-syndromes/top-things-to-know',
  },
  infarction: {
    label: 'AHA · Definição universal de infarto do miocárdio',
    url: 'https://professional.heart.org/en/science-news/fifth-universal-definition-of-myocardial-infarction-2026/top-things-to-know',
  },
  aorta: {
    label: 'ACC/AHA · Doenças da aorta',
    url: 'https://professional.heart.org/en/science-news/2022-guideline-for-the-diagnosis-and-management-of-aortic-disease/top-things-to-know',
  },
  af: {
    label: 'ACC/AHA/ACCP/HRS · Fibrilação atrial',
    url: 'https://professional.heart.org/en/science-news/2023-acc-aha-accp-hrs-guideline-for-the-diagnosis-and-management-of-atrial-fibrillation/top-things-to-know',
  },
  embolism: {
    label: 'AHA/ACC · Embolia pulmonar aguda',
    url: 'https://professional.heart.org/en/science-news/2026-guideline-for-the-evaluation-and-management-of-acute-pulmonary-embolism-in-adults',
  },
  valves: {
    label: 'ASE · Avaliação ecocardiográfica de regurgitação valvar',
    url: 'https://www.asecho.org/guideline/native-valvular-regurgitation-by-echo/',
  },
  svc: {
    label: 'ACR · Suspeita de obstrução das veias torácicas',
    url: 'https://acsearch.acr.org/docs/3196043/Narrative',
  },
  swallowing: {
    label: 'ACG · Disfagia e investigação do esôfago',
    url: 'https://gi.org/topics/dysphagia/',
  },
  bileDuct: {
    label: 'ASGE · Investigação e tratamento da coledocolitíase',
    url: 'https://www.asge.org/home/resources/publications/guidelines/asge-guideline-on-the-role-of-endoscopy-in-the-evaluation-and-management-of-choledocholithiasis',
  },
  cholangitis: {
    label: 'ASGE · Avaliação e manejo da colangite',
    url: 'https://www.asge.org/home/resources/publications/guidelines/asge-guideline-on-the-management-of-cholangitis',
  },
  biliary: {
    label: 'ACR · Imagem na dor do quadrante superior direito',
    url: 'https://acsearch.acr.org/docs/69474/Narrative/',
  },
  ascites: {
    label: 'AASLD · Avaliação de ascite e peritonite bacteriana espontânea',
    url: 'https://www.aasld.org/practice-guidelines/diagnosis-evaluation-and-management-ascites-spontaneous-bacterial-peritonitis',
  },
  ascitesAnalysis: {
    label: 'AASLD · Interpretação do gradiente e da proteína na ascite',
    url: 'https://www.aasld.org/liver-fellow-network/core-series/why-series/why-timing-matters-paracentesis-admission-cirrhosis',
  },
  pancreatitis: {
    label: 'ACG · Pancreatite aguda',
    url: 'https://webfiles.gi.org/links/journals/AJG-Clinical-Guidelines-Highlights-Acute-Pancreatitis-2024-FINAL.pdf',
  },
  bleeding: {
    label: 'NICE · Hemorragia digestiva alta',
    url: 'https://www.nice.org.uk/guidance/cg141/chapter/Recommendations',
  },
  appendix: {
    label: 'ACR · Dor na fossa ilíaca direita',
    url: 'https://acsearch.acr.org/docs/69357/Narrative/',
  },
  diverticulitis: {
    label: 'ACR · Dor na fossa ilíaca esquerda',
    url: 'https://acsearch.acr.org/docs/69356/Narrative/',
  },
} as const;

export type ClinicalCorrelation = {
  title: string;
  name?: string;
  mechanism: string;
  exam: string;
  distinction: string;
  investigation: string;
  references: readonly (keyof typeof clinicalReferences)[];
  exercise?: { question: string; explanation: string };
};

export const clinicalCorrelations: Readonly<
  Record<string, ClinicalCorrelation>
> = {
  heart: {
    title: 'Dispneia, congestão e perfusão',
    mechanism:
      'Quando o ventrículo esquerdo precisa de maior pressão para encher, essa pressão pode se transmitir ao átrio esquerdo e aos capilares pulmonares. Se o lado direito estiver congestionado, o aumento da pressão venosa costuma aparecer nas jugulares e pode atingir o fígado, os membros inferiores e o peritônio. A perfusão arterial pode estar boa mesmo com congestão importante.',
    exam: 'Pergunte quantos travesseiros o paciente usa, se acorda ofegante e como mudou a tolerância ao esforço. Avalie jugulares, pulmões e edema. Faça uma segunda leitura voltada à perfusão, observando temperatura das extremidades, diurese, enchimento capilar e nível de consciência.',
    distinction:
      'Edema isolado pode ter causa venosa, medicamentosa ou renal. Estertores com febre e achado focal levantam pneumonia. Na dispneia com edema e jugulares elevadas, combine história e exame para decidir se há congestão cardíaca e se ela vem acompanhada de hipoperfusão.',
    investigation:
      'ECG, peptídeos natriuréticos e ecocardiograma esclarecem aspectos diferentes. A avaliação integra ritmo, estrutura, valvas e sinais de pressão de enchimento. Fração de ejeção preservada, por si só, é insuficiente para excluir insuficiência cardíaca. Confusão e oligúria com extremidades frias exigem avaliação de instabilidade.',
    references: ['heart'],
    exercise: {
      question:
        'Um paciente alerta, com extremidades quentes e diurese mantida, apresenta ortopneia, edema e jugulares elevadas. Que dois aspectos você deve registrar?',
      explanation:
        'Há sinais de congestão, com perfusão clínica aparentemente preservada naquele momento. Avaliar esses eixos em separado evita interpretar todo acúmulo de líquido como choque e ajuda a reconhecer se a perfusão piorar.',
    },
  },
  'right-atrium': {
    title: 'O que a jugular revela sobre o átrio direito',
    mechanism:
      'As oscilações da pressão atrial direita chegam às jugulares. Na regurgitação tricúspide, parte do volume volta ao átrio durante a sístole, o que pode aumentar a onda venosa sistólica. Pressão atrial elevada também ocorre por dificuldade de enchimento ou falência ventricular direita.',
    exam: 'Observe a jugular interna com a cabeceira elevada, ajustando a inclinação para identificar o topo da coluna. Relacione a pulsação com o ciclo arterial e procure hepatomegalia dolorosa, edema e sopro paraesternal que se acentua na inspiração.',
    distinction:
      'A jugular elevada sugere pressão de enchimento direita aumentada. O padrão da onda e o restante do exame ajudam a separar refluxo tricúspide, sobrecarga de volume e restrição ao enchimento.',
    investigation:
      'No ecocardiograma, confira tamanho do átrio direito, função ventricular direita e repercussão da regurgitação. A interpretação da cava inferior perde precisão em alguns contextos, como ventilação com pressão positiva.',
    references: ['heart', 'valves'],
  },
  'left-atrium': {
    title: 'Pressão pulmonar e estase no apêndice atrial',
    mechanism:
      'A pressão no átrio esquerdo pode subir quando a mitral obstrui o enchimento ou deixa regurgitar volume. A perda de contração organizada na fibrilação atrial favorece estase, sobretudo no apêndice atrial esquerdo, e permite a formação de trombo.',
    exam: 'Relacione palpitações, dispneia aos esforços e quedas de tolerância funcional. Verifique regularidade do pulso e procure sopro mitral e sinais pulmonares. Pergunte sobre sintomas neurológicos abruptos que possam corresponder a embolia.',
    distinction:
      'A dilatação atrial sugere carga hemodinâmica acumulada. Para demonstrar fibrilação atrial é preciso documentar o ritmo. Dispneia com átrio grande pode refletir doença mitral, disfunção diastólica ou arritmia coexistente.',
    investigation:
      'O ECG documenta a arritmia. O eco transtorácico mede volume atrial e avalia a mitral. Quando a investigação exige estudar trombo no apêndice, a ecocardiografia transesofágica pode visualizá-lo melhor.',
    references: ['af', 'valves'],
  },
  'right-ventricle': {
    title: 'Sobrecarga direita com hipotensão',
    mechanism:
      'Uma elevação súbita da resistência vascular pulmonar distende o ventrículo direito. O septo pode se deslocar para a esquerda, reduzindo o enchimento do ventrículo esquerdo e o débito sistêmico. A perda de contração por infarto do VD também reduz o fluxo para o lado esquerdo.',
    exam: 'Em dispneia aguda ou dor torácica, meça pressão e saturação, observe jugulares e procure sinais de má perfusão. Ausculte os pulmões. Hipotensão com jugulares elevadas e ausculta pulmonar relativamente limpa aponta para uma limitação de débito que merece localização rápida.',
    distinction:
      'Hipoxemia de início súbito e fatores trombóticos favorecem embolia pulmonar. Supra de ST inferior associado a achados em derivações direitas favorece infarto de VD. Tamponamento também pode elevar a pressão venosa e limitar o enchimento.',
    investigation:
      'Relacione história e ECG com o eco à beira do leito para explicar achados como dilatação, desvio septal e derrame pericárdico. Em cenário compatível, confirme embolia com angio-TC quando viável. Na instabilidade, a prioridade é avaliação e suporte imediatos.',
    references: ['embolism', 'coronary'],
    exercise: {
      question:
        'Por que um ventrículo direito agudamente dilatado pode reduzir o débito sistêmico mesmo com o ventrículo esquerdo ainda contraindo?',
      explanation:
        'Chega menos sangue ao lado esquerdo pelo circuito pulmonar, e o desvio septal pode restringir ainda mais o enchimento. Ambos diminuem o volume ejetado.',
    },
  },
  'left-ventricle': {
    title: 'Contração, complacência e edema pulmonar',
    mechanism:
      'Após uma lesão miocárdica, segmentos podem perder espessamento e contração, reduzindo a ejeção. Um ventrículo hipertrofiado ou pouco complacente pode ejetar uma fração normal e ainda exigir pressões altas para encher.',
    exam: 'Compare a evolução da dispneia com a presença de ortopneia, estertores, terceira bulha e sinais de perfusão. Procure precipitantes recentes como dor isquêmica, arritmia ou descontrole pressórico.',
    distinction:
      'Uma alteração segmentar favorece lesão territorial. Algumas cardiomiopatias também produzem esse padrão. Uma disfunção global exige investigar etiologia. Congestão com ejeção numericamente preservada pede evidências de pressões elevadas e avaliação de causas pulmonares.',
    investigation:
      'No eco, examine espessamento e movimento em mais de uma janela, volume, fração de ejeção, função diastólica e valvas. ECG e evolução da troponina ajudam quando se suspeita de lesão miocárdica aguda.',
    references: ['heart', 'infarction'],
  },
  'ascending-aorta': {
    title: 'Síndrome aórtica aguda na raiz e na ascendente',
    mechanism:
      'A dissecção pode criar um segundo canal na parede. A extensão à raiz pode prejudicar a coaptação aórtica, comprometer óstios coronários ou atingir o pericárdio. Assim, uma única lesão explica combinações de dor, sopro, isquemia ou choque.',
    exam: 'Estabeleça se a dor atingiu intensidade máxima logo no início. Compare pulsos e pressão entre os braços quando viável sem atrasar a avaliação. Busque sopro diastólico novo, déficit focal e má perfusão.',
    distinction:
      'A síndrome coronariana e a embolia pulmonar podem compartilhar dor, dispneia e alterações de biomarcadores. História abrupta associada a assimetria de pulsos ou déficit neurológico aumenta a suspeita aórtica. A ausência dessas diferenças tem capacidade limitada de excluir dissecção.',
    investigation:
      'Na suspeita aguda, a imagem deve caracterizar a extensão da lesão e o comprometimento dos ramos. Em paciente estável, a angio-TC costuma orientar a investigação. O eco transesofágico pode ajudar em cenários selecionados de instabilidade.',
    references: ['aorta'],
  },
  'aortic-arch': {
    title: 'Malperfusão dos ramos do arco',
    mechanism:
      'Um retalho de dissecção pode alcançar o óstio de um ramo do arco ou comprimi-lo pelo lúmen falso. A localização muda o território isquêmico, que pode incluir encéfalo, pescoço e membros superiores.',
    exam: 'Correlacione início da dor com déficit neurológico focal, alteração de pulso e discrepância pressórica. Se houver rouquidão progressiva com dilatação conhecida, a relação com o laríngeo recorrente esquerdo pode explicar o sintoma.',
    distinction:
      'Estenoses crônicas também produzem assimetria entre membros. Dor que atinge o pico de repente, sinais de isquemia em territórios diferentes e instabilidade aumentam a preocupação com uma lesão aórtica aguda.',
    investigation:
      'Na angio-TC avalie arco e ramos em reconstruções multiplanares. Descreva se o comprometimento é por extensão da lesão ao ramo ou redução da luz na origem. Compare com exames prévios quando disponíveis.',
    references: ['aorta'],
  },
  'pulmonary-trunk': {
    title: 'Embolia central e repercussão no coração direito',
    mechanism:
      'O trombo reduz a área vascular pulmonar disponível e aumenta a pós-carga do ventrículo direito. A posição na bifurcação descreve a anatomia. A gravidade também depende de como o coração, a pressão arterial e a oxigenação respondem.',
    exam: 'Pergunte sobre imobilização, cirurgia, trombose anterior e início da dispneia. Registre saturação, frequência respiratória, pulso e pressão. Síncope, deterioração respiratória ou hipotensão persistente exigem avaliação imediata.',
    distinction:
      'Dor pleurítica e taquicardia têm baixa especificidade. Associe fatores de risco, probabilidade clínica e sinais objetivos. Um trombo em sela pode coexistir com estabilidade, enquanto embolia menos central pode ser grave em quem tem pequena reserva cardiopulmonar.',
    investigation:
      'Escolha o percurso diagnóstico conforme a probabilidade clínica. Quando indicada, a angio-TC mostra defeitos de enchimento. Disfunção de VD e biomarcadores ajudam a estratificar repercussão em pacientes com embolia confirmada.',
    references: ['embolism'],
  },
  'superior-vena-cava': {
    title: 'Edema cefálico e colaterais torácicas',
    mechanism:
      'A obstrução da cava superior impede a drenagem de cabeça, pescoço e membros superiores. A velocidade de instalação e a relação com a desembocadura da ázigos influenciam o recrutamento de colaterais.',
    exam: 'Inspecione edema de face e braços, circulação venosa da parede torácica e distensão cervical. Pergunte por piora ao se inclinar ou deitar, cateteres prévios, falta de ar, ruído inspiratório e sintomas neurológicos.',
    distinction:
      'Congestão cardíaca sistêmica costuma envolver também membros inferiores e fígado. Edema com distribuição predominantemente cranial e torácica favorece obstrução superior. Diferencie trombose relacionada a cateter de compressão no mediastino.',
    investigation:
      'A TC contrastada do tórax pode localizar a obstrução e mostrar trombo, massa ou colaterais. Estridor, alterações da consciência ou piora respiratória tornam a avaliação prioritária.',
    references: ['svc', 'heart'],
  },
  'left-coronary-artery': {
    title: 'Isquemia em mais de um território esquerdo',
    mechanism:
      'Uma obstrução antes da divisão do tronco coronário esquerdo pode reduzir o fluxo tanto na descendente anterior quanto na circunflexa. A repercussão depende de dominância, colaterais, grau de obstrução e demanda miocárdica.',
    exam: 'Caracterize dor em repouso ou aos pequenos esforços e procure sinais de congestão, arritmia e hipoperfusão. Registre o ECG durante os sintomas sempre que possível e compare com registros anteriores.',
    distinction:
      'Infradesnível difuso de ST com supra em aVR sugere isquemia subendocárdica extensa. Pode aparecer em doença de tronco, doença multivascular ou desequilíbrio sistêmico entre oferta e demanda. A identificação da artéria exige correlação com a avaliação coronária.',
    investigation:
      'A combinação de ECGs seriados, troponina e estabilidade orienta o risco na síndrome coronariana. A angiografia define o local da lesão quando a avaliação invasiva é indicada.',
    references: ['coronary', 'infarction'],
  },
  'anterior-interventricular-artery': {
    title: 'Descendente anterior e território anterior/septal',
    mechanism:
      'A oclusão proximal pode interromper ramos perfurantes septais e diagonais, comprometendo o septo e áreas anteriores do ventrículo esquerdo. Um ponto distal tende a poupar ramos que já emergiram e pode concentrar a alteração no ápice.',
    exam: 'Diante de dor torácica isquêmica, procure alterações dinâmicas no ECG anterior e avalie dispneia, perfusão e arritmias. No eco, correlacione alterações de contração com os segmentos relacionados ao trajeto arterial.',
    distinction:
      'Elevação anterior do ST deve ser comparada com sintomas, traçado prévio e alterações recíprocas. Bloqueios de ramo, repolarização precoce e outras condições também alteram ST. Uma medida isolada de troponina informa lesão, cuja etiologia depende do contexto.',
    investigation:
      'ECG urgente e troponinas seriadas orientam a investigação. O padrão de infarto com supra exige fluxo de urgência sem esperar a elevação da troponina. A angiografia localiza a obstrução e os ramos envolvidos.',
    references: ['coronary', 'infarction'],
  },
  'circumflex-artery-of-heart': {
    title: 'Isquemia lateral ou posterior pouco evidente',
    mechanism:
      'A circunflexa supre porções laterais do ventrículo esquerdo e pode irrigar a parede inferior ou posterior conforme a dominância. A face posterior tem cobertura indireta no ECG padrão.',
    exam: 'Em dor persistente, observe derivações laterais e procure depressão de ST em V1–V3 que possa ser imagem recíproca de lesão posterior. Compare a dinâmica e examine a função do ventrículo esquerdo.',
    distinction:
      'Um ECG inicial com alterações discretas tem sensibilidade limitada para oclusão da circunflexa. A depressão anterior do ST também admite isquemia subendocárdica e outras causas. Derivações posteriores ajudam a discriminar quando o padrão clínico é compatível.',
    investigation:
      'Repita o ECG, considere V7–V9 em suspeita posterior e integre troponina e ecocardiograma. Confirme a dominância e a artéria culpada na avaliação coronária quando indicada.',
    references: ['coronary'],
  },
  'right-coronary-artery': {
    title: 'Infarto inferior, bradicardia e ventrículo direito',
    mechanism:
      'Uma obstrução proximal pode comprometer ramos para o ventrículo direito e, conforme a anatomia, a perfusão do nó atrioventricular. Isso explica por que quadros inferiores podem combinar dor isquêmica, bradicardia e queda do débito.',
    exam: 'Compare as derivações inferiores, obtenha derivações direitas quando há suspeita de VD e acompanhe frequência, condução atrioventricular e perfusão. Jugulares elevadas com pulmões pouco congestos tornam a avaliação do VD especialmente importante.',
    distinction:
      'A circunflexa também pode ser responsável por infarto inferior. Combine as derivações e alterações recíprocas com a dominância e a avaliação coronária para identificar o vaso.',
    investigation:
      'Aplique o fluxo de avaliação da síndrome coronariana e monitorize o ritmo. A ecocardiografia caracteriza a função de ambos os ventrículos, e a angiografia confirma a anatomia culpada.',
    references: ['coronary'],
  },
  'coronary-sinus': {
    title: 'Via venosa posterior e ressincronização',
    mechanism:
      'O seio coronário chega ao átrio direito por uma abertura própria. Um eletrodo de ressincronização pode avançar do átrio pelo seio e suas tributárias até uma posição venosa sobre a parede lateral do ventrículo esquerdo.',
    exam: 'Em paciente com dispositivo e piora de dispneia, palpitações ou perda de tolerância ao esforço, procure sinais de congestão e compare ECG atual e anterior. O histórico do procedimento ajuda a formular a hipótese de perda de captura.',
    distinction:
      'O trajeto venoso de um eletrodo esquerdo pode parecer posterior na imagem. A anatomia do seio ajuda a distingui-lo de um cabo ventricular direito e de uma alteração de posição.',
    investigation:
      'Combine análise radiográfica em mais de uma projeção e interrogação do dispositivo. A interpretação elétrica depende do ritmo, captura e programação, além do trajeto do cabo.',
    references: ['heart'],
  },
  'posterior-leaflet-of-left-atrioventricular-valve': {
    title: 'Falha de coaptação e regurgitação mitral',
    mechanism:
      'Prolapso e ruptura de cordas podem impedir o fechamento na sístole. Quando o refluxo surge de forma aguda, um átrio ainda pequeno recebe grande volume sob pressão e pode produzir edema pulmonar antes que as câmaras aumentem.',
    exam: 'Ausculta apical e caracterização da relação do sopro com a sístole orientam o exame. Após infarto, dispneia abrupta com hipotensão é preocupante mesmo se o sopro for curto ou pouco intenso.',
    distinction:
      'Prolapso de folheto, ruptura do aparelho subvalvar e tração dos folhetos por remodelamento ventricular causam refluxo por mecanismos diferentes. O tamanho do jato isolado pode subestimar um jato excêntrico junto à parede.',
    investigation:
      'No Doppler, integre mecanismo, dimensões das câmaras e múltiplas medidas de gravidade. O eco transesofágico pode esclarecer o segmento e o aparelho subvalvar quando a janela transtorácica é insuficiente.',
    references: ['valves', 'coronary'],
  },
  cerebrum: {
    title: 'Do conjunto de sinais ao hemisfério',
    mechanism:
      'O córtex integra linguagem, atenção, visão e comando voluntário. Uma lesão hemisférica pode provocar sinais corticais e déficit contralateral. As fibras motoras do corpo cruzam em sua maioria no bulbo caudal. Um déficit corporal com par craniano ipsilateral, por sua vez, faz procurar o tronco.',
    exam: 'Determine o último momento em que a pessoa estava bem. Compare força de face, braço e perna, campos visuais e sensibilidade. Teste nomeação, compreensão e repetição para diferenciar alterações de linguagem de alterações na articulação da fala. Use estímulos bilaterais simultâneos para pesquisar extinção de um lado.',
    distinction:
      'Uma lesão cortical dominante pode produzir afasia. Negligência espacial favorece comprometimento de redes atencionais, muitas vezes à direita. Uma hemiparesia proporcional sem sinais corticais levanta lesão profunda. Padrão e lateralidade orientam a topografia. A causa depende da evolução e dos exames.',
    investigation:
      'Déficit focal súbito exige avaliação imediata. A glicemia capilar identifica um imitador tratável. A TC inicial pesquisa hemorragia, e imagem vascular ou RM é acrescentada conforme a suspeita e o protocolo. A TC inicial pode estar sem alterações isquêmicas evidentes.',
    references: ['neuro', 'motor', 'stroke'],
    exercise: {
      question:
        'Uma mulher deixa de nomear objetos subitamente. Ainda compreende comandos simples e tem fraqueza mais intensa na face e no braço direitos. Onde começar a procurar?',
      explanation:
        'O déficit de linguagem orienta para o hemisfério dominante, usualmente esquerdo. A combinação com fraqueza de face e braço direitos põe a convexidade frontolateral esquerda, em território habitual da cerebral média, entre os primeiros locais a investigar.',
    },
  },
  'middle-frontal-gyrus': {
    title: 'Atenção, organização e controle do olhar',
    mechanism:
      'A convexidade frontal participa de circuitos de atenção e planejamento. Regiões posteriores do frontal médio e suas conexões também contribuem para a orientação voluntária do olhar. O déficit resulta da região e da rede atingidas.',
    exam: 'Observe iniciativa, capacidade de manter uma regra e alternar tarefas. Compare movimentos oculares voluntários para os dois lados. Verifique linguagem, nível de alerta, audição e visão antes de atribuir erro de desempenho à função executiva.',
    distinction:
      'Uma confusão flutuante com desatenção generalizada pede investigação sistêmica e de delirium. Um déficit lateralizado, associado a alteração de olhar ou de força, aumenta a probabilidade de disfunção focal.',
    investigation:
      'Relacione o início e a distribuição dos achados com lesão frontal e conexões subcorticais na imagem. Se houver déficit focal de instalação abrupta, siga o fluxo de AVC.',
    references: ['cognition', 'stroke'],
  },
  'precentral-gyrus': {
    title: 'Paresia cortical com distribuição somatotópica',
    mechanism:
      'Na superfície lateral do giro pré-central, regiões motoras representam principalmente face e membro superior, enquanto a perna ocupa áreas mais mediais. A lesão acima da decussação piramidal tende a produzir déficit corporal contralateral.',
    exam: 'Compare a simetria do sorriso, a pronação ou descida dos braços estendidos e a força segmentar. Registre tônus, reflexos e resposta plantar. Hiperreflexia e espasticidade podem aparecer com a evolução, embora na fase aguda o tônus possa estar baixo.',
    distinction:
      'Uma fraqueza aparentemente restrita à mão pode simular neuropatia. Padrão que abrange músculos de nervos diferentes, início súbito ou sinais corticais associados favorecem lesão central. Queda do punho com déficit sensitivo radial focal favorece uma lesão periférica.',
    investigation:
      'No déficit súbito, registre o horário e providencie avaliação de AVC. O exame de imagem deve distinguir convexidade cortical de cápsula interna, tronco e outras topografias.',
    references: ['motor', 'stroke'],
    exercise: {
      question:
        'Uma pessoa perde subitamente força na mão esquerda. A extensão dos dedos e a oposição do polegar estão comprometidas, com sensibilidade preservada. Que achado impede uma conclusão automática de neuropatia radial?',
      explanation:
        'A fraqueza atravessa territórios de nervos diferentes. O início súbito e a combinação de déficits justificam pesquisar uma causa central, inclusive o córtex motor da mão.',
    },
  },
  'postcentral-gyrus': {
    title: 'Percepção do estímulo e reconhecimento pelo tato',
    mechanism:
      'A informação somática chega ao córtex pós-central após retransmissão talâmica. Reconhecer a forma de um objeto ou a direção de um traço exige informação primária suficiente e integração cortical.',
    exam: 'Com os olhos fechados, compare toque, estímulo agudo e rombo, vibração e posição. Após verificar as modalidades primárias e a compreensão do comando, teste reconhecimento de objetos familiares e extinção com estímulos simultâneos.',
    distinction:
      'Uma perda restrita a nervo ou dermátomo aponta para outra topografia. Se a percepção básica está preservada e a mão contralateral perde reconhecimento tátil, aumenta a suspeita de disfunção parietal.',
    investigation:
      'A imagem orientada pelo exame diferencia lesão cortical, talâmica e subcortical. Déficit recente com instalação súbita exige avaliação urgente mesmo quando sensitivo isolado.',
    references: ['motor', 'stroke'],
  },
  'supramarginal-gyrus': {
    title: 'Integração fonológica, praxia gestual e atenção',
    mechanism:
      'O giro supramarginal faz parte de redes parietais inferiores. No hemisfério dominante, conexões temporofrontais contribuem para repetição e processamento fonológico. Uma lesão pode comprometer essa comunicação sem eliminar toda compreensão.',
    exam: 'Teste repetição de palavras e frases, nomeação e compreensão separadamente. Peça um gesto aprendido e compare com a execução espontânea, considerando força e sensibilidade. Pesquise também extinção e assimetria de atenção.',
    distinction:
      'Na disartria a execução da fala falha mesmo com linguagem estruturalmente preservada. Repetição desproporcionalmente comprometida sugere uma disfunção da rede de linguagem, com mais de uma topografia possível.',
    investigation:
      'Correlacione a avaliação de linguagem com os territórios parietal inferior, perissilviano e suas conexões na imagem. Mudança abrupta da comunicação deve ser tratada como sintoma focal até esclarecimento.',
    references: ['cognition', 'stroke'],
  },
  'middle-temporal-gyrus': {
    title: 'Compreensão, significado e nomeação',
    mechanism:
      'A região temporal lateral dominante contribui para acessar o significado das palavras. Sua integração com áreas auditivas e conexões frontais permite reconhecer o que foi ouvido, selecionar uma palavra e formular a resposta.',
    exam: 'Comece confirmando que a pessoa ouviu a pergunta. Compare nomeação de objetos, compreensão de comandos por fala e escrita, repetição e conteúdo da conversa. Observe parafasias e se o paciente percebe os erros.',
    distinction:
      'A perda auditiva reduz a entrada sonora. Um distúrbio de linguagem pode aparecer também em leitura ou nomeação visual. Alteração do nível de atenção tende a afetar tarefas de vários domínios.',
    investigation:
      'A distribuição dos déficits orienta a leitura de córtex temporal e conexões subcorticais. Uma alteração súbita pede investigação vascular. Evolução progressiva amplia a investigação para processos estruturais e degenerativos.',
    references: ['cognition', 'stroke'],
  },
  'occipital-pole': {
    title: 'Do campo visual à via retrogeniculada',
    mechanism:
      'Cada córtex occipital processa informação do hemicampo visual oposto dos dois olhos. O polo occipital contribui especialmente para o campo central. A hemianopsia homônima aponta para uma estrutura posterior ao quiasma.',
    exam: 'Teste campos por confrontação, com um olho coberto por vez e fixação central. Registre quadrantes e lado do hemicampo ausente. Examine acuidade e pupilas para buscar evidências adicionais de envolvimento aferente.',
    distinction:
      'Perda com o mesmo lado espacial em ambos os olhos é homônima. Perda apenas de um olho desloca a investigação para retina ou nervo óptico. Extinção visual à estimulação simultânea pode refletir disfunção atencional associada.',
    investigation:
      'Hemianopsia súbita pede avaliação urgente de AVC. A imagem diferencia lesão do córtex occipital em território da cerebral posterior de lesão da radiação óptica ou do trato.',
    references: ['cranial', 'stroke'],
    exercise: {
      question:
        'À confrontação, um paciente percebe apenas a metade esquerda do espaço, tanto com o olho direito quanto com o esquerdo. O déficit se relaciona a qual lado da via?',
      explanation:
        'A perda do hemicampo direito nos dois olhos é homônima. A via visual esquerda, depois do quiasma, recebe esse hemicampo. A instalação abrupta faz investigar AVC, entre outras causas.',
    },
  },
  hippocampus: {
    title: 'Memória episódica e confusão com déficit de atenção',
    mechanism:
      'O hipocampo medial temporal participa da consolidação de memórias novas junto do córtex entorrinal e outras redes. Lesões bilaterais podem prejudicar a retenção mesmo quando a pessoa continua conversando e usando conhecimentos antigos.',
    exam: 'Garanta que ouviu e registrou os itens inicialmente. Após interferência breve, compare evocação espontânea, com pistas e reconhecimento. Pergunte a um acompanhante sobre a evolução temporal e sobre episódios de desconexão, automatismos ou perguntas repetitivas.',
    distinction:
      'Falha no registro por desatenção prejudica todo o teste. O registro adequado seguido de esquecimento rápido sugere disfunção de memória. A evolução, os sinais associados e os exames ajudam a diferenciar epilepsia, causa vascular, encefalite e processo degenerativo.',
    investigation:
      'Em casos selecionados, RM com cortes coronais do temporal medial e EEG investigam alterações estruturais e epilepsia. Alteração aguda com febre, crises ou sinais focais exige avaliação urgente.',
    references: ['cognition', 'neuro'],
  },
  thalamus: {
    title: 'Déficit sensitivo hemisférico e piora da vigília',
    mechanism:
      'O VPL recebe grande parte das vias somáticas do corpo e o VPM, da face. A vizinhança de outros núcleos e da cápsula interna explica quadros que somam perda sensitiva, alterações de vigília ou fraqueza.',
    exam: 'Compare face, tronco e membros nas diferentes modalidades. Procure desvio ocular, assimetria de força, alteração de consciência e sinais corticais. Registre se a perda atinge um hemicorpo ou se segue distribuição segmentar.',
    distinction:
      'Uma perda sensitiva de face, braço e perna do mesmo lado pode ser talâmica. Limites em faixa, dissociação das modalidades no tronco ou combinação cruzada de face e corpo sugerem outros níveis.',
    investigation:
      'Na apresentação aguda, correlacione com imagem encefálica. Na RM axial, examine o tálamo entre terceiro ventrículo e cápsula interna e confira se o achado se estende às estruturas vizinhas.',
    references: ['motor', 'neuro', 'stroke'],
  },
  'caudate-nucleus': {
    title: 'Movimento involuntário e circuitos frontoestriatais',
    mechanism:
      'O caudado participa do estriado e de circuitos que selecionam ações. Mudanças nesses circuitos podem alterar movimento, iniciativa e comportamento antes de surgir fraqueza segmentar.',
    exam: 'Observe movimentos espontâneos, marcha, manutenção de postura e velocidade de movimentos alternados. Procure movimentos não rítmicos, impulsividade e apatia. Compare com tônus, força e padrão reflexo.',
    distinction:
      'Coreia é irregular e variável no tempo. Tremor é mais rítmico. Lentificação com rigidez sugere outro padrão. Medicamentos e causas metabólicas ou vasculares entram no diferencial conforme a velocidade de instalação.',
    investigation:
      'Revise medicação e evolução. Se a manifestação for focal e súbita, investigue lesão aguda. Na imagem, identifique o caudado junto ao ventrículo lateral e avalie também putâmen, cápsula e regiões frontais.',
    references: ['motor', 'gait', 'cognition'],
  },
  'corpus-callosum': {
    title: 'Quando a transferência entre hemisférios falha',
    mechanism:
      'As fibras do corpo caloso permitem transferir informação de um hemisfério para o outro. Quando essa comunicação é interrompida, uma tarefa pode falhar só sob determinada condição de apresentação do estímulo.',
    exam: 'Compare cada mão com olhos fechados e use objetos familiares. Verifique se o paciente consegue reconhecer pelo tato, apontar para o objeto correspondente e nomeá-lo. Teste compreensão, força e sensibilidade em ambos os lados.',
    distinction:
      'Reconhecer um objeto pelo uso e falhar em nomeá-lo só com uma das mãos é diferente de perder a própria percepção tátil. Uma afasia ampla afeta a nomeação em outras modalidades também.',
    investigation:
      'A RM sagital delimita o segmento do feixe. Avalie se o comprometimento se estende ao córtex adjacente ou a outras vias, especialmente após trauma ou em suspeita de lesão vascular, inflamatória ou tumoral.',
    references: ['cognition', 'neuro'],
  },
  pons: {
    title: 'Diplopia ou paresia facial com déficit corporal cruzado',
    mechanism:
      'Vias longas passam muito perto dos núcleos e fascículos dos pares VI e VII. Uma lesão pontina pode combinar alteração ocular ou de mímica do mesmo lado com déficit motor ou sensitivo corporal do lado oposto.',
    exam: 'Compare a abdução de cada olho e o olhar conjugado. Observe oclusão palpebral, testa e sorriso. Teste força, reflexos e modalidades sensitivas dos membros. Perceba se pares cranianos e corpo seguem o mesmo lado.',
    distinction:
      'Uma paralisia facial periférica isolada envolve a mímica, inclusive a testa. Associá-la a falha de abdução ou a déficit corporal contralateral desloca a hipótese para o tronco encefálico.',
    investigation:
      'Sinais cruzados de instalação súbita são compatíveis com lesão da circulação posterior. Priorize avaliação de AVC e imagem vascular quando indicada. Na RM axial, relacione a lesão ao quarto ventrículo e à base pontina.',
    references: ['cranial', 'motor', 'stroke'],
    exercise: {
      question:
        'Um paciente apresenta paresia facial direita de toda a hemiface e paresia do braço e da perna esquerdos. Em que lado e nível as duas vias podem ser afetadas juntas?',
      explanation:
        'A combinação sugere lesão na ponte direita, onde o fascículo facial e a via corticoespinal ainda acima da decussação ficam próximos. A evolução aguda exige avaliação urgente.',
    },
  },
  midbrain: {
    title: 'Oculomotor e via piramidal no mesmo corte',
    mechanism:
      'Fascículos do III par atravessam o mesencéfalo perto das vias descendentes. Uma lesão ventral pode combinar paresia oculomotora ipsilateral com déficit motor contralateral. Lesões mais dorsais podem afetar o olhar vertical e o circuito pupilar.',
    exam: 'Documente ptose, posição dos olhos em repouso, adução, elevação, depressão e reflexo luminoso. Depois procure paresia ou incoordenação dos membros e alterações no olhar conjugado.',
    distinction:
      'Um III par doloroso isolado também pode ocorrer por compressão fora do tronco. Sinais corporais cruzados favorecem mesencéfalo. Uma pupila poupada tem valor limitado, sobretudo em paresias parciais ou em evolução.',
    investigation:
      'Oculomotricidade agudamente alterada com cefaleia, anisocoria ou sinais focais requer avaliação urgente. TC e angiografia ou RM são escolhidas conforme suspeita de hemorragia, aneurisma ou lesão de tronco.',
    references: ['cranial', 'oculomotor', 'stroke'],
  },
  'medulla-oblongata': {
    title: 'Sensibilidade cruzada e disfagia no bulbo lateral',
    mechanism:
      'Uma lesão lateral pode atingir o núcleo ambíguo, a via trigeminal espinal e o trato anterolateral. A proximidade desses circuitos explica a combinação de dificuldade para engolir, perda de dor e temperatura na face ipsilateral e no corpo contralateral.',
    exam: 'Avalie voz, deglutição, elevação do palato, nistagmo e coordenação. Compare dor e temperatura separadamente em face e corpo. Pesquise ptose discreta e miose de um lado. Em suspeita de disfagia aguda, proteja a via aérea e aguarde avaliação de deglutição antes da via oral.',
    distinction:
      'Um padrão medial pode combinar paresia da língua ipsilateral, fraqueza contralateral e perda contralateral de vibração. O padrão lateral costuma ter mais sinais vestibulares e faríngeos. Lesões reais podem poupar parte desses sinais.',
    investigation:
      'Quadro abrupto exige investigação de AVC de circulação posterior, considerando artéria vertebral e seus ramos. A RM e a avaliação vascular ajudam a localizar lesões pontuais e a causa.',
    references: ['cranial', 'motor', 'stroke'],
    exercise: {
      question:
        'Há disfonia aguda, redução de dor e temperatura à esquerda da face e à direita do corpo. Qual estrutura reúne esses achados?',
      explanation:
        'O bulbo lateral esquerdo reúne a via trigeminal espinal da face esquerda, a via anterolateral já cruzada do corpo direito e circuitos faríngeos e laríngeos. O início abrupto favorece uma causa vascular.',
    },
  },
  'superior-semilunar-lobule': {
    title: 'Dismetria cerebelar, fraqueza e perda sensitiva',
    mechanism:
      'O hemisfério cerebelar calibra amplitude e tempo dos movimentos do membro ipsilateral. Uma trajetória irregular pode surgir por falha de coordenação mesmo que a força seja suficiente para completar a tarefa.',
    exam: 'Compare dedo–nariz, movimentos alternados e calcanhar sobre a tíbia. Observe erros de amplitude e tremor que aumenta perto do alvo. Avalie primeiro força, visão e percepção da posição articular para interpretar o desempenho.',
    distinction:
      'A instabilidade cerebelar pode aparecer já com olhos abertos. Piora importante somente ao fechar os olhos, se havia boa estabilidade com olhos abertos, sugere dependência visual por alteração proprioceptiva ou vestibular.',
    investigation:
      'Ataxia nova e intensa, sobretudo com cefaleia, disartria ou outros sinais focais, requer avaliação urgente de fossa posterior. Uma TC inicial pouco expressiva pode demandar investigação adicional conforme o contexto.',
    references: ['gait', 'stroke'],
  },
  'lateral-ventricle': {
    title: 'Dilatação focal e circulação do líquor',
    mechanism:
      'A obstrução perto de um forame interventricular pode expandir o ventrículo lateral a montante. Dilatação bilateral também ocorre em obstruções distais, em distúrbios de absorção ou quando se perde volume de parênquima.',
    exam: 'Investigue velocidade de instalação, cefaleia, vômitos, padrão da marcha e nível de consciência. Procure assimetria focal na avaliação neurológica e compare com avaliações anteriores.',
    distinction:
      'Ventrículos e sulcos alargados em conjunto podem refletir perda de volume. Dilatação ventricular desproporcional com apagamento de sulcos ou sinal periventricular compatível com passagem transependimária favorece distúrbio ativo de circulação.',
    investigation:
      'Compare sequelas, cirurgias e imagens anteriores. Siga os cornos e forames nas três projeções. Rebaixamento da consciência ou piora rápida com dilatação recente exige avaliação urgente.',
    references: ['csf', 'neuro'],
  },
  'third-ventricle': {
    title: 'Localização pelo padrão dos ventrículos dilatados',
    mechanism:
      'O líquor dos ventrículos laterais converge no terceiro ventrículo e sai pelo aqueduto. Uma obstrução no aqueduto tende a dilatar os ventrículos laterais e o terceiro, poupando o quarto nessa etapa.',
    exam: 'Pergunte por cefaleia progressiva ou episódica, vômitos e alterações visuais. Examine nível de consciência e olhar vertical, especialmente quando se suspeita de alteração próxima ao mesencéfalo dorsal.',
    distinction:
      'A dilatação assimétrica de um único ventrículo lateral favorece um obstáculo mais proximal em um forame. A comparação de todos os ventrículos é mais informativa que uma medida isolada do terceiro.',
    investigation:
      'Use o plano sagital mediano para seguir as vias do líquor. Avalie região pineal e aqueduto conforme o padrão. Piora rápida com suspeita de hidrocefalia obstrutiva exige avaliação especializada urgente.',
    references: ['csf', 'neuro'],
    exercise: {
      question:
        'A RM mostra aumento dos dois ventrículos laterais e do terceiro, enquanto o quarto mantém calibre habitual. Onde investigar primeiro a passagem do líquor?',
      explanation:
        'No aqueduto cerebral, que liga o terceiro ao quarto. O padrão descreve uma topografia provável e deve ser confirmado nas imagens que atravessam o ponto de transição.',
    },
  },
  'fourth-ventricle': {
    title: 'Fossa posterior, compressão e hidrocefalia',
    mechanism:
      'Processos cerebelares podem comprimir o quarto ventrículo entre o cerebelo e o tronco. Uma obstrução das saídas do quarto também pode dilatar as cavidades acima. O contorno e o calibre orientam a localização do bloqueio.',
    exam: 'Associe cefaleia e vômitos a marcha, coordenação, movimentos oculares e consciência. Instalação rápida com sonolência ou déficit de tronco é um sinal de urgência.',
    distinction:
      'Um quarto ventrículo deslocado ou achatado sugere compressão por fora. Uma cavidade expandida com dilatação a montante pode indicar problema no próprio ventrículo ou em sua saída. Examine também cisternas e região do aqueduto.',
    investigation:
      'Na urgência, a TC pode mostrar hidrocefalia e efeito de massa. A RM descreve a relação da lesão com as paredes do ventrículo, os pedúnculos e as cisternas.',
    references: ['csf', 'neuro'],
  },
  'olfactory-nerve-i': {
    name: 'Nervo olfatório (I)',
    title: 'Perda de olfato por obstrução ou lesão neural',
    mechanism:
      'As fibras olfatórias atravessam a lâmina crivosa. Trauma pode lesá-las nessa interface. Congestão nasal pode impedir que os odorantes alcancem os receptores, produzindo queixa semelhante por outro mecanismo.',
    exam: 'Pergunte pelo início, trauma, sintomas nasais e infecção recente. Teste uma narina por vez, com odor familiar e não irritante. Registre se detecta o odor e se consegue identificá-lo.',
    distinction:
      'Amônia e outras substâncias irritantes ativam o trigêmeo e confundem o teste. Perda bilateral com obstrução nasal orienta avaliação local. Perda unilateral persistente sem obstrução sugere investigar o trajeto olfatório.',
    investigation:
      'O exame nasal orienta quando avaliar rinossinusite. Após trauma com suspeita de fratura de base ou rinorreia liquórica, a prioridade é avaliação de urgência e imagem conforme os demais achados.',
    references: ['cranial'],
  },
  'optic-nerve-ii': {
    name: 'Nervo óptico (II)',
    title: 'Perda visual monocular e defeito pupilar aferente',
    mechanism:
      'Antes do quiasma, cada nervo conduz informação de um olho. Uma assimetria aferente importante reduz a resposta pupilar à luz daquele lado. Deslocar a lanterna do olho melhor para o afetado pode fazer as pupilas dilatarem relativamente.',
    exam: 'Meça acuidade de cada olho, com correção habitual. Compare campos, percepção de cores e resposta no teste da lanterna alternante. Examine retina e disco óptico quando possível. Pergunte sobre dor ao mover o olho e sobre a velocidade da perda.',
    distinction:
      'Retina extensa e nervo óptico podem produzir defeito aferente. Dor aos movimentos com desaturação de cor favorece neurite óptica, sem confirmá-la. Hemianopsia homônima aponta para outra parte da via.',
    investigation:
      'Perda visual súbita, mesmo que transitória, requer avaliação urgente. O trabalho diagnóstico depende do fundo de olho, do contexto vascular e, quando indicada, de RM de órbitas com protocolo apropriado.',
    references: ['cranial', 'stroke'],
  },
  'optic-chiasm': {
    name: 'Quiasma óptico',
    title: 'Perda de campos temporais e região selar',
    mechanism:
      'As fibras das hemirretinas nasais cruzam no quiasma e levam informação dos campos temporais. Uma massa que comprime a região quiasmática pode começar afetando apenas partes desses campos.',
    exam: 'Teste campos de cada olho por confrontação e pergunte por colisões laterais, cefaleia e sintomas endócrinos. Registre acuidade, cor e pupilas. Use campimetria formal para delimitar perda sutil.',
    distinction:
      'Perda bitemporal favorece quiasma, enquanto hemianopsia homônima localiza depois dele. Alterações de retina e qualidade de fixação podem simular defeitos na confrontação.',
    investigation:
      'Defeito bitemporal progressivo direciona a RM para a sela e região suprasselar. Cefaleia súbita com perda visual ou diplopia em contexto selar exige avaliação urgente, incluindo possibilidade de apoplexia hipofisária.',
    references: ['cranial', 'neuro'],
    exercise: {
      question:
        'Uma pessoa esbarra em objetos dos dois lados. O teste mostra que o olho direito perde o campo temporal direito e o esquerdo, o temporal esquerdo. Qual cruzamento deve ser examinado?',
      explanation:
        'O cruzamento das fibras nasais no quiasma explica a perda dos campos temporais dos dois olhos. A sela e a região suprasselar merecem correlação com as imagens.',
    },
  },
  'optic-tract': {
    name: 'Trato óptico',
    title: 'O primeiro segmento após o cruzamento',
    mechanism:
      'Depois do quiasma, cada trato reúne fibras de ambos os olhos para representar o hemicampo oposto. A lesão de um trato pode provocar hemianopsia homônima, muitas vezes assimétrica entre os dois olhos.',
    exam: 'Compare campos monoculares com fixação central e registre o mesmo lado do espaço para ambos. Combine a distribuição do campo com acuidade e resposta pupilar para estimar o segmento acometido.',
    distinction:
      'Trato, radiações e córtex podem produzir defeito homônimo. Sinais focais associados e a anatomia em imagem orientam o nível. O quiasma costuma produzir padrão heterônimo.',
    investigation:
      'Se o déficit for súbito, priorize avaliação de AVC. Na investigação estrutural, acompanhe as vias do quiasma ao corpo geniculado e ao córtex em mais de um plano.',
    references: ['cranial', 'stroke'],
  },
  'oculomotor-nerve-iii': {
    name: 'Nervo oculomotor (III)',
    title: 'Ptose, limitação ocular e pupila em risco',
    mechanism:
      'O III inerva o levantador da pálpebra e a maior parte dos músculos extraoculares. A disfunção também pode atingir fibras parassimpáticas, deixando a pupila maior e menos reativa. O equilíbrio com IV e VI pode desviar o olho para fora e para baixo.',
    exam: 'Confirme se a diplopia desaparece ao cobrir qualquer olho. Registre posição primária, adução, elevação, depressão, ptose e tamanhos pupilares em claro e escuro. Procure cefaleia, dor e déficits de outros pares.',
    distinction:
      'Ptose flutuante sem alteração pupilar pode sugerir miastenia. Déficits de outros pares sugerem localização diferente de uma mononeuropatia isolada. A pupila preservada tem valor limitado para excluir aneurisma, especialmente em paresia parcial.',
    investigation:
      'Paresia adquirida aguda pede avaliação urgente. Cefaleia intensa ou pupila comprometida reforçam a necessidade de excluir expansão aneurismática, inclusive na comunicante posterior, por imagem vascular adequada.',
    references: ['cranial', 'oculomotor'],
    exercise: {
      question:
        'Ptose recente, olho desviado para fora e para baixo e pupila maior do mesmo lado formam que padrão? Qual causa exige exclusão urgente?',
      explanation:
        'O conjunto localiza o III par com envolvimento pupilar. Uma compressão por aneurisma, especialmente na comunicante posterior, precisa ser excluída com urgência.',
    },
  },
  'trochlear-nerve-iv': {
    name: 'Nervo troclear (IV)',
    title: 'Diplopia vertical ao ler ou descer escadas',
    mechanism:
      'O oblíquo superior contribui para deprimir o olho em adução e fazer intorção. A falha desse músculo pode separar as imagens no plano vertical e torcional, com compensação por inclinação da cabeça.',
    exam: 'Pergunte quando as imagens se separam mais e se cobrir um olho resolve. Compare alinhamento no olhar lateral, para baixo e com inclinação cefálica, respeitando o conforto. Observe postura compensatória antiga em fotos, se houver.',
    distinction:
      'Uma diferença vertical também pode resultar de desalinhamento vestibular central, doença orbitária ou junção neuromuscular. A manobra de inclinação contribui para o raciocínio e tem limitações se houver outros pares comprometidos.',
    investigation:
      'Registre o padrão e o tempo de início. Trauma, cefaleia aguda, envolvimento de outros pares ou sinais focais associados mudam a prioridade e a investigação de órbita e tronco.',
    references: ['cranial', 'oculomotor'],
  },
  'trigeminal-nerve-v': {
    name: 'Nervo trigêmeo (V)',
    title: 'Sensibilidade da face, córnea e mastigação',
    mechanism:
      'V1, V2 e V3 conduzem territórios sensitivos diferentes. A aferência do reflexo corneano passa por V1, e o fechamento palpebral depende do VII. V3 também carrega as fibras motoras da mastigação.',
    exam: 'Compare sensibilidade em fronte, bochecha e mandíbula. Observe volume de masseteres e desvio ao abrir a boca. Quando indicado e sob supervisão, interprete o reflexo corneano separando o lado estimulado de qual olho piscou.',
    distinction:
      'Se nenhum olho pisca ao estimular apenas uma córnea e ambos piscam ao estimular a outra, suspeite da aferência do lado estimulado. Se sempre falha o fechamento do mesmo olho, avalie a eferência facial.',
    investigation:
      'Perda sensitiva objetiva, fraqueza mastigatória ou outros pares comprometidos orientam estudo de tronco, base do crânio ou trajeto periférico conforme o território.',
    references: ['cranial'],
  },
  'abducens-nerve-vi': {
    name: 'Nervo abducente (VI)',
    title: 'Falha de abdução ou paralisia conjugada do olhar',
    mechanism:
      'O VI periférico ativa o reto lateral. Seu núcleo pontino também se comunica com o III contralateral para coordenar o olhar horizontal dos dois olhos, de modo que lesão nuclear pode abolir o olhar conjugado para o lado da lesão.',
    exam: 'Confirme que a diplopia é binocular. Compare abdução de cada olho ao seguir o alvo. Diferencie limitação de abdução isolada de bloqueio do olhar conjugado para um lado.',
    distinction:
      'Diplopia horizontal que aumenta ao olhar para o lado acometido favorece falha do reto lateral. Cefaleia e papiledema levantam hipertensão intracraniana, que pode afetar o VI longe do local causal.',
    investigation:
      'Paralisia com déficit facial, sinais de vias longas ou ataxia exige avaliação de tronco. Em casos com cefaleia, avalie também fundo de olho e outros sinais de pressão elevada.',
    references: ['cranial', 'stroke'],
  },
  'facial-nerve-vii': {
    name: 'Nervo facial (VII)',
    title: 'Padrão da hemiface e localização da paresia',
    mechanism:
      'A musculatura superior facial recebe projeção corticobulbar bilateral. Lesão supranuclear unilateral frequentemente afeta mais a metade inferior contralateral. Lesão do núcleo, fascículo ou nervo pode comprometer toda a hemiface ipsilateral.',
    exam: 'Compare rugas da testa, força de fechamento dos olhos e sorriso. Pesquise alteração de paladar, hiperacusia, otalgia e vesículas se houver suspeita periférica. Avalie braços, fala, olhar e campos visuais quando o início é abrupto.',
    distinction:
      'Interprete a distribuição da paresia facial junto com os sinais de fala, olhar e força. A mobilidade da testa isoladamente tem baixo valor de exclusão. Paresia de toda a face com déficit corporal cruzado favorece lesão pontina. Isolamento da mímica sem outro déficit pode orientar para o trajeto periférico.',
    investigation:
      'Paresia aguda com dificuldade de fala ou fraqueza de membro entra no fluxo de AVC. Se o fechamento palpebral for incompleto, avalie a proteção da córnea, independentemente da etiologia.',
    references: ['cranial', 'stroke'],
    exercise: {
      question:
        'O sorriso está assimétrico, a testa tem movimento preservado e o braço do mesmo lado da boca enfraquecida cai na manobra deficitária. Qual nível se torna mais provável?',
      explanation:
        'A combinação favorece comprometimento supranuclear no hemisfério oposto. A fraqueza do braço indica o envolvimento de vias motoras além do VII.',
    },
  },
  'vestibulocochlear-nerve-viii': {
    name: 'Nervo vestibulococlear (VIII)',
    title: 'Perda auditiva e vertigem são perguntas distintas',
    mechanism:
      'O componente coclear conduz audição e o vestibular informa aceleração e posição da cabeça. Uma lesão no meato acústico interno ou no ângulo pontocerebelar pode combinar sintomas auditivos e vestibulares.',
    exam: 'Compare a audição de cada ouvido. No Weber, registre para qual lado o som lateraliza. No Rinne, compare condução aérea e óssea. Na vertigem, descreva tempo, gatilhos, nistagmo, equilíbrio e sinais neurológicos focais.',
    distinction:
      'Weber para o ouvido sintomático com condução óssea mais longa sugere perda condutiva. Weber para o lado melhor com condução aérea predominante pode favorecer perda neurossensorial. O diapasão tem limitações e a audiometria define melhor o padrão.',
    investigation:
      'Perda neurossensorial súbita requer avaliação otorrinolaringológica urgente. Vertigem contínua com sinais focais ou grande incapacidade de marcha levanta causa central e merece avaliação imediata.',
    references: ['cranial', 'gait', 'stroke', 'hearing'],
  },
  'glossopharyngeal-nerve-ix': {
    name: 'Nervo glossofaríngeo (IX)',
    title: 'Aferência faríngea e risco na deglutição',
    mechanism:
      'O IX carrega sensibilidade da orofaringe e contribui para a aferência do reflexo faríngeo. A resposta motora depende principalmente do X. Lesões bulbares ou na base do crânio podem comprometer os dois pares.',
    exam: 'Pergunte por engasgos, dificuldade para iniciar a deglutição e dor desencadeada ao engolir. Observe palato e voz e avalie o desempenho em conjunto com outros pares baixos.',
    distinction:
      'Reflexo faríngeo ausente pode ocorrer sem disfagia. Disfonia, tosse fraca e dificuldade de lidar com secreções aumentam a preocupação com disfunção bulbar, mesmo quando o reflexo está presente.',
    investigation:
      'Encaminhe para avaliação dirigida da deglutição quando houver sinais de aspiração. Se a combinação de pares baixos surgiu de repente, investigue lesão de tronco com urgência.',
    references: ['cranial', 'stroke'],
  },
  'vagus-nerve-x': {
    name: 'Nervo vago (X)',
    title: 'Disfonia, palato e tosse pouco eficaz',
    mechanism:
      'Ramos do vago comandam parte do palato, faringe e laringe. A lesão alta pode somar queda do palato e disfonia. Lesão recorrencial mais distal pode alterar a mobilidade laríngea sem assimetria palatina.',
    exam: 'Peça fonação sustentada para observar elevação do palato, compare a voz e avalie força da tosse. Pergunte por regurgitação nasal, engasgos e cirurgia cervical ou torácica recente.',
    distinction:
      'Rouquidão isolada pede avaliação direta da laringe. A associação de disfagia, palato assimétrico e outros sinais de pares baixos desloca a hipótese para vago proximal, base do crânio ou bulbo.',
    investigation:
      'Laringoscopia avalia a mobilidade das pregas vocais. Em suspeita de aspiração, solicite avaliação de deglutição. Estridor ou dificuldade de manejar secreções exige atenção imediata à via aérea.',
    references: ['cranial', 'swallowing'],
  },
  'accessory-nerve-xi': {
    name: 'Nervo acessório (XI)',
    title: 'Ombro caído com fraqueza de trapézio',
    mechanism:
      'O XI inerva trapézio e esternocleidomastoideo. Seu trajeto pelo triângulo posterior do pescoço fica vulnerável a procedimentos cervicais, com possibilidade de maior envolvimento do trapézio em lesões distais.',
    exam: 'Compare elevação dos ombros contra resistência e rotação da cabeça para cada lado. Um esternocleidomastoideo gira a face para o lado oposto. Observe depressão do ombro, atrofia e comportamento da escápula no movimento.',
    distinction:
      'Dor articular pode inibir o movimento mesmo com força preservada. Fraqueza do trapézio com alteração escapular e antecedente cervical favorece XI. Fraqueza de serrátil anterior produz outro padrão de discinesia escapular.',
    investigation:
      'Exame segmentar e, quando indicada, avaliação eletrofisiológica ajudam a separar lesão do XI de plexo ou raiz. Disfagia ou disfonia associada faz examinar outros pares na base do crânio.',
    references: ['cranial', 'motor'],
  },
  'hypoglossal-nerve-xii': {
    name: 'Nervo hipoglosso (XII)',
    title: 'Desvio da língua com ou sem desnervação',
    mechanism:
      'A contração do genioglosso empurra a língua para a frente e para o lado oposto. Com fraqueza unilateral periférica, a língua tende a desviar para o lado fraco ao protruir. A desnervação pode levar a atrofia e fasciculações.',
    exam: 'Inspecione em repouso, peça protrusão e teste a língua contra a bochecha. Observe articulação de sons linguais, mastigação e deglutição. Compare com força e sinais piramidais dos membros.',
    distinction:
      'Desvio sem atrofia pode ocorrer em lesão supranuclear, principalmente se há outros déficits centrais. Desvio com atrofia focal e fasciculações favorece lesão de neurônio motor inferior. Combine a direção do desvio com trofismo, força e os demais sinais.',
    investigation:
      'Sinais de vários pares baixos apontam para bulbo ou base do crânio. Em quadro súbito com fraqueza corporal do lado oposto ao hipoglosso lesionado, investigue circulação posterior.',
    references: ['cranial', 'motor', 'stroke'],
  },
  'middle-cerebral-artery-m1-segment': {
    name: 'Artéria cerebral média (M1)',
    title: 'Convexidade lateral, perfurantes e síndromes diferentes',
    mechanism:
      'M1 conduz fluxo para ramos corticais da cerebral média e emite perfurantes para regiões profundas. Uma oclusão proximal pode comprometer áreas de linguagem ou atenção e vias motoras. Oclusões de ramos menores podem poupar parte desses circuitos.',
    exam: 'Compare face e braço com perna. Avalie desvio do olhar, campo visual, linguagem e extinção. Documente o último momento sem sintomas. Use a distribuição para formar hipótese e mantenha avaliação de causas tratáveis como hipoglicemia.',
    distinction:
      'Afasia e negligência são pistas corticais. Uma síndrome motora pura também pode ocorrer com lesão nas perfurantes ou em outros locais profundos. O padrão clínico orienta a topografia. A imagem vascular ajuda a definir o segmento.',
    investigation:
      'Déficit abrupto pede fluxo de AVC. TC sem contraste pesquisa hemorragia e a angio-TC, quando indicada, avalia a presença e a localização de oclusão. Alteração arterial na imagem deve ser interpretada junto do território clínico.',
    references: ['neuro', 'stroke'],
  },
  'pyramid-of-medulla-oblongata': {
    name: 'Pirâmide bulbar',
    title: 'A decussação muda o lado esperado da fraqueza',
    mechanism:
      'As fibras corticoespinais descem nas pirâmides. A maior parte cruza no bulbo caudal e continua no trato lateral da medula. Acima da decussação, a paresia corporal tende a ser contralateral. Na medula, abaixo da decussação, tende a ser ipsilateral à via lesada.',
    exam: 'Descreva força segmentar, tônus, reflexos e plantar. Pesquise pares cranianos, vibração e um possível nível sensitivo no tronco. Febre, trauma e evolução do déficit modificam as hipóteses causais.',
    distinction:
      'Uma lesão medular pode somar sinais segmentares no nível de acometimento aos sinais piramidais abaixo. A fase aguda pode mostrar reflexos reduzidos. O padrão temporal impede classificar a lesão por um único reflexo.',
    investigation:
      'Localize antes de direcionar a imagem. Pares cranianos cruzados favorecem tronco, enquanto fraqueza abaixo de nível sensitivo com disfunção esfincteriana pede avaliação medular urgente.',
    references: ['motor', 'neuro', 'stroke'],
  },
  'lateral-corticospinal-tract': {
    name: 'Trato corticoespinal lateral',
    title: 'Fraqueza piramidal abaixo de um nível medular',
    mechanism:
      'Na medula, esse feixe já carrega fibras que cruzaram no bulbo. Sua lesão reduz o comando voluntário do mesmo lado abaixo do nível. A perda de modulação descendente ajuda a explicar espasticidade, clônus e resposta plantar extensora com a evolução.',
    exam: 'Mapeie a fraqueza por grupos, compare tônus em diferentes velocidades e note reflexos acima, no nível e abaixo da suspeita. Procure nível sensitivo e sintomas urinários ou intestinais.',
    distinction:
      'Radiculopatia pode reduzir um reflexo e a força de um miótomo. Mielopatia pode afetar vários segmentos abaixo da lesão e associar sinais autonômicos. Na fase aguda, reflexos reduzidos ainda podem ocorrer.',
    investigation:
      'Déficit motor novo com nível sensitivo ou alteração esfincteriana exige avaliação de mielopatia e possível compressão. A RM deve cobrir o nível sugerido pelo conjunto do exame.',
    references: ['motor', 'myelopathy'],
  },
  'lateral-spinothalamic-tract': {
    name: 'Trato espinotalâmico lateral',
    title: 'Perda dissociada de dor e temperatura',
    mechanism:
      'As fibras aferentes entram e fazem sinapse na medula. Fibras de segunda ordem cruzam perto do nível de entrada e sobem na via anterolateral oposta. Já as fibras de vibração e posição percorrem inicialmente o mesmo lado nos cordões posteriores.',
    exam: 'Compare a percepção de agudo e rombo e delimite a transição no tronco. Em seguida teste vibração e posição separadamente. Registre se os dois tipos de perda começam no mesmo nível.',
    distinction:
      'Lesão unilateral da via anterolateral pode causar perda contralateral que começa alguns segmentos abaixo. Lesão central que afeta fibras durante a decussação pode provocar perda segmentar bilateral, mesmo com vibração relativamente poupada.',
    investigation:
      'Use a distribuição e as outras vias afetadas para localizar a medula na RM. Alteração súbita, progressiva ou com disfunção autonômica aumenta a urgência da avaliação.',
    references: ['motor', 'myelopathy'],
  },
  'white-matter-of-spinal-cord': {
    name: 'Substância branca da medula',
    title: 'Hemissecção medular e combinação de vias longas',
    mechanism:
      'No mesmo hemicordão passam a via motora lateral e as fibras de vibração ainda ipsilaterais. A dor e a temperatura do outro lado já cruzaram na medula e sobem no sistema anterolateral. A combinação produz dissociação entre os lados.',
    exam: 'Compare posição do hálux e vibração em proeminências ósseas. Mapeie a transição de dor e temperatura no tronco e membros. Procure reflexos assimétricos e compare o lado da paresia com o lado da perda sensitiva.',
    distinction:
      'Na hemissecção clássica, fraqueza e perda de posição predominam do lado da lesão. A perda de dor e temperatura predomina do lado oposto e pode começar mais abaixo. Um padrão bilateral com nível e alterações esfincterianas pede considerar acometimento transversal.',
    investigation:
      'A síndrome orienta nível e lado. Em lesões incompletas, alguns componentes podem estar preservados. Trauma ou suspeita de compressão aguda exige avaliação urgente e imagem dirigida.',
    references: ['motor', 'myelopathy'],
    exercise: {
      question:
        'Após trauma torácico, a pessoa perdeu força e percepção de posição na perna esquerda. À direita, sente menos estímulos agudos abaixo do abdome. Como unir os achados?',
      explanation:
        'A combinação aponta para comprometimento do hemicordão esquerdo. A via motora já cruzou no bulbo, a propriocepção ainda sobe pelo mesmo lado e fibras de dor oriundas do lado direito cruzam na medula. O exame ajuda a dirigir a busca, e a imagem confirma a extensão.',
    },
  },
  'anterior-horn-of-spinal-cord': {
    name: 'Corno anterior da medula',
    title: 'Quando o sinal é do neurônio motor inferior',
    mechanism:
      'Os corpos dos motoneurônios do corno anterior fazem a saída final para o músculo e participam do arco reflexo. Perder esses neurônios pode causar fraqueza, reflexo reduzido e atrofia por desnervação.',
    exam: 'Compare massa e força muscular em músculos de nervos diferentes e procure fasciculações. Teste reflexos com relaxamento e avalie sensibilidade por modalidade. Registre se os sinais se restringem a um nível ou se aparecem em regiões distantes.',
    distinction:
      'A raiz pode produzir dor radicular e alterações sensitivas, enquanto um processo do corno anterior pode poupar a sensibilidade. Fasciculações isoladas têm baixa especificidade. Sinais de neurônio motor superior associados ampliam a hipótese.',
    investigation:
      'A distribuição orienta a combinação de imagem e avaliação eletrofisiológica quando indicada. Piora rápida com disfunção respiratória, bulbar ou outros déficits agudos exige avaliação urgente.',
    references: ['motor', 'myelopathy'],
  },
  liver: {
    name: 'Fígado',
    title: 'Borda hepática, congestão e descompensação',
    mechanism:
      'O fígado aumentado pode resultar de inflamação, infiltração ou congestão venosa. Na cirrose avançada, resistência intra-hepática favorece hipertensão portal. A alteração da síntese de proteínas e a retenção renal de sódio também influenciam o acúmulo de líquido.',
    exam: 'Percuta para estimar a extensão hepática e palpe a borda durante a inspiração, registrando consistência e dor. A avaliação inclui jugulares, edema, colaterais, icterícia e sinais de ascite. Fígado baixo pode ser deslocado inferiormente pelo diafragma.',
    distinction:
      'Hepatomegalia dolorosa com jugulares muito elevadas orienta para congestão sistêmica. Colaterais e esplenomegalia favorecem hipertensão portal. Asterixis ocorre em mais de uma encefalopatia e precisa ser interpretada com contexto metabólico e neurológico.',
    investigation:
      'O ultrassom com Doppler avalia morfologia e fluxos. Na ascite nova, a avaliação do líquido ajuda a diferenciar mecanismos e pesquisar infecção. Febre, dor ou alteração de consciência na cirrose descompensada exige investigação rápida.',
    references: ['ascites', 'heart'],
  },
  'hepatic-portal-vein': {
    name: 'Veia porta hepática',
    title: 'Ascite e o que o gradiente de albumina significa',
    mechanism:
      'A pressão pode se elevar antes do fígado, nos sinusoides ou na drenagem venosa. Isso favorece deslocamento de líquido para o peritônio e circulação colateral. Cirrose, trombose portal e congestão cardíaca podem compartilhar manifestações.',
    exam: 'Observe distensão e flancos. Percuta no decúbito dorsal e repita de lado para verificar se a zona maciça se desloca. Pesquise colaterais, baço e jugulares. Pequenas quantidades de líquido podem passar despercebidas no exame.',
    distinction:
      'Um gradiente soro–ascite de albumina (GASA) de 1,1 g/dL ou mais sustenta um mecanismo portal. Entre pacientes com gradiente alto, proteína ascítica de 2,5 g/dL ou mais favorece a hipótese cardíaca em contexto compatível. Gradiente baixo orienta investigação peritoneal e outras causas.',
    investigation:
      'Considere albumina sérica e ascítica colhidas em intervalo próximo, proteína e contagem celular na avaliação da ascite. Doppler ajuda a avaliar direção do fluxo e patência portal. A punção e o teste de infecção são particularmente relevantes na descompensação.',
    references: ['ascites', 'ascitesAnalysis', 'heart'],
    exercise: {
      question:
        'Albumina sérica de 3,2 g/dL, ascítica de 1,6 g/dL e proteína ascítica de 3,1 g/dL. Há também jugulares elevadas. Qual mecanismo ganha peso?',
      explanation:
        'O gradiente é 1,6 g/dL. A combinação de gradiente alto, proteína mais elevada e jugulares distendidas aumenta a plausibilidade de congestão cardíaca. Integre esse padrão à avaliação ecocardiográfica e aos demais dados.',
    },
  },
  spleen: {
    name: 'Baço',
    title: 'Baço palpável e a origem da hipertensão portal',
    mechanism:
      'Pressão portal sustentada pode congestionar o baço. Aumento também pode decorrer de hiperplasia ligada a infecção, hemólise ou infiltração hematológica.',
    exam: 'Procure o polo inferior ao longo da diagonal entre o hipocôndrio esquerdo e o abdome inferior, acompanhando a inspiração. Observe consistência, sensibilidade e percussão. Correlacione com tamanho do fígado, colaterais e presença de ascite.',
    distinction:
      'Macicez isolada é influenciada por conteúdo gástrico e anatomia adjacente. Esplenomegalia com colaterais e plaquetopenia favorece contexto portal. Adenomegalias, febre ou alterações de várias séries do hemograma ampliam o diferencial.',
    investigation:
      'Ultrassom pode confirmar o tamanho e estudar a circulação portal. Hemograma, esfregaço ou investigação infecciosa e hematológica dependem do raciocínio clínico e epidemiológico.',
    references: ['ascites'],
  },
  gallbladder: {
    name: 'Vesícula biliar',
    title: 'Cólica biliar, colecistite e possível obstrução ductal',
    mechanism:
      'Obstrução transitória do ducto cístico pode produzir dor que depois cede. Se a obstrução e a inflamação persistem, a vesícula fica dolorosa à movimentação inspiratória. Cálculo que alcança o colédoco pode mudar o quadro para colestase e, se houver infecção, colangite.',
    exam: 'Pergunte quanto durou a dor, se voltou, se irradiou e se houve febre, calafrios ou mudança na cor da urina e das fezes. Palpe suavemente o hipocôndrio direito e observe se ocorre interrupção inspiratória provocada pela dor. Relacione a manobra ao exame sistêmico.',
    distinction:
      'Dor resolvida e sem sinais sistêmicos favorece cólica. Dor persistente com inflamação local favorece colecistite. Febre com sinais de colestase dirige a atenção para o colédoco. Um cálculo incidental pode coexistir com outra origem da dor.',
    investigation:
      'Ultrassom é o exame inicial de escolha na suspeita biliar. Observe cálculos, espessamento, líquido perivesicular e dilatação de ductos. Icterícia com febre ou sinais de sepse exige avaliação urgente mesmo se a combinação clássica de sintomas estiver incompleta.',
    references: ['biliary', 'cholangitis'],
    exercise: {
      question:
        'Uma paciente com litíase conhecida passa a ter dor persistente, calafrios e urina escura. Qual hipótese você acrescentaria à de inflamação restrita à vesícula?',
      explanation:
        'A colúria aumenta a preocupação com bilirrubina conjugada e obstrução biliar. Com calafrios, investigue colangite e sua gravidade, além de estudar o calibre ductal e os exames laboratoriais.',
    },
  },
  'bile-duct': {
    name: 'Colédoco',
    title: 'Colúria, acolia e o nível da obstrução',
    mechanism:
      'Se a bile deixa de chegar adequadamente ao intestino, as fezes podem ficar claras e a bilirrubina conjugada aparece na urina. Cálculo, estenose e compressão na região da cabeça pancreática são mecanismos possíveis.',
    exam: 'Procure icterícia nas escleras. Pergunte por prurido, colúria, acolia, evolução da dor, febre e perda ponderal. Avalie o estado geral antes de interpretar manobras abdominais.',
    distinction:
      'Icterícia isolada também pode resultar de lesão hepatocelular ou hemólise. Combine as frações da bilirrubina e o padrão enzimático. Icterícia progressiva indolor com perda de peso faz investigar obstrução tumoral, ainda que o exame da vesícula seja inconclusivo.',
    investigation:
      'O ultrassom identifica dilatação e causas visíveis. Conforme a probabilidade clínica, colangiorressonância ou ecoendoscopia podem procurar cálculo ou estenose. Suspeita de colangite exige fluxo urgente para controle da infecção e avaliação da drenagem.',
    references: ['biliary', 'bileDuct', 'cholangitis'],
  },
  pancreas: {
    name: 'Pâncreas',
    title: 'Dor epigástrica e lesão pancreática aguda ou crônica',
    mechanism:
      'Inflamação aguda do pâncreas retroperitoneal pode causar dor contínua que chega ao dorso. Comprometimento crônico reduz a função exócrina, com má digestão de nutrientes, e pode afetar também as ilhotas e o controle glicêmico.',
    exam: 'Pergunte pela intensidade, tempo de evolução, vômitos, litíase, uso de álcool e perda de peso. Procure sensibilidade epigástrica, taquipneia, sinais de hipoperfusão ou peritonismo. Na queixa crônica, pergunte por fezes oleosas e volumosas.',
    distinction:
      'Dor típica, lipase a partir de três vezes o limite superior da normalidade e imagem característica são os três critérios usuais, dos quais dois sustentam pancreatite aguda. Uma elevação discreta de lipase tem outras causas. Dor abrupta com rigidez também exige considerar perfuração, e instabilidade exige avaliação urgente.',
    investigation:
      'Use ultrassom para pesquisar causa biliar. TC precoce de rotina tem utilidade limitada quando o diagnóstico já está claro. Imagem se torna importante diante de dúvida, deterioração ou evolução desfavorável. Em quadro crônico, avalie estrutura pancreática e sinais de insuficiência quando indicados.',
    references: ['pancreatitis', 'biliary'],
    exercise: {
      question:
        'Dor epigástrica típica irradiada ao dorso e lipase quatro vezes o limite superior, com estabilidade. Qual pergunta a ultrassonografia inicial ajuda a responder?',
      explanation:
        'Os dois critérios já sustentam a hipótese de pancreatite. A ultrassonografia pesquisa um mecanismo biliar, incluindo cálculos na vesícula, e orienta o próximo passo.',
    },
  },
  oesophagus: {
    name: 'Esôfago',
    title: 'Disfagia de origem esofágica ou orofaríngea',
    mechanism:
      'A passagem do bolo alimentar depende do calibre, do peristaltismo e do relaxamento distal. Estreitamento torna a passagem de sólidos progressivamente mais difícil. Falhas motoras podem afetar sólidos e líquidos desde o início.',
    exam: 'Pergunte se o problema ocorre ao iniciar a deglutição ou depois de engolir. Separe consistência dos alimentos, progressão, sensação de parada, odinofagia, regurgitação, engasgos e perda de peso.',
    distinction:
      'Engasgo imediato e voz alterada após deglutir sugerem dificuldade orofaríngea. Sensação de alimento parado após deglutição favorece origem esofágica. Progressão de sólidos para líquidos e perda ponderal pedem investigar obstrução estrutural.',
    investigation:
      'Endoscopia com biópsia quando indicada avalia mucosa e obstrução. Se a avaliação estrutural for inconclusiva, a manometria pode esclarecer motilidade. Incapacidade de manejar secreções por possível impactação exige avaliação urgente.',
    references: ['swallowing'],
  },
  stomach: {
    name: 'Estômago',
    title: 'Sangramento alto, estabilidade e diagnóstico da fonte',
    mechanism:
      'Lesões da mucosa podem erodir vasos gástricos. Hematêmese ou melena podem vir do esôfago, estômago ou duodeno. Sangramento rápido pode produzir sangue vivo nas fezes mesmo com origem proximal.',
    exam: 'Caracterize vômitos, fezes, tontura e síncope. Pergunte por anti-inflamatórios, anticoagulantes, história de úlcera, cirrose e vômitos repetidos antes do sangramento. Meça sinais vitais e avalie perfusão.',
    distinction:
      'Fezes escuras por ferro ou bismuto podem simular melena. Sangue vivo com instabilidade pode vir de hemorragia alta significativa. Em cirrose, considere varizes e causas não varicosas.',
    investigation:
      'Priorize estabilização e estratificação de risco. Hemograma inicial pode subestimar perda aguda. A endoscopia identifica lesões e permite hemostasia quando indicada.',
    references: ['bleeding'],
  },
  duodenum: {
    name: 'Duodeno',
    title: 'Úlcera, sangramento e sinais de perfuração',
    mechanism:
      'Úlcera posterior do bulbo pode erodir a artéria gastroduodenal. Úlcera que perfura pode comunicar a luz com o peritônio e provocar dor abrupta, defesa involuntária e ar livre.',
    exam: 'Pergunte se houve melena ou vômitos antes da dor. Compare o início e a progressão e avalie sinais vitais, rigidez e limites da dor. Percussão timpânica na área hepática é uma pista de ar livre com sensibilidade limitada.',
    distinction:
      'Dor epigástrica com instabilidade pode refletir sangramento. Dor abrupta com peritonismo desloca a suspeita para perfuração ou outra causa de abdome agudo. Um sinal epônimo ausente tem valor limitado para reduzir essa suspeita.',
    investigation:
      'Hemorragia suspeita segue avaliação de estabilidade e endoscopia após estabilização conforme a urgência. Suspeita de perfuração muda a prioridade para avaliação cirúrgica e imagem adequada ao estado clínico.',
    references: ['bleeding'],
  },
  'vermiform-appendix': {
    name: 'Apêndice vermiforme',
    title: 'Migração da dor e posição do apêndice',
    mechanism:
      'O estímulo visceral inicial pode ser percebido perto do umbigo. A extensão ao peritônio parietal localiza a dor na fossa ilíaca direita. A posição retrocecal ou pélvica modifica os achados e a intensidade da dor anterior.',
    exam: 'Pergunte pela sequência entre dor, vômitos, anorexia e febre. Comece a palpação longe do ponto mais doloroso. Extensão da coxa pode mobilizar o psoas próximo de um apêndice retrocecal. Rotação interna do quadril fletido pode reproduzir dor pélvica.',
    distinction:
      'Manobras positivas reforçam irritação local em contexto compatível. Um teste negativo isolado tem baixo poder para excluir apendicite. Considere vias urinárias, trato intestinal e causas ginecológicas quando pertinente.',
    investigation:
      'A escolha de imagem depende da apresentação, idade e possibilidade de gestação. Em adultos não gestantes, TC costuma ser apropriada quando indicada. Em gestantes, ultrassom e RM sem contraste têm papel importante.',
    references: ['appendix'],
    exercise: {
      question:
        'A dor começou periumbilical e localizou à direita. A extensão do quadril direito piora a dor, enquanto a palpação anterior é pouco expressiva. Que relação anatômica ajuda a explicar isso?',
      explanation:
        'Um apêndice retrocecal inflamado pode irritar estruturas próximas ao psoas e produzir pouco sinal na parede anterior. A posição é uma hipótese a confirmar junto do restante da avaliação.',
    },
  },
  'sigmoid-colon': {
    name: 'Cólon sigmoide',
    title: 'Dor à esquerda e complicações da diverticulite',
    mechanism:
      'A inflamação de um divertículo do sigmoide pode permanecer contida nos tecidos locais ou evoluir com coleção e perfuração. O sigmoide móvel e seu mesocólon explicam variação de topografia.',
    exam: 'Caracterize dor, febre, mudança de hábito intestinal, sintomas urinários e episódios prévios. Localize sensibilidade e observe peritonismo, distensão e estado circulatório.',
    distinction:
      'Diverticulite é plausível com dor focal e febre. Colite, isquemia e doença urinária ou pélvica também podem produzir dor à esquerda. Perda de peso e alteração persistente de hábito ampliam a avaliação para lesão estrutural.',
    investigation:
      'A TC é especialmente útil quando há dúvida ou suspeita de complicação. Procure alterações inflamatórias da gordura, coleção ou ar extraluminal. Peritonismo difuso e instabilidade indicam avaliação urgente.',
    references: ['diverticulitis'],
  },
};

const aliases: Readonly<Record<string, string>> = {
  cerebr: 'cerebrum',
  esophagus: 'oesophagus',
  'common-bile-duct': 'bile-duct',
  'portal-vein': 'hepatic-portal-vein',
};

export function clinicalCorrelation(
  id: string,
  sourceId?: string,
): ClinicalCorrelation | undefined {
  for (const candidate of [sourceId, id]) {
    if (!candidate) continue;
    const canonical = candidate
      .split('@')[0]
      .replace(/_l$/, '-left')
      .replace(/_r$/, '-right')
      .replaceAll('_', '-')
      .replace(/^heart-(?=left-|right-)/, '');
    const base = canonical.replace(/-(left|right)$/, '');
    for (const key of [canonical, base, aliases[canonical], aliases[base]]) {
      if (key && Object.hasOwn(clinicalCorrelations, key))
        return clinicalCorrelations[key];
    }
  }
  return undefined;
}
