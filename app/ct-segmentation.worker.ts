import { segmentCt } from './ct-segmentation';
import type { DicomSeries } from './dicom';
self.onmessage = (event: MessageEvent<{series: DicomSeries; threshold: number}>) => {
  try {
    const surface = segmentCt(event.data.series, event.data.threshold);
    self.postMessage({surface}, {transfer: [surface.positions.buffer, surface.indices.buffer]});
  } catch (error) {
    self.postMessage({error: error instanceof Error ? error.message : 'Não foi possível gerar a superfície.'});
  }
};
