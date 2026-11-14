import type { DicomSeries } from './dicom';
import { regularVolumeGrid } from './mpr';

type Point = [number, number, number];
export type VolumeData = {
  dims: Point;
  values: Uint8Array;
  minimum: number;
  maximum: number;
  origin: Point;
  edges: [Point, Point, Point];
};

export function volumeCoordinate(
  volume: Pick<VolumeData, 'origin' | 'edges'>,
  point: readonly number[],
): Point {
  return volume.edges.map((edge) => {
    const lengthSquared = edge.reduce((sum, value) => sum + value * value, 0);
    return (
      edge.reduce(
        (sum, value, idx) => sum + (point[idx] - volume.origin[idx]) * value,
        0,
      ) / lengthSquared
    );
  }) as Point;
}

export function makeVolumeData(
  series: DicomSeries,
  cap = 144,
): VolumeData | null {
  const grid = regularVolumeGrid(series);
  if (!grid) return null;
  const { frame } = grid;
  const source: Point = [series.columns, series.rows, series.slices.length];
  const dims = source.map((n) => Math.min(n, cap)) as Point;
  const [width, height, depth] = dims;
  const samples = new Float32Array(width * height * depth);
  const mapIndex = (d: number, n: number, out: number) =>
    Math.min(n - 1, Math.floor(((d + 0.5) / out) * n));
  let min = Infinity,
    max = -Infinity;
  for (let z = 0, index = 0; z < depth; z++) {
    const slice = series.slices[mapIndex(z, source[2], depth)];
    for (let y = 0; y < height; y++) {
      const base = mapIndex(y, source[1], height) * source[0];
      for (let x = 0; x < width; x++, index++) {
        const intensity =
          slice.pixels[base + mapIndex(x, source[0], width)] * slice.slope +
          slice.intercept;
        samples[index] = Number.isFinite(intensity) ? intensity : 0;
        min = Math.min(min, samples[index]);
        max = Math.max(max, samples[index]);
      }
    }
  }
  // Encode a linear range in two channels. Linear filtering preserves decoded interpolation.
  const minimum = series.modality === 'CT' ? Math.min(-1024, min) : min;
  const maximum = Math.max(
    minimum + 1,
    series.modality === 'CT' ? Math.max(max, 2000) : max,
  );
  const values = new Uint8Array(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const value = Math.round(
      ((samples[i] - minimum) / (maximum - minimum)) * 65535,
    );
    values[2 * i] = value >> 8;
    values[2 * i + 1] = value & 255;
  }
  const sizes = [frame.columnSpacing, frame.rowSpacing, grid.stepMm];
  const directions = [frame.rowDirection, frame.columnDirection, frame.normal];
  const origin = frame.origin.map(
    (value, axis) =>
      value -
      directions.reduce(
        (offset, dir, i) => offset + (dir[axis] * sizes[i]) / 2,
        0,
      ),
  ) as Point;
  const edges = directions.map(
    (dir, i) => dir.map((value) => value * source[i] * sizes[i]) as Point,
  ) as VolumeData['edges'];
  return { dims, values, minimum, maximum, origin, edges };
}
