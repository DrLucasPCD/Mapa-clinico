import {
  makeLesionSurface,
  type LesionGrid,
  type LesionMask,
} from './lesion-mask';

self.onmessage = (
  event: MessageEvent<{ grid: LesionGrid; mask: LesionMask }>,
) => {
  try {
    const surface = makeLesionSurface(event.data.grid, event.data.mask);
    self.postMessage(
      { surface },
      { transfer: [surface.positions.buffer, surface.indices.buffer] },
    );
  } catch (error) {
    self.postMessage({
      error:
        error instanceof Error
          ? error.message
          : 'Falha ao gerar a superfície da lesão.',
    });
  }
};
