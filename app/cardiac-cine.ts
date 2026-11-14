import type { DicomSeries, DicomSlice } from './dicom';
import { regularVolumeGrid } from './mpr';
import { sliceFrame } from './patient-geometry';

export type CardiacCine = {
  phases: DicomSeries[];
  frameStartsMs: number[];
  durationMs: number;
  recordedTiming: boolean;
  hasVolume: boolean;
};

const median = (values: number[]) =>
  values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
const near = (a: readonly number[], b: readonly number[], tolerance: number) =>
  Math.hypot(...a.map((value, index) => value - b[index])) <= tolerance;

export function sameCineGrid(a: DicomSeries, b: DicomSeries) {
  if (
    a.rows !== b.rows ||
    a.columns !== b.columns ||
    a.slices.length !== b.slices.length
  )
    return false;
  return a.slices.every((slice, index) => {
    const left = sliceFrame(slice);
    const right = sliceFrame(b.slices[index]);
    return (
      left &&
      right &&
      near(left.origin, right.origin, 0.05) &&
      near(left.rowDirection, right.rowDirection, 0.0001) &&
      near(left.columnDirection, right.columnDirection, 0.0001) &&
      Math.abs(left.rowSpacing - right.rowSpacing) < 0.001 &&
      Math.abs(left.columnSpacing - right.columnSpacing) < 0.001
    );
  });
}

export function cineCandidates(
  series: DicomSeries[],
  reference: DicomSeries,
  acrossSeries: boolean,
) {
  const first = reference.slices[0];
  if (
    !first ||
    !reference.cardiacPhase ||
    reference.acquisitionId === 'sem-serie'
  )
    return [];
  return series.filter((item) => {
    const slice = item.slices[0];
    if (
      !slice ||
      item.cardiacPhase?.kind !== reference.cardiacPhase?.kind ||
      item.modality !== reference.modality ||
      slice.contrastKey !== first.contrastKey ||
      slice.studyId !== first.studyId ||
      slice.referenceId !== first.referenceId
    )
      return false;
    const sameAcquisition =
      (item.acquisitionId ?? item.id) ===
      (reference.acquisitionId ?? reference.id);
    const sameStack = slice.stackId === first.stackId;
    const sharedReference =
      acrossSeries &&
      first.studyId &&
      first.referenceId &&
      reference.cardiacPhase?.kind !== 'index';
    return (
      (sameAcquisition ? sameStack : Boolean(sharedReference)) &&
      sameCineGrid(reference, item)
    );
  });
}

export function createCardiacCine(phases: DicomSeries[]): CardiacCine | null {
  if (phases.length < 2) return null;
  const kind = phases[0].cardiacPhase?.kind;
  if (
    !kind ||
    phases.some(
      (item) =>
        item.cardiacPhase?.kind !== kind || !sameCineGrid(phases[0], item),
    )
  )
    return null;
  const ordered = [...phases].sort(
    (a, b) => a.cardiacPhase!.value - b.cardiacPhase!.value,
  );
  const phaseValues = ordered.map((item) => item.cardiacPhase!.value);
  if (new Set(phaseValues).size !== ordered.length) return null;
  // Coordinates repeated within a phase commonly indicate an unresolved dimension.
  if (
    ordered.every((item) => item.slices.length > 1) &&
    ordered.some((item) =>
      item.slices.some(
        (slice, index) =>
          index > 0 &&
          near(
            slice.position ?? [],
            item.slices[index - 1].position ?? [],
            0.01,
          ),
      ),
    )
  )
    return null;
  const intervals = ordered.flatMap((item) =>
    item.slices.flatMap((slice) => slice.cardiac?.rrMs ?? []),
  );
  const rr = intervals.length ? median(intervals) : undefined;
  const span = phaseValues.at(-1)! - phaseValues[0];
  const usableInterval =
    rr && intervals.every((value) => Math.abs(value - rr) < rr * 0.15)
      ? rr
      : undefined;
  let recordedTiming = false;
  let periodMs: number | undefined;
  let timestamps: number[];
  if (kind === 'percent') {
    recordedTiming = Boolean(usableInterval);
    periodMs = usableInterval ?? 1000;
    timestamps = phaseValues.map((value) => (value / 100) * periodMs!);
  } else if (kind === 'trigger') {
    timestamps = phaseValues;
    if (usableInterval && usableInterval > span) periodMs = usableInterval;
    recordedTiming = periodMs !== undefined;
  } else {
    const step = (usableInterval ?? 1000) / (span + 1);
    timestamps = phaseValues.map((value) => value * step);
    periodMs = step * (span + 1);
  }
  const frameStartsMs = timestamps.map((value) => value - timestamps[0]);
  const gaps = frameStartsMs
    .slice(1)
    .map((time, index) => time - frameStartsMs[index]);
  const end = frameStartsMs.at(-1)!;
  const durationMs = periodMs && periodMs > end ? periodMs : end + median(gaps);
  return {
    phases: ordered,
    frameStartsMs,
    durationMs,
    recordedTiming,
    hasVolume: ordered.every((item) => Boolean(regularVolumeGrid(item))),
  };
}

export function cinePhaseAt(cine: CardiacCine, elapsedMs: number) {
  const time =
    ((elapsedMs % cine.durationMs) + cine.durationMs) % cine.durationMs;
  return Math.max(
    0,
    cine.frameStartsMs.findLastIndex((start) => start <= time),
  );
}

export function cardiacPhaseLabel(series: DicomSeries) {
  const phase = series.cardiacPhase;
  if (phase?.kind === 'percent') return phase.value + '% do ciclo';
  if (phase?.kind === 'trigger') return phase.value + ' ms após o disparo';
  if (phase?.kind === 'index') return 'Posição temporal ' + phase.value;
  return 'Fase única';
}

export function cineWindow(reference: DicomSeries) {
  const slice = reference.slices[Math.floor(reference.slices.length / 2)];
  if (slice.windowCenter !== undefined && slice.windowWidth !== undefined) {
    return { center: slice.windowCenter, width: slice.windowWidth };
  }
  let min = Infinity,
    max = -Infinity;
  const skip = Math.max(1, Math.floor(slice.pixels.length / 8192));
  for (let i = 0; i < slice.pixels.length; i += skip) {
    const raw = slice.pixels[i];
    if (slice.padding && raw >= slice.padding[0] && raw <= slice.padding[1])
      continue;
    const sample = raw * slice.slope + slice.intercept;
    min = Math.min(min, sample);
    max = Math.max(max, sample);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max))
    return { center: 0, width: 1 };
  return { center: (min + max) / 2, width: Math.max(1, max - min) };
}

export function pixelVelocity(slice: DicomSlice, row: number, col: number) {
  const mapping = slice.velocity;
  if (
    !mapping ||
    row < 0 ||
    row >= slice.rows ||
    col < 0 ||
    col >= slice.columns
  )
    return null;
  const raw = slice.pixels[row * slice.columns + col];
  if (
    !Number.isFinite(raw) ||
    raw < mapping.first ||
    raw > mapping.last ||
    (slice.padding && raw >= slice.padding[0] && raw <= slice.padding[1])
  )
    return null;
  const velocity = raw * mapping.slopeCmPerSec + mapping.interceptCmPerSec;
  return Number.isFinite(velocity) ? velocity : null;
}

export function throughPlaneVelocity(slice: DicomSlice) {
  const normal = sliceFrame(slice)?.normal;
  const direction = slice.velocity?.direction;
  if (!normal || !direction) return false;
  const dot =
    normal.reduce((sum, part, i) => sum + part * direction[i], 0) /
    Math.hypot(...direction);
  return Math.abs(dot) > 0.999;
}

export function regionFlow(
  slice: DicomSlice,
  row: number,
  column: number,
  radiusMm: number,
) {
  const frame = sliceFrame(slice);
  if (
    !frame ||
    !throughPlaneVelocity(slice) ||
    !Number.isFinite(radiusMm) ||
    radiusMm <= 0
  )
    return null;
  const colRadius = radiusMm / frame.columnSpacing;
  const rowRadius = radiusMm / frame.rowSpacing;
  if (
    row - rowRadius < -0.5 ||
    row + rowRadius > slice.rows - 0.5 ||
    column - colRadius < -0.5 ||
    column + colRadius > slice.columns - 0.5
  )
    return null;
  let sum = 0,
    pixels = 0;
  for (
    let y = Math.ceil(row - rowRadius);
    y <= Math.floor(row + rowRadius);
    y++
  ) {
    for (
      let x = Math.ceil(column - colRadius);
      x <= Math.floor(column + colRadius);
      x++
    ) {
      if (((y - row) / rowRadius) ** 2 + ((x - column) / colRadius) ** 2 > 1)
        continue;
      const velocity = pixelVelocity(slice, y, x);
      if (velocity === null) return null;
      sum += velocity;
      pixels++;
    }
  }
  // (cm/s) × (mm² ÷ 100) gives cm³/s, or mL/s.
  return pixels ? (sum * frame.rowSpacing * frame.columnSpacing) / 100 : null;
}
