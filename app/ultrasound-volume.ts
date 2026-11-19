import {
  parseUltrasoundVolumeFrames,
  sortSeries,
  type DicomSeries,
  type DicomSlice,
} from './dicom';
import { regularVolumeGrid } from './mpr';

export type UltrasoundPhase = { series: DicomSeries; time: number };

/** Validate a Cartesian Enhanced US acquisition before sharing a cursor across phases. */
export function readUltrasoundVolume(bytes: Uint8Array): UltrasoundPhase[] {
  const frames = parseUltrasoundVolumeFrames(bytes);
  const allTimed = frames.every(
    (frame) => frame.volumeTimeSeconds !== undefined,
  );
  if (
    !allTimed &&
    frames.some((frame) => frame.volumeTimeSeconds !== undefined)
  )
    throw new Error(
      'O exame contém quadros com marcações de tempo incompletas.',
    );
  const timeGroups = new Map<number, DicomSlice[]>();
  for (const frame of frames) {
    const time = frame.volumeTimeSeconds ?? 0;
    const group = timeGroups.get(time) ?? [];
    group.push(frame);
    timeGroups.set(time, group);
  }
  if (timeGroups.size > 160)
    throw new Error('A série excede o limite local de 160 fases.');
  const phases = [...timeGroups]
    .sort(([a], [b]) => a - b)
    .map(([time, slices], index) => {
      const first = slices[0];
      const series: DicomSeries = {
        id: `eco-${index}`,
        modality: 'US',
        rows: first.rows,
        columns: first.columns,
        plane: null,
        slices: sortSeries(slices),
      };
      const grid = regularVolumeGrid(series);
      if (!grid)
        throw new Error(
          'Cada fase precisa conter dois ou mais cortes paralelos com grade cartesiana regular e espaçamento válido.',
        );
      return { series, time, grid };
    });
  const base = phases[0];
  const equal = (
    a: readonly number[],
    b: readonly number[],
    tolerance: number,
  ) => a.every((value, index) => Math.abs(value - b[index]) <= tolerance);
  for (const phase of phases) {
    if (
      phase.series.slices.length !== base.series.slices.length ||
      Math.abs(phase.grid.stepMm - base.grid.stepMm) >
        base.grid.stepMm * 0.001 ||
      phase.series.slices.some((slice, i) => {
        const reference = base.series.slices[i];
        return (
          !equal(slice.position!, reference.position!, 0.001) ||
          !equal(slice.orientation!, reference.orientation!, 0.0001) ||
          !equal(slice.pixelSpacing!, reference.pixelSpacing!, 0.001)
        );
      })
    )
      throw new Error(
        'As fases têm posições ou espaçamentos diferentes. Abra um volume com a mesma grade em todo o ciclo.',
      );
  }
  return phases.map(({ series, time }) => ({ series, time: time - base.time }));
}
