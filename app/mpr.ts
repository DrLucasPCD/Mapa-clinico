import type { DicomSeries, Plane } from './dicom';
import { sliceFrame } from './patient-geometry';

export type MprCursor = { column: number; row: number; slice: number };
export type MprView = 'source' | 'row' | 'column';
export type MprGeometry = {
  stepMm: number;
  labels: Record<MprView, Plane>;
};

const dot = (a: readonly number[], b: readonly number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function labelForNormal(normal: readonly number[]): Plane {
  const axis = normal.map(Math.abs).reduce((best, value, index, values) => value > values[best] ? index : best, 0);
  return axis === 2 ? 'axial' : axis === 1 ? 'coronal' : 'sagital';
}

const axisAligned = (direction: readonly number[]) => Math.max(...direction.map(Math.abs)) > .9999;

/** Validates a rectilinear stack suitable for orthogonal nearest-neighbour MPR. */
export function mprGeometry(series: DicomSeries): MprGeometry | null {
  if (series.slices.length < 2) return null;
  const first = sliceFrame(series.slices[0]);
  if (!first) return null;
  if (![first.rowDirection, first.columnDirection, first.normal].every(axisAligned)) return null;
  let step = 0;
  for (let index = 0; index < series.slices.length; index++) {
    const current = sliceFrame(series.slices[index]);
    if (!current || series.slices[index].rows !== series.rows || series.slices[index].columns !== series.columns ||
      Math.abs(current.rowSpacing - first.rowSpacing) > 1e-3 || Math.abs(current.columnSpacing - first.columnSpacing) > 1e-3 ||
      dot(current.rowDirection, first.rowDirection) < .9999 || dot(current.columnDirection, first.columnDirection) < .9999) return null;
    if (!index) continue;
    const previous = sliceFrame(series.slices[index - 1])!;
    const delta = current.origin.map((value, axis) => value - previous.origin[axis]);
    const projected = dot(delta, first.normal);
    const inPlane2 = delta.reduce((sum, value, axis) => sum + (value - projected * first.normal[axis]) ** 2, 0);
    if (!(projected > 0) || inPlane2 > Math.max(1e-8, projected ** 2 * 1e-6)) return null;
    if (index === 1) step = projected;
    else if (Math.abs(projected - step) > Math.max(1e-3, step * 1e-3)) return null;
  }
  return { stepMm: step, labels: {
    source: labelForNormal(first.normal),
    row: labelForNormal(first.columnDirection),
    column: labelForNormal(first.rowDirection),
  }};
}

export function viewDimensions(series: DicomSeries, view: MprView) {
  if (view === 'source') return { width: series.columns, height: series.rows };
  if (view === 'row') return { width: series.columns, height: series.slices.length };
  return { width: series.rows, height: series.slices.length };
}

export function viewVoxel(series: DicomSeries, view: MprView, cursor: MprCursor, x: number, y: number) {
  const slice = view === 'source' ? cursor.slice : y;
  const row = view === 'source' ? y : view === 'row' ? cursor.row : x;
  const column = view === 'source' ? x : view === 'row' ? x : cursor.column;
  const image = series.slices[slice];
  return image.pixels[row * image.columns + column] * image.slope + image.intercept;
}

export function cursorFromView(series: DicomSeries, view: MprView, current: MprCursor, x: number, y: number): MprCursor {
  const size = viewDimensions(series, view);
  const px = Math.max(0, Math.min(size.width - 1, Math.floor(x * size.width)));
  const py = Math.max(0, Math.min(size.height - 1, Math.floor(y * size.height)));
  if (view === 'source') return { ...current, column: px, row: py };
  if (view === 'row') return { ...current, column: px, slice: py };
  return { ...current, row: px, slice: py };
}
