import type { DicomSeries, Plane } from './dicom';
import { sliceCorners, sliceFrame, type Point3 } from './patient-geometry';

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

/** A regular orthogonal voxel grid may be oblique to the patient axes. */
export function regularVolumeGrid(series: DicomSeries) {
  if (series.slices.length < 2) return null;
  const first = sliceFrame(series.slices[0]);
  if (!first) return null;
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
  return { stepMm: step, frame: first };
}

/** Patient-aligned axial, coronal and sagittal views. */
export function mprGeometry(series: DicomSeries): MprGeometry | null {
  const grid = regularVolumeGrid(series);
  if (!grid) return null;
  const { stepMm, frame: first } = grid;
  if (![first.rowDirection, first.columnDirection, first.normal].every(axisAligned)) return null;
  return { stepMm, labels: {
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

/** Carry a physical cursor only between acquisitions declared in the same patient space. */
export function correspondingCursor(from: DicomSeries, to: DicomSeries, point: readonly number[]): MprCursor | null {
  const a = from.slices[0], b = to.slices[0];
  if (!a?.studyId || !a.referenceId || a.studyId !== b?.studyId || a.referenceId !== b.referenceId ||
      point.length !== 3 || !point.every(Number.isFinite)) return null;
  const grid = regularVolumeGrid(to);
  if (!grid) return null;
  const { frame, stepMm } = grid;
  const delta = point.map((value, i) => value - frame.origin[i]);
  const projected = [dot(delta, frame.rowDirection) / frame.columnSpacing,
    dot(delta, frame.columnDirection) / frame.rowSpacing, dot(delta, frame.normal) / stepMm];
  const dimensions = [to.columns, to.rows, to.slices.length];
  if (projected.some((value, i) => value < -.5 || value >= dimensions[i] - .5)) return null;
  const [column, row, slice] = projected.map(Math.round);
  return { column, row, slice };
}

/** Outer bounds of the displayed image plane, in the patient's LPS millimetres. */
export function mprPlaneCorners(series: DicomSeries, view: MprView, slice: number, point: readonly number[] | null) {
  if (view === 'source') return series.slices[slice] && sliceCorners(series.slices[slice]);
  const grid = regularVolumeGrid(series);
  if (!grid || !point || point.length !== 3 || !point.every(Number.isFinite)) return undefined;
  const { frame, stepMm } = grid;
  const isRow = view === 'row';
  const across = isRow ? frame.rowDirection : frame.columnDirection;
  const fixed = isRow ? frame.columnDirection : frame.rowDirection;
  const spacing = isRow ? frame.columnSpacing : frame.rowSpacing;
  const width = isRow ? series.columns : series.rows;
  const offset = dot(fixed, point.map((value, axis) => value - frame.origin[axis]));
  const at = (u: number, z: number): Point3 => frame.origin.map((value, axis) =>
    value + across[axis] * u * spacing + fixed[axis] * offset + frame.normal[axis] * z * stepMm,
  ) as Point3;
  return [at(-.5, -.5), at(width - .5, -.5), at(width - .5, series.slices.length - .5), at(-.5, series.slices.length - .5)];
}

export function viewSliceIndex(view: MprView, cursor: MprCursor, y: number) {
  return view === 'source' ? cursor.slice : y;
}

export function viewPixelIndex(columns: number, view: MprView, cursor: MprCursor, x: number, y: number) {
  const row = view === 'source' ? y : view === 'row' ? cursor.row : x;
  const column = view === 'source' ? x : view === 'row' ? x : cursor.column;
  return row * columns + column;
}

export function viewVoxel(series: DicomSeries, view: MprView, cursor: MprCursor, x: number, y: number) {
  const image = series.slices[viewSliceIndex(view, cursor, y)];
  return image.pixels[viewPixelIndex(image.columns, view, cursor, x, y)] * image.slope + image.intercept;
}

export function cursorFromView(series: DicomSeries, view: MprView, current: MprCursor, x: number, y: number): MprCursor {
  const size = viewDimensions(series, view);
  const px = Math.max(0, Math.min(size.width - 1, Math.floor(x * size.width)));
  const py = Math.max(0, Math.min(size.height - 1, Math.floor(y * size.height)));
  if (view === 'source') return { ...current, column: px, row: py };
  if (view === 'row') return { ...current, column: px, slice: py };
  return { ...current, row: px, slice: py };
}
