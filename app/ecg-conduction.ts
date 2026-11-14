export const conductionSteps = [
  {
    id: 'sinus', label: 'Nó sinoatrial', wave: 'Início da onda P',
    detail: 'O impulso nasce na parte superior do átrio direito, junto à entrada da veia cava superior.',
  },
  {
    id: 'atria', label: 'Átrios', wave: 'Onda P',
    detail: 'A ativação se espalha pelo miocárdio dos dois átrios e chega ao nó atrioventricular.',
  },
  {
    id: 'av', label: 'Nó atrioventricular', wave: 'Segmento PR',
    detail: 'A condução desacelera no nó AV, dando tempo para o enchimento dos ventrículos. Esse atraso contribui para o intervalo PR.',
  },
  {
    id: 'his', label: 'Feixe de His', wave: 'Transição para o QRS',
    detail: 'O feixe atrioventricular conduz o impulso do nó AV até a parte superior do septo interventricular.',
  },
  {
    id: 'branches', label: 'Ramos direito e esquerdo', wave: 'Início do QRS',
    detail: 'A ativação segue pelos dois ramos ao longo do septo, em direção aos ventrículos.',
  },
  {
    id: 'purkinje', label: 'Fibras de Purkinje', wave: 'Complexo QRS',
    detail: 'A rede subendocárdica distribui rapidamente o impulso ao miocárdio ventricular. O QRS registra a despolarização ventricular.',
  },
  {
    id: 'repolarization', label: 'Repolarização ventricular', wave: 'Onda T',
    detail: 'As células ventriculares recuperam seu estado elétrico. A onda T representa essa repolarização.',
  },
] as const;

// Coordenadas esquemáticas em relação ao centro das quatro câmaras do Atlas.
// Os caminhos ramificados representam a ordem de ativação, sem escala de tempo.
const sa = [-.48, .54, .20] as const;
const av = [-.15, .12, -.03] as const;
const his = [-.06, -.045, .045] as const;
const rightApex = [-.20, -.48, .24] as const;
const leftApex = [.27, -.64, .05] as const;
type Point = readonly [number, number, number];
type Path = { step: number; points: readonly Point[] };

export const conductionPaths: readonly Path[] = [
  { step: 1, points: [sa, [-.26, .49, .09], [.12, .41, -.10], [.43, .35, -.16]] },
  { step: 1, points: [sa, [-.43, .35, .13], [-.28, .23, .03], av] },
  { step: 3, points: [av, [-.105, .042, .03], his] },
  { step: 4, points: [his, [-.14, -.25, .15], rightApex] },
  { step: 4, points: [his, [.12, -.29, .055], leftApex] },
  { step: 5, points: [rightApex, [-.37, -.28, .30], [-.48, -.11, .23]] },
  { step: 5, points: [rightApex, [-.11, -.33, .40], [.025, -.13, .33]] },
  { step: 5, points: [leftApex, [.48, -.49, .04], [.57, -.22, -.04], [.45, .04, -.05]] },
  { step: 5, points: [leftApex, [.30, -.46, -.15], [.30, -.22, -.30]] },
  { step: 5, points: [leftApex, [.40, -.43, .27], [.31, -.17, .31]] },
];

export const conductionNodes = [{ step: 0, point: sa }, { step: 2, point: av }] as const;
