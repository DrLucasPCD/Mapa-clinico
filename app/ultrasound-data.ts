export type UltrasoundZone = 'liver' | 'gallbladder' | 'right-kidney' | 'left-kidney' | 'spleen' | 'bladder';
export type ProbePosition = { x: number; y: number };
export type UltrasoundView = { image: string; label: string; organ: string; note: string; source: string; author: string; imageId: number };

export const ultrasoundZones: Record<UltrasoundZone, { label: string; x: number; y: number; radius: number; system: string; atlasId: string; views: UltrasoundView[] }> = {
  liver: { label: 'Fígado', x: .38, y: .35, radius: .14, system: 'digestive', atlasId: 'liver', views: [
    { image: '/ultrasound/58956756.jpg', label: 'Parênquima hepático', organ: 'Fígado', note: 'Avalie ecotextura e contorno; o quadro original também mostra alças intestinais.', source: 'https://radiopaedia.org/cases/148000', author: 'Dennis Odhiambo Agolah', imageId: 58956756 },
    { image: '/ultrasound/58956757.jpg', label: 'Região portal', organ: 'Fígado e veia porta', note: 'Compare a veia porta e os vasos hepáticos nas vistas documentadas.', source: 'https://radiopaedia.org/cases/148000', author: 'Dennis Odhiambo Agolah', imageId: 58956757 },
  ] },
  gallbladder: { label: 'Vesícula biliar', x: .43, y: .45, radius: .085, system: 'digestive', atlasId: 'gallbladder', views: [
    { image: '/ultrasound/5834137.jpg', label: 'Vesícula · vista 1', organ: 'Vesícula biliar', note: 'Cálculos ecogênicos com sombra acústica posterior no caso original.', source: 'https://radiopaedia.org/cases/27525', author: 'Andrew Dixon', imageId: 5834137 },
    { image: '/ultrasound/5834145.jpg', label: 'Vesícula · vista 2', organ: 'Vesícula biliar', note: 'Outra vista documentada da mesma vesícula, com cálculos e sombra acústica.', source: 'https://radiopaedia.org/cases/27525', author: 'Andrew Dixon', imageId: 5834145 },
  ] },
  'right-kidney': { label: 'Rim direito', x: .27, y: .57, radius: .105, system: 'urinary', atlasId: 'kidneys', views: [
    { image: '/ultrasound/58956762.jpg', label: 'Rins · comparação', organ: 'Rim direito', note: 'O quadro original compara os dois rins. Observe córtex e seio renal.', source: 'https://radiopaedia.org/cases/148000', author: 'Dennis Odhiambo Agolah', imageId: 58956762 },
    { image: '/ultrasound/58956763.jpg', label: 'Rins · outra vista', organ: 'Rim direito', note: 'Outra vista bilateral documentada; não representa um corte contínuo da primeira.', source: 'https://radiopaedia.org/cases/148000', author: 'Dennis Odhiambo Agolah', imageId: 58956763 },
  ] },
  'left-kidney': { label: 'Rim esquerdo', x: .72, y: .57, radius: .105, system: 'urinary', atlasId: 'kidneys', views: [
    { image: '/ultrasound/58956763.jpg', label: 'Rins · comparação', organ: 'Rim esquerdo', note: 'O rim esquerdo aparece no painel direito do quadro original.', source: 'https://radiopaedia.org/cases/148000', author: 'Dennis Odhiambo Agolah', imageId: 58956763 },
    { image: '/ultrasound/58956762.jpg', label: 'Rins · outra vista', organ: 'Rim esquerdo', note: 'Outra vista bilateral documentada; não representa um corte contínuo da primeira.', source: 'https://radiopaedia.org/cases/148000', author: 'Dennis Odhiambo Agolah', imageId: 58956762 },
  ] },
  spleen: { label: 'Baço', x: .72, y: .36, radius: .12, system: 'digestive', atlasId: 'spleen', views: [
    { image: '/ultrasound/58957335.jpg', label: 'Baço', organ: 'Baço', note: 'Vista esplênica real. Este caso não fornece outra angulação documentada para esta região.', source: 'https://radiopaedia.org/cases/148000', author: 'Dennis Odhiambo Agolah', imageId: 58957335 },
  ] },
  bladder: { label: 'Bexiga', x: .5, y: .79, radius: .13, system: 'urinary', atlasId: 'bladder', views: [
    { image: '/ultrasound/58956767.jpg', label: 'Bexiga · sagital e transversal', organ: 'Bexiga urinária', note: 'O quadro original mostra duas orientações lado a lado.', source: 'https://radiopaedia.org/cases/148000', author: 'Dennis Odhiambo Agolah', imageId: 58956767 },
  ] },
};

export const ultrasoundZoneOrder: UltrasoundZone[] = ['liver', 'gallbladder', 'right-kidney', 'left-kidney', 'spleen', 'bladder'];

export type UltrasoundCaseId = '148000' | '27525' | '64279';
export const ultrasoundCases: Record<UltrasoundCaseId, { title: string; description: string; author: string; source: string; zoneViews: Partial<Record<UltrasoundZone, UltrasoundView[]>> }> = {
  '148000': {
    title: 'Abdome superior normal', description: 'Fígado, vesícula, rins, baço e bexiga em imagens selecionadas.', author: 'Dennis Odhiambo Agolah', source: 'https://radiopaedia.org/cases/148000',
    zoneViews: {
      liver: ultrasoundZones.liver.views,
      gallbladder: [{ image: '/ultrasound/58956759.jpg', label: 'Vesícula sem cálculos', organ: 'Vesícula biliar', note: 'O quadro original mostra vesícula e pâncreas lado a lado.', source: 'https://radiopaedia.org/cases/148000', author: 'Dennis Odhiambo Agolah', imageId: 58956759 }],
      'right-kidney': ultrasoundZones['right-kidney'].views,
      'left-kidney': ultrasoundZones['left-kidney'].views,
      spleen: ultrasoundZones.spleen.views,
      bladder: ultrasoundZones.bladder.views,
    },
  },
  '27525': { title: 'Colelitíase e sombra acústica', description: 'Duas vistas reais de cálculos na vesícula.', author: 'Andrew Dixon', source: 'https://radiopaedia.org/cases/27525', zoneViews: { gallbladder: ultrasoundZones.gallbladder.views } },
  '64279': { title: 'FAST normal', description: 'Janelas hepatorrenal e pélvica selecionadas de um exame FAST.', author: 'David Carroll', source: 'https://radiopaedia.org/cases/64279', zoneViews: {
    liver: [{ image: '/ultrasound/43769767.jpg', label: 'Janela hepatorrenal', organ: 'Fígado e rim direito', note: 'Vista do quadrante superior direito deste exame FAST. O estudo original é descrito como tecnicamente limitado.', source: 'https://radiopaedia.org/cases/64279', author: 'David Carroll', imageId: 43769767 }],
    'right-kidney': [{ image: '/ultrasound/43769767.jpg', label: 'Janela hepatorrenal', organ: 'Fígado e rim direito', note: 'Inspecione o espaço hepatorrenal para líquido livre; esta é uma imagem selecionada, não um cine contínuo.', source: 'https://radiopaedia.org/cases/64279', author: 'David Carroll', imageId: 43769767 }],
    bladder: [{ image: '/ultrasound/43769759.jpg', label: 'Janela pélvica', organ: 'Bexiga e pelve', note: 'Vista pélvica selecionada. O caso original comenta a preferência pela orientação transversal.', source: 'https://radiopaedia.org/cases/64279', author: 'David Carroll', imageId: 43769759 }],
  } },
};
export const ultrasoundCaseOrder: UltrasoundCaseId[] = ['148000', '27525', '64279'];

/** Hotspots are schematic surface windows, not patient-registered coordinates. */
export function ultrasoundZoneAt(point: ProbePosition, caseId: UltrasoundCaseId): UltrasoundZone | null {
  let found: UltrasoundZone | null = null;
  let nearest = Infinity;
  for (const id of ultrasoundZoneOrder) {
    if (!ultrasoundCases[caseId].zoneViews[id]?.length) continue;
    const zone = ultrasoundZones[id];
    const distance = Math.hypot((point.x - zone.x) / zone.radius, (point.y - zone.y) / zone.radius);
    if (distance <= 1 && distance < nearest) { found = id; nearest = distance; }
  }
  return found;
}

export function ultrasoundViewFor(caseId: UltrasoundCaseId, zone: UltrasoundZone | null, angle: number): UltrasoundView | null {
  if (!zone) return null;
  const views = ultrasoundCases[caseId].zoneViews[zone];
  if (!views?.length) return null;
  const index = Math.min(views.length - 1, Math.floor((Math.max(-90, Math.min(90, angle)) + 90) / (180 / views.length)));
  return views[index];
}
