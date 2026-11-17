import vessels from './vessels.json';
import curriculum from './curriculum.json';

type Detail = {
  name: string;
  short: string;
  anatomy: string;
  function: string;
  clinic: string;
  imaging: string;
  reference: 'heart' | 'cycle' | 'brain' | 'circulation' | 'exam';
  deeper?: readonly { title: string; text: string }[];
};

export const anatomyReferences = {
  heart:
    'https://openstax.org/books/anatomy-and-physiology-2e/pages/19-1-heart-anatomy',
  cycle:
    'https://openstax.org/books/anatomy-and-physiology-2e/pages/19-3-cardiac-cycle',
  brain:
    'https://openstax.org/books/anatomy-and-physiology-2e/pages/13-2-the-central-nervous-system',
  circulation:
    'https://openstax.org/books/anatomy-and-physiology-2e/pages/13-3-circulation-and-the-central-nervous-system',
  exam: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/16-1-overview-of-the-neurological-exam',
} as const;

export const anatomyDetails: Record<string, Detail> = {
  heart: {
    name: 'Coração',
    short: 'Bomba muscular das circulações pulmonar e sistêmica.',
    anatomy:
      'Ocupa o mediastino médio, envolto pelo pericárdio. O ventrículo direito predomina na face anterior, o átrio esquerdo na base posterior e o ventrículo esquerdo forma o ápice. Septos separam as câmaras de cada lado.',
    function:
      'O retorno venoso sistêmico chega ao átrio direito. O ventrículo direito o envia aos pulmões. O retorno pulmonar entra no átrio esquerdo e o ventrículo esquerdo ejeta para a aorta. As valvas abrem e fecham em resposta aos gradientes de pressão.',
    clinic:
      'Na ausculta, os focos correspondem à transmissão do som. Relacione o sopro com o momento do ciclo, a localização de maior intensidade e a irradiação.',
    imaging:
      'A ecocardiografia avalia movimento das paredes, função das câmaras, valvas e fluxo. A radiografia mostra a silhueta e sinais indiretos, como congestão pulmonar.',
    deeper: [
      {
        title: 'Camadas da parede',
        text: 'O endocárdio reveste as câmaras e as valvas. O miocárdio produz a força de contração. O epicárdio corresponde à camada visceral do pericárdio seroso. Entre as lâminas serosas há uma cavidade potencial com fluido que reduz o atrito.',
      },
      {
        title: 'Condução e pressão ao longo do ciclo',
        text: 'O nó sinoatrial inicia a ativação atrial. O nó atrioventricular retarda a condução antes da ativação ventricular pelo sistema His–Purkinje. A diferença de pressão determina a abertura ou o fechamento das valvas nos períodos de enchimento e ejeção.',
      },
      {
        title: 'Irrigação e drenagem',
        text: 'As coronárias nascem na raiz da aorta. Ramos da descendente anterior, circunflexa e coronária direita suprem territórios que variam com a anatomia. Grande parte da drenagem chega ao átrio direito pelo seio coronário.',
      },
    ],
    reference: 'heart',
  },
  'right-atrium': {
    name: 'Átrio direito',
    short: 'Recebe o retorno venoso sistêmico.',
    anatomy:
      'Recebe as veias cavas e o seio coronário. A crista terminal separa a porção lisa posterior da região anterior com músculos pectíneos. A fossa oval está no septo interatrial.',
    function:
      'Funciona como reservatório durante a sístole ventricular e como via de passagem durante o enchimento. A contração atrial ajuda a completar o enchimento do ventrículo direito.',
    clinic:
      'O pulso venoso jugular reflete eventos de pressão do átrio direito. A regurgitação tricúspide pode produzir ondas sistólicas jugulares proeminentes.',
    imaging:
      'A janela apical de quatro câmaras mostra o átrio direito, o septo interatrial, a tricúspide e o ventrículo direito.',
    reference: 'heart',
  },
  'left-atrium': {
    name: 'Átrio esquerdo',
    short: 'Recebe o sangue que retorna dos pulmões.',
    anatomy:
      'Câmara posterior que forma grande parte da base cardíaca. Recebe habitualmente quatro veias pulmonares. O apêndice atrial esquerdo fica junto ao sulco atrioventricular esquerdo.',
    function:
      'Armazena o retorno pulmonar durante a sístole ventricular. Na diástole, o sangue passa pela mitral ao ventrículo esquerdo.',
    clinic:
      'Na fibrilação atrial, a contração coordenada é perdida. A estase no apêndice atrial esquerdo pode favorecer formação de trombo.',
    imaging:
      'A janela apical de quatro câmaras permite medir o volume atrial. A ecocardiografia transesofágica aproxima o transdutor do apêndice atrial esquerdo.',
    reference: 'heart',
  },
  'right-ventricle': {
    name: 'Ventrículo direito',
    short: 'Ejeta sangue para a circulação pulmonar.',
    anatomy:
      'Ocupa a maior parte da face esternocostal. Tem via de entrada tricúspide, região apical trabeculada e via de saída lisa (infundíbulo) sob a valva pulmonar. A trabécula septomarginal liga o septo à parede livre.',
    function:
      'A parede mais fina trabalha contra a resistência usualmente baixa da circulação pulmonar. O septo, a parede livre e a contração longitudinal contribuem para a ejeção.',
    clinic:
      'A elevação aguda da resistência pulmonar pode dilatar o ventrículo direito e deslocar o septo. Compare os achados com a perfusão e a pressão arterial.',
    imaging:
      'No ecocardiograma, use a janela apical focada no ventrículo direito e avalie o tamanho, a função e o movimento do septo em conjunto.',
    reference: 'heart',
  },
  'left-ventricle': {
    name: 'Ventrículo esquerdo',
    short: 'Ejeta sangue para a circulação sistêmica.',
    anatomy:
      'Forma o ápice e parte das faces esquerda e diafragmática. Sua parede é mais espessa que a do ventrículo direito. Os músculos papilares se ligam aos folhetos da mitral por cordas tendíneas.',
    function:
      'O enchimento ocorre pela mitral. Após a contração isovolumétrica, a pressão ventricular supera a aórtica e começa a ejeção. A contração inclui encurtamento, espessamento e torção.',
    clinic:
      'Alterações segmentares da contração podem ser relacionadas aos territórios coronários. A interpretação inclui movimento, espessamento, sintomas e ECG.',
    imaging:
      'No eco, as janelas apicais permitem estimar volumes e fração de ejeção. O cine de RM mostra a mudança de volume durante o ciclo.',
    reference: 'cycle',
  },
  'ascending-aorta': {
    name: 'Aorta ascendente',
    short: 'Leva a ejeção do ventrículo esquerdo ao arco aórtico.',
    anatomy:
      'Estende-se da raiz aórtica até o arco. As coronárias nascem dos seios aórticos direito e esquerdo, junto à valva. A junção sinotubular separa a raiz do segmento tubular.',
    function:
      'Sua parede elástica distende na sístole e auxilia a manter o fluxo arterial na diástole.',
    clinic:
      'A localização de uma dissecção em relação à aorta ascendente muda sua classificação e sua urgência. Distinga raiz, segmento ascendente e arco ao descrever a topografia.',
    imaging:
      'Eco avalia raiz e porção proximal. A angio-TC permite seguir o vaso e medir seu diâmetro em planos ortogonais ao eixo.',
    reference: 'heart',
  },
  'aortic-arch': {
    name: 'Arco da aorta',
    short:
      'Emite os principais ramos para cabeça, pescoço e membros superiores.',
    anatomy:
      'Curva-se sobre a raiz pulmonar esquerda e continua na aorta descendente. No padrão mais comum, origina tronco braquiocefálico, carótida comum esquerda e subclávia esquerda.',
    function:
      'Distribui o fluxo sistêmico proximal e mantém continuidade entre a aorta ascendente e a descendente.',
    clinic:
      'O nervo laríngeo recorrente esquerdo passa sob o arco junto ao ligamento arterioso. Dilatações nessa região podem se associar a rouquidão por compressão.',
    imaging:
      'Em reconstruções oblíquas de angio-TC, siga o arco e confirme as origens dos ramos, que podem variar.',
    reference: 'heart',
  },
  'pulmonary-trunk': {
    name: 'Tronco pulmonar',
    short: 'Conecta o ventrículo direito às artérias pulmonares.',
    anatomy:
      'Parte da via de saída do ventrículo direito, passa anteriormente à aorta ascendente e se divide nas artérias pulmonares direita e esquerda.',
    function:
      'Conduz o sangue venoso para os pulmões, onde ocorre a troca gasosa. A valva pulmonar separa o tronco do ventrículo direito.',
    clinic:
      'Distinguir o tronco dos ramos proximais orienta a descrição da localização de trombos e de alterações de calibre.',
    imaging:
      'Na angio-TC pulmonar, use a bifurcação como ponto de partida para acompanhar os ramos e sua opacificação.',
    reference: 'heart',
  },
  'superior-vena-cava': {
    name: 'Veia cava superior',
    short: 'Drena a metade superior do corpo para o átrio direito.',
    anatomy:
      'Origina-se da união das veias braquiocefálicas. Recebe a veia ázigos antes de desembocar no átrio direito.',
    function:
      'Conduz o retorno venoso da cabeça, pescoço, membros superiores e parte do tórax.',
    clinic:
      'Obstrução pode causar edema facial e dos membros superiores, distensão venosa e circulação colateral torácica.',
    imaging:
      'Na TC contrastada, acompanhe o vaso à direita da aorta ascendente até a junção cavoatrial.',
    reference: 'heart',
  },
  'left-coronary-artery': {
    name: 'Tronco da coronária esquerda',
    short: 'Dá origem à descendente anterior e à circunflexa.',
    anatomy:
      'Nasce do seio aórtico esquerdo. O segmento proximal passa entre o tronco pulmonar e a aurícula esquerda. Pode haver um ramo intermédio.',
    function:
      'É a via de entrada para grande parte da irrigação do ventrículo esquerdo. A perfusão coronária esquerda ocorre predominantemente na diástole.',
    clinic:
      'Uma lesão proximal do tronco pode comprometer mais de um território miocárdico. O padrão de distribuição depende da anatomia individual.',
    imaging:
      'Na angio-TC coronária, localize o óstio e siga o tronco até a divisão. Reconstruções curvas ajudam a avaliar o trajeto.',
    reference: 'heart',
  },
  'anterior-interventricular-artery': {
    name: 'Descendente anterior (DA)',
    short: 'Irriga a parede anterior e porções do septo e do ápice.',
    anatomy:
      'Ramo da coronária esquerda que percorre o sulco interventricular anterior rumo ao ápice. Dá ramos septais perfurantes e diagonais.',
    function:
      'Os ramos septais suprem grande parte do septo anterior e os diagonais irrigam porções da parede anterolateral do ventrículo esquerdo.',
    clinic:
      'Isquemia nesse território pode afetar a parede anterior, o septo ou o ápice. A extensão varia com o nível da lesão e com o comprimento e os ramos da artéria.',
    imaging:
      'Relacione o segmento arterial na coronariografia ou angio-TC com alterações segmentares de contração no eco ou na RM.',
    reference: 'heart',
  },
  'circumflex-artery-of-heart': {
    name: 'Artéria circunflexa',
    short: 'Acompanha o sulco atrioventricular esquerdo.',
    anatomy:
      'Origina-se do tronco coronário esquerdo. Percorre o sulco entre o átrio e o ventrículo esquerdos e emite ramos marginais obtusos.',
    function:
      'Irriga principalmente a parede lateral do ventrículo esquerdo. Na dominância esquerda, também origina a descendente posterior.',
    clinic:
      'O território isquêmico pode incluir parede inferior ou posterior em anatomias específicas. Correlacione a distribuição com o padrão de dominância.',
    imaging:
      'A angio-TC e a coronariografia mostram o vaso seguindo o contorno atrioventricular para trás.',
    reference: 'heart',
  },
  'right-coronary-artery': {
    name: 'Artéria coronária direita',
    short: 'Acompanha o sulco atrioventricular direito.',
    anatomy:
      'Nasce do seio aórtico direito e acompanha o sulco atrioventricular. Ramos marginais agudos se dirigem à parede livre do ventrículo direito.',
    function:
      'Supre parte do átrio e do ventrículo direitos. Na dominância direita, origina a descendente posterior e participa da irrigação inferior e septal posterior.',
    clinic:
      'Um infarto inferior pode vir acompanhado de envolvimento do ventrículo direito ou alteração da condução atrioventricular, dependendo do vaso e do nível da oclusão.',
    imaging:
      'Siga o vaso do óstio ao segmento distal e confirme a origem da descendente posterior ao descrever a dominância.',
    reference: 'heart',
  },
  'coronary-sinus': {
    name: 'Seio coronário',
    short: 'Devolve ao átrio direito parte do sangue venoso do miocárdio.',
    anatomy:
      'Percorre o sulco atrioventricular posterior e recebe tributárias como as veias cardíacas magna e média. Abre no átrio direito próximo da veia cava inferior.',
    function:
      'Coleta grande parte da drenagem venosa miocárdica, com retorno à circulação direita.',
    clinic:
      'É via de acesso para eletrodos posicionados em tributárias venosas na terapia de ressincronização.',
    imaging:
      'Observe seu trajeto posterior na TC multiplanar e sua relação com o anel mitral.',
    reference: 'heart',
  },
  'posterior-leaflet-of-left-atrioventricular-valve': {
    name: 'Folheto posterior da mitral',
    short: 'Participa do fechamento da mitral na sístole.',
    anatomy:
      'Insere-se na porção posterior do anel mitral. Divide-se em segmentos P1, P2 e P3. Cordas tendíneas conectam a borda e a face ventricular aos músculos papilares.',
    function:
      'Na diástole abre para o enchimento. Durante a sístole coapta com o folheto anterior e ajuda a impedir o refluxo para o átrio esquerdo.',
    clinic:
      'Um prolapso ou a perda de suporte das cordas pode produzir regurgitação mitral, que deve ser caracterizada pelo mecanismo e pela repercussão.',
    imaging:
      'Ecocardiografia com Doppler e, quando disponível, reconstrução tridimensional ajudam a localizar o segmento acometido.',
    reference: 'cycle',
  },
  cerebrum: {
    name: 'Encéfalo',
    short: 'Integra sensibilidade, movimento, cognição e funções autonômicas.',
    anatomy:
      'Inclui telencéfalo, diencéfalo, tronco encefálico e cerebelo. Substância cinzenta forma o córtex e núcleos profundos. A substância branca contém fibras de associação, projeção e comissurais.',
    function:
      'As redes encefálicas integram aferências sensitivas, selecionam respostas e modulam movimento e funções autonômicas. Meninges e líquor protegem o sistema nervoso central.',
    clinic:
      'Relacione a distribuição do déficit à topografia. Alterações de linguagem sugerem participação de redes do hemisfério dominante. Sinais de pares cranianos com déficits corporais podem ajudar a localizar o tronco.',
    imaging:
      'A TC permite avaliar rapidamente hemorragia e efeito de massa. Na RM, difusão e ADC ajudam a interpretar isquemia aguda no contexto clínico.',
    deeper: [
      {
        title: 'Microanatomia e organização',
        text: 'O neocórtex tem seis camadas com tipos celulares e conexões diferentes. A oligodendroglia produz mielina no sistema nervoso central. A barreira hematoencefálica depende de junções estreitas no endotélio e da interação com pericitos e pés astrocitários.',
      },
      {
        title: 'Da aferência à resposta',
        text: 'Sinais sensitivos alcançam circuitos espinais e do tronco. Muitas vias chegam ao córtex após retransmissão talâmica. Circuitos corticais, cerebelares e dos núcleos da base influenciam a seleção e o ajuste do movimento. Vias descendentes comunicam o plano às redes motoras.',
      },
      {
        title: 'Territórios e déficit esperado',
        text: 'A cerebral anterior irriga grande parte da face medial frontal e parietal, associada ao controle da perna. A cerebral média irriga grande parte da convexidade lateral, onde lesões podem comprometer face, braço e linguagem no hemisfério dominante. A cerebral posterior irriga o occipital, onde lesões podem causar perda homônima do campo visual.',
      },
      {
        title: 'Do mecanismo ao achado',
        text: 'Isquemia e hemorragia podem produzir déficits focais semelhantes. Correlacione o exame neurológico com a distribuição de alterações na TC ou RM. Em suspeita de isquemia, a combinação de sinal alto em DWI e sinal baixo no ADC ajuda a reconhecer restrição verdadeira, que deve ser interpretada em contexto.',
      },
    ],
    reference: 'exam',
  },
  'middle-frontal-gyrus': {
    name: 'Giro frontal médio',
    short: 'Integra atenção e funções executivas no lobo frontal.',
    anatomy:
      'Situa-se entre os sulcos frontais superior e inferior, na convexidade frontal. Sua porção posterior se aproxima do giro pré-central.',
    function:
      'Integra circuitos pré-frontais de memória de trabalho, atenção e controle executivo. Regiões frontais posteriores contribuem para o controle do olhar.',
    clinic:
      'Alterações de iniciativa, atenção ou planejamento podem acompanhar lesões frontais. O padrão de déficit depende da região e das redes envolvidas.',
    imaging:
      'Em RM axial, identifique o sulco central e avance anteriormente. Confirme os sulcos frontais em cortes coronais.',
    reference: 'brain',
  },
  'precentral-gyrus': {
    name: 'Giro pré-central',
    short: 'Abriga grande parte do córtex motor primário.',
    anatomy:
      'Fica imediatamente anterior ao sulco central, no lobo frontal. A representação cortical da perna se estende à face medial. A da face é mais inferolateral.',
    function:
      'Neurônios corticais enviam sinais pelas vias corticoespinal e corticonuclear. A organização somatotópica ajuda a explicar a distribuição dos déficits.',
    clinic:
      'Lesão na convexidade lateral pode causar fraqueza contralateral predominante em face e braço. Lesões mediais podem predominar na perna.',
    imaging:
      'Em cortes axiais altos de RM ou TC, procure a saliência em ômega da região motora da mão e confirme sua posição à frente do sulco central.',
    reference: 'exam',
  },
  'postcentral-gyrus': {
    name: 'Giro pós-central',
    short: 'Abriga o córtex somatossensitivo primário.',
    anatomy:
      'Situa-se entre os sulcos central e pós-central, no lobo parietal. Sua superfície contém uma representação somatotópica do corpo.',
    function:
      'Recebe sinais talamocorticais de toque, propriocepção e outras modalidades somáticas, com representação predominantemente contralateral.',
    clinic:
      'Examine a distribuição da perda sensitiva e funções corticais como discriminação tátil e reconhecimento de objetos pelo tato.',
    imaging:
      'Localize o sulco central em cortes axiais altos e compare os giros pré-central e pós-central nos planos ortogonais.',
    reference: 'brain',
  },
  'supramarginal-gyrus': {
    name: 'Giro supramarginal',
    short: 'Integra redes sensoriais e de linguagem no parietal inferior.',
    anatomy:
      'Parte do lóbulo parietal inferior, curva-se em torno da extremidade posterior do sulco lateral. O giro angular está mais posterior.',
    function:
      'Conecta informações somatossensitivas, auditivas e motoras. No hemisfério dominante, participa de redes de processamento fonológico.',
    clinic:
      'Lesões próximas podem prejudicar repetição e tarefas de integração. A localização depende do padrão completo de linguagem, atenção e sensibilidade.',
    imaging:
      'Uma vista sagital lateral de RM ajuda a localizar o contorno do sulco lateral e distinguir os giros do parietal inferior.',
    reference: 'brain',
  },
  'middle-temporal-gyrus': {
    name: 'Giro temporal médio',
    short: 'Participa do processamento semântico no lobo temporal.',
    anatomy:
      'Estende-se na face lateral temporal entre os sulcos temporais superior e inferior. Fica abaixo do giro temporal superior.',
    function:
      'Integra redes de reconhecimento e associação semântica. A conectividade posterior contribui para o acesso ao significado da linguagem.',
    clinic:
      'Dificuldades de nomeação e compreensão podem acompanhar disfunção de redes temporais dominantes. Compare linguagem, audição e atenção.',
    imaging:
      'Identifique os sulcos temporais em planos sagital lateral e coronal. A RM permite seguir a extensão de uma lesão para a substância branca.',
    reference: 'brain',
  },
  'occipital-pole': {
    name: 'Polo occipital',
    short: 'Extremo posterior do hemisfério, relacionado à visão.',
    anatomy:
      'Forma o extremo posterior do lobo occipital. O córtex visual primário se estende nas margens do sulco calcarino, na face medial.',
    function:
      'A representação visual é retinotópica. A visão central ocupa uma área desproporcionalmente grande próxima do polo occipital.',
    clinic:
      'Lesões retrogeniculadas podem produzir defeitos homônimos. Compare os campos visuais dos dois olhos para localizar o déficit.',
    imaging:
      'Na RM sagital medial, siga o sulco calcarino até a região posterior. A difusão é uma das sequências usadas na investigação de isquemia.',
    reference: 'brain',
  },
  hippocampus: {
    name: 'Hipocampo',
    short: 'Contribui para a formação de novas memórias declarativas.',
    anatomy:
      'Fica no temporal medial, junto ao assoalho do corno temporal do ventrículo lateral. A fímbria continua no fórnix.',
    function:
      'Participa da consolidação de memória episódica e de circuitos de navegação espacial. Interage com o córtex entorrinal e outras regiões límbicas.',
    clinic:
      'Lesões bilaterais podem prejudicar a formação de novas memórias. Esclerose hipocampal é uma causa de epilepsia temporal mesial.',
    imaging:
      'Cortes coronais oblíquos perpendiculares ao eixo hipocampal ajudam a comparar volume, arquitetura e sinal.',
    reference: 'brain',
  },
  thalamus: {
    name: 'Tálamo',
    short: 'Organiza sinais que circulam entre córtex e estruturas profundas.',
    anatomy:
      'Núcleo profundo par do diencéfalo, junto às paredes do terceiro ventrículo e medial ao braço posterior da cápsula interna.',
    function:
      'Seus núcleos retransmitem e modulam sinais sensitivos e motores e integram circuitos de vigília, atenção e cognição.',
    clinic:
      'Lesões podem produzir déficit sensitivo, alterações do nível de consciência ou outros sinais, conforme os núcleos e as conexões afetadas.',
    imaging:
      'Nos cortes axiais, identifique o tálamo entre o terceiro ventrículo e a cápsula interna. Compare os lados e a difusão.',
    reference: 'brain',
  },
  'caudate-nucleus': {
    name: 'Núcleo caudado',
    short: 'Integra circuitos motores e cognitivos dos núcleos da base.',
    anatomy:
      'Estrutura arqueada que acompanha o ventrículo lateral. A cabeça se relaciona ao corno frontal. Corpo e cauda seguem o trajeto ventricular.',
    function:
      'Integra o estriado junto ao putâmen. Recebe aferências corticais e participa da seleção de ações, aprendizado e controle de hábitos.',
    clinic:
      'A alteração de seus circuitos pode afetar movimento, cognição e comportamento. A topografia estriatal também pode orientar a leitura de lesões vasculares profundas.',
    imaging:
      'Na TC ou RM axial, localize a cabeça do caudado lateral ao corno frontal e medial ao braço anterior da cápsula interna.',
    reference: 'brain',
  },
  'corpus-callosum': {
    name: 'Corpo caloso',
    short: 'Principal feixe de comunicação entre os hemisférios cerebrais.',
    anatomy:
      'Feixe comissural com rostro, joelho, tronco e esplênio. Forma parte do teto dos ventrículos laterais.',
    function:
      'Conecta áreas corticais dos dois hemisférios e permite integração inter-hemisférica sensorial, motora e cognitiva.',
    clinic:
      'Lesões calosas podem produzir síndromes de desconexão. A manifestação depende da região calosa e das fibras envolvidas.',
    imaging:
      'Na RM sagital mediana, siga o contorno do joelho ao esplênio e observe a relação com o giro do cíngulo.',
    reference: 'brain',
  },
  pons: {
    name: 'Ponte',
    short: 'Conecta circuitos encefálicos e cerebelares no tronco.',
    anatomy:
      'Entre mesencéfalo e bulbo. A face ventral relaciona-se à artéria basilar. A face dorsal participa do assoalho do quarto ventrículo.',
    function:
      'Núcleos pontinos encaminham informação cortical ao cerebelo. A ponte contém vias longas e núcleos relacionados a pares cranianos e ao controle do olhar.',
    clinic:
      'Combinações de paralisia facial, alteração da abdução ocular e déficits de vias longas ajudam a localizar lesões pontinas.',
    imaging:
      'Na RM axial, identifique o quarto ventrículo dorsalmente e o espaço pré-pontino anteriormente.',
    reference: 'brain',
  },
  midbrain: {
    name: 'Mesencéfalo',
    short: 'Integra movimentos oculares e vias profundas do tronco.',
    anatomy:
      'Fica acima da ponte e envolve o aqueduto cerebral. Os colículos estão dorsalmente e os pedúnculos cerebrais, ventralmente.',
    function:
      'Acomoda vias motoras e sensitivas, núcleos dos pares III e IV e circuitos como a substância negra e o núcleo rubro.',
    clinic:
      'Déficits oculomotores combinados com sinais de vias longas ou alteração do olhar vertical ajudam a localizar a lesão no mesencéfalo.',
    imaging:
      'Nas imagens axiais de RM, identifique o aqueduto e compare o tegmento com os pedúnculos cerebrais.',
    reference: 'brain',
  },
  'medulla-oblongata': {
    name: 'Bulbo',
    short: 'Integra vias longas e funções respiratórias e autonômicas.',
    anatomy:
      'Entre a ponte e a medula espinal. Pirâmides e olivas ficam na face ventral. A porção rostral dorsal participa do assoalho do quarto ventrículo.',
    function:
      'Conduz vias ascendentes e descendentes. Participa do controle respiratório, cardiovascular e da deglutição. Grande parte das fibras corticoespinais cruza na porção caudal.',
    clinic:
      'Disfagia, disfonia e déficits sensitivos cruzados podem sugerir comprometimento bulbar lateral, conforme o conjunto dos achados.',
    imaging:
      'Use cortes finos de RM na junção bulbomedular e compare as faces lateral e medial.',
    reference: 'brain',
  },
  'superior-semilunar-lobule': {
    name: 'Lóbulo semilunar superior',
    short: 'Parte do hemisfério cerebelar.',
    anatomy:
      'Lóbulo da superfície do hemisfério cerebelar. O cerebelo fica na fossa posterior, dorsal ao tronco e ao quarto ventrículo.',
    function:
      'Os hemisférios cerebelares integram sinais de movimento e ajudam no ajuste fino, na temporização e na aprendizagem motora.',
    clinic:
      'Lesões hemisféricas podem produzir dismetria e tremor de intenção, geralmente ipsilaterais. Teste dedo-nariz e calcanhar-joelho.',
    imaging:
      'Na RM da fossa posterior, observe a simetria dos hemisférios e sua relação com o vermis, os pedúnculos e o quarto ventrículo.',
    reference: 'exam',
  },
  'lateral-ventricle': {
    name: 'Ventrículo lateral',
    short: 'Cavidade com líquido cefalorraquidiano no hemisfério.',
    anatomy:
      'Tem cornos frontal, occipital e temporal, corpo e átrio. Comunica-se com o terceiro ventrículo pelo forame interventricular.',
    function:
      'Os plexos coroides produzem grande parte do líquor. O fluido segue ao terceiro ventrículo, aqueduto, quarto ventrículo e espaço subaracnóideo.',
    clinic:
      'A dilatação ventricular deve ser interpretada em relação aos sulcos, à presença de possíveis pontos de obstrução e ao contexto clínico.',
    imaging:
      'Em TC ou RM axial, compare cornos frontais e temporais. Em RM, siga a comunicação na linha média nos cortes coronais e sagitais.',
    reference: 'circulation',
  },
  'third-ventricle': {
    name: 'Terceiro ventrículo',
    short: 'Canal mediano entre os ventrículos laterais e o aqueduto.',
    anatomy:
      'Fenda mediana no diencéfalo. Tálamo e hipotálamo compõem grande parte de suas paredes laterais.',
    function:
      'Recebe o líquor dos ventrículos laterais pelos forames interventriculares e o envia ao quarto ventrículo pelo aqueduto cerebral.',
    clinic:
      'O padrão de dilatação dos ventrículos a montante pode indicar o nível de uma obstrução à circulação do líquor.',
    imaging:
      'A RM sagital mediana permite seguir a cavidade até o aqueduto. Cortes axiais mostram a relação com os tálamos.',
    reference: 'circulation',
  },
  'fourth-ventricle': {
    name: 'Quarto ventrículo',
    short: 'Conecta o aqueduto ao espaço subaracnóideo.',
    anatomy:
      'Entre ponte e bulbo dorsalmente expostos em seu assoalho e cerebelo posteriormente. Possui uma abertura mediana e duas laterais para o espaço subaracnóideo.',
    function:
      'Recebe líquor do aqueduto e permite sua passagem às cisternas ao redor do tronco e do cerebelo.',
    clinic:
      'Massas da fossa posterior podem deslocar ou comprimir a cavidade e contribuir para hidrocefalia obstrutiva.',
    imaging:
      'Em RM sagital, observe o formato e a continuidade com o aqueduto. Em axial, compare a simetria da fossa posterior.',
    reference: 'circulation',
  },
};

const landmarks = new Set([
  'right-atrium',
  'left-atrium',
  'right-ventricle',
  'left-ventricle',
  'ascending-aorta',
  'pulmonary-trunk',
  'superior-vena-cava',
  'anterior-interventricular-artery',
  'middle-frontal-gyrus',
  'precentral-gyrus',
  'postcentral-gyrus',
  'middle-temporal-gyrus',
  'occipital-pole',
  'superior-semilunar-lobule',
  'pons',
]);

export function chamberOrBrainMarkers(id: string) {
  return landmarks.has(id) || landmarks.has(id.replace(/-(left|right)$/, ''));
}

function baseId(id: string) {
  return id.split('@')[0].replace(/^heart-(?=left-|right-)/, '');
}

export function getAnatomyDetail(id: string) {
  const base = baseId(id);
  if (base.startsWith('cerebr') && ['cerebr', 'cerebrum'].includes(base))
    return anatomyDetails.cerebrum;
  return (
    anatomyDetails[base] ?? anatomyDetails[base.replace(/-(left|right)$/, '')]
  );
}

const vesselByMesh = new Map(
  vessels.flatMap((vessel) =>
    vessel.geometryIds.map((id) => [id, vessel] as const),
  ),
);

export function anatomyVessel(sourceId: string) {
  const vessel = vesselByMesh.get(sourceId);
  if (!vessel) return undefined;
  return {
    ...vessel,
    parentVessel: vessels.find((item) => item.id === vessel.parent),
    branches: vessels.filter((item) => item.parent === vessel.id),
  };
}

export function relatedAnatomyTopics(
  id: string,
  aliases: readonly string[] = [],
) {
  const normalized = baseId(id).replace(/-(left|right)$/, '');
  if (!normalized) return [];
  return curriculum.modules.filter(({ structure }) => {
    if (structure === 'cerebr' && !['cerebrum', 'cerebr'].includes(normalized))
      return false;
    return [normalized, ...aliases].some(
      (alias) =>
        alias === structure ||
        alias.startsWith(structure + '-') ||
        alias.endsWith('-' + structure),
    );
  });
}

export function anatomyDisplayName(
  id: string,
  fallback: string,
  sourceId?: string,
) {
  const base = baseId(id);
  const detail = getAnatomyDetail(id);
  const vessel = sourceId ? vesselByMesh.get(sourceId) : undefined;
  const name = detail?.name ?? vessel?.name;
  if (!name) return fallback;
  if (Object.hasOwn(anatomyDetails, base) || !/-(left|right)$/.test(base))
    return name;
  return (
    name + (base.endsWith('-left') ? ' · lado esquerdo' : ' · lado direito')
  );
}
