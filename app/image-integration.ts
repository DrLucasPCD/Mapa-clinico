export type Acquisition = {
  kind: 'selected-images' | 'ordered-series' | 'dicom-series';
  files?: string[];
  seriesId?: string;
  orderVerified?: boolean;
  plane?: 'axial' | 'coronal' | 'sagital';
  region?: 'head' | 'thorax' | 'abdomen' | 'body';
  reverseAtlasDirection?: boolean;
};

export function atlasSliceForSequence(
  acquisition: Acquisition | undefined,
  index: number,
  total: number,
) {
  if (
    acquisition?.kind !== 'ordered-series' ||
    acquisition.orderVerified !== true ||
    !Number.isInteger(index) ||
    !Number.isInteger(total) ||
    total < 2
  ) return null;
  const position = Math.max(0, Math.min(total - 1, index)) / (total - 1);
  return {
    plane: acquisition.plane ?? 'axial',
    fraction: acquisition.reverseAtlasDirection ? 1 - position : position,
    region: acquisition.region ?? 'body',
  } as const;
}
/** Counts and modality alone never establish geometry or a consecutive acquisition. */
export function imageIntegration(images: readonly unknown[], acquisition?: Acquisition) {
  if (acquisition?.kind === 'dicom-series' && acquisition.files?.length && acquisition.files.every(path => /^\/radiology\/[a-zA-Z0-9/_-]+\.dcm$/.test(path))) {
    return { mode: 'dicom' as const, title: 'Série DICOM disponível', description: 'O leitor verificará as coordenadas do exame e posicionará as fatias automaticamente quando a geometria for válida.' };
  }
  if (acquisition?.kind === 'ordered-series' && acquisition.orderVerified === true && acquisition.seriesId?.trim() && images.length > 1) {
    return { mode: 'sequence' as const, title: 'Pilha navegável sincronizada', description: 'A ordem dos cortes foi verificada. O plano do Atlas acompanha a posição relativa aproximada; sem as coordenadas DICOM, não há alinhamento exato, medidas ou reconstrução multiplanar.' };
  }
  return { mode: 'reference' as const, title: 'Referência anatômica', description: images.length > 1
    ? 'Imagens selecionadas do caso. Não são uma série de cortes consecutivos e não permitem alinhamento exato ao Atlas.'
    : 'Imagem isolada sem geometria DICOM. A localização no Atlas indica apenas a região anatômica.' };
}
