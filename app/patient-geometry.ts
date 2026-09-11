import type { DicomSeries, DicomSlice } from './dicom';

export type Point3 = [number, number, number];
export type SliceFrame = {
  origin: Point3;
  rowDirection: Point3;
  columnDirection: Point3;
  normal: Point3;
  rowSpacing: number;
  columnSpacing: number;
};

const add = (a: Point3, b: Point3): Point3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Point3, amount: number): Point3 => [a[0] * amount, a[1] * amount, a[2] * amount];
const dot = (a: Point3, b: Point3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const length = (a: Point3) => Math.hypot(...a);
const unit = (a: Point3): Point3 | undefined => { const n = length(a); return n > 0 ? scale(a, 1 / n) : undefined; };

/** DICOM's Image Position is the centre of pixel (row 0, column 0). */
export function sliceFrame(slice: DicomSlice): SliceFrame | undefined {
  if (!slice.position || !slice.orientation || !slice.pixelSpacing) return undefined;
  if (![...slice.position, ...slice.orientation, ...slice.pixelSpacing].every(Number.isFinite) || !Number.isInteger(slice.rows) || !Number.isInteger(slice.columns) || slice.rows < 1 || slice.columns < 1) return undefined;
  const rawRow: Point3 = [slice.orientation[0], slice.orientation[1], slice.orientation[2]];
  const rawColumn: Point3 = [slice.orientation[3], slice.orientation[4], slice.orientation[5]];
  if (Math.abs(length(rawRow) - 1) > 0.01 || Math.abs(length(rawColumn) - 1) > 0.01 || Math.abs(dot(rawRow, rawColumn)) > 0.001) return undefined;
  const rowDirection = unit(rawRow);
  const columnDirection = unit(rawColumn);
  if (!rowDirection || !columnDirection || Math.abs(dot(rowDirection, columnDirection)) > 0.001) return undefined;
  const normal = unit([
    rowDirection[1] * columnDirection[2] - rowDirection[2] * columnDirection[1],
    rowDirection[2] * columnDirection[0] - rowDirection[0] * columnDirection[2],
    rowDirection[0] * columnDirection[1] - rowDirection[1] * columnDirection[0],
  ]);
  if (!normal || slice.pixelSpacing[0] <= 0 || slice.pixelSpacing[1] <= 0) return undefined;
  return { origin: slice.position, rowDirection, columnDirection, normal, rowSpacing: slice.pixelSpacing[0], columnSpacing: slice.pixelSpacing[1] };
}

/** Returns the LPS location of a pixel centre using the DICOM affine. */
export function pixelCenter(slice: DicomSlice, row: number, column: number): Point3 | undefined {
  const frame = sliceFrame(slice);
  if (!frame || row < 0 || column < 0 || row >= slice.rows || column >= slice.columns) return undefined;
  return add(add(frame.origin, scale(frame.rowDirection, column * frame.columnSpacing)), scale(frame.columnDirection, row * frame.rowSpacing));
}

/** Four outer image bounds. Half-spacing is included because Image Position describes a pixel centre. */
export function sliceCorners(slice: DicomSlice): [Point3, Point3, Point3, Point3] | undefined {
  const frame = sliceFrame(slice);
  if (!frame) return undefined;
  const topLeft = add(add(frame.origin, scale(frame.rowDirection, -frame.columnSpacing / 2)), scale(frame.columnDirection, -frame.rowSpacing / 2));
  const topRight = add(topLeft, scale(frame.rowDirection, slice.columns * frame.columnSpacing));
  const bottomRight = add(topRight, scale(frame.columnDirection, slice.rows * frame.rowSpacing));
  const bottomLeft = add(topLeft, scale(frame.columnDirection, slice.rows * frame.rowSpacing));
  return [topLeft, topRight, bottomRight, bottomLeft];
}

export function hasPatientGeometry(series: DicomSeries) {
  return series.slices.length > 0 && series.slices.every((slice) => !!sliceFrame(slice));
}
