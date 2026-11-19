import type { DicomSeries } from './dicom';
import {
  viewDimensions,
  viewPixelIndex,
  viewSliceIndex,
  type MprCursor,
  type MprView,
} from './mpr';
import type { Point3 } from './patient-geometry';

export type LesionMask = ReadonlyMap<number, Uint8Array>;
export type LesionSurface = {
  positions: Float32Array;
  indices: Uint32Array;
  volumeMl: number;
};
export type BrushPoint = { x: number; y: number };
export const lesionColor = '#ff9b53';
export const maxMaskBytes = 224 * 1024 * 1024;

export function brushSpacing(
  series: DicomSeries,
  view: MprView,
  stepMm: number,
) {
  const [row, column] = series.slices[0].pixelSpacing!;
  if (view === 'source') return [column, row] as const;
  return [view === 'row' ? column : row, stepMm] as const;
}

/** One copy per touched source slice, regardless of the length of the stroke. */
export function paintLesion(
  mask: LesionMask,
  series: DicomSeries,
  view: MprView,
  cursor: MprCursor,
  points: BrushPoint[],
  radiusMm: number,
  stepMm: number,
  value: 0 | 1,
): LesionMask {
  const { width, height } = viewDimensions(series, view);
  const [dx, dy] = brushSpacing(series, view, stepMm);
  const pixelsPerSlice = series.rows * series.columns;
  const next = new Map(mask);
  const edited = new Map<number, Uint8Array>();
  const stamp = (cx: number, cy: number) => {
    for (
      let y = Math.max(0, Math.ceil(cy - radiusMm / dy));
      y <= Math.min(height - 1, Math.floor(cy + radiusMm / dy));
      y++
    ) {
      const z = viewSliceIndex(view, cursor, y);
      for (
        let x = Math.max(0, Math.ceil(cx - radiusMm / dx));
        x <= Math.min(width - 1, Math.floor(cx + radiusMm / dx));
        x++
      ) {
        if (((x - cx) * dx) ** 2 + ((y - cy) * dy) ** 2 > radiusMm ** 2)
          continue;
        const pixel = viewPixelIndex(series.columns, view, cursor, x, y);
        if ((next.get(z)?.[pixel] ?? 0) === value) continue;
        let plane = edited.get(z);
        if (!plane) {
          if (!next.has(z) && (next.size + 1) * pixelsPerSlice > maxMaskBytes)
            throw new Error('A máscara excede o limite de memória local.');
          plane = mask.get(z)?.slice() ?? new Uint8Array(pixelsPerSlice);
          edited.set(z, plane);
          next.set(z, plane);
        }
        plane[pixel] = value;
      }
    }
  };
  points.forEach((point, index) => {
    const from = points[index - 1] ?? point;
    const steps = Math.max(
      1,
      Math.ceil(
        (2 * Math.hypot((point.x - from.x) * dx, (point.y - from.y) * dy)) /
          radiusMm,
      ),
    );
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      stamp(from.x + t * (point.x - from.x), from.y + t * (point.y - from.y));
    }
  });
  for (const [z, plane] of edited) if (!plane.includes(1)) next.delete(z);
  return edited.size ? next : mask;
}

export type LesionGrid = {
  rows: number;
  columns: number;
  origins: Point3[];
  columnVector: Point3;
  rowVector: Point3;
  normal: Point3;
  stepMm: number;
};

const faces = [
  {
    delta: [-1, 0, 0],
    corners: [
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
    ],
  },
  {
    delta: [1, 0, 0],
    corners: [
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
      [1, 0, 1],
    ],
  },
  {
    delta: [0, -1, 0],
    corners: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
  },
  {
    delta: [0, 1, 0],
    corners: [
      [0, 1, 0],
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
    ],
  },
  {
    delta: [0, 0, -1],
    corners: [
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
      [1, 0, 0],
    ],
  },
  {
    delta: [0, 0, 1],
    corners: [
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
    ],
  },
];

/** Boundary of the marked voxels in DICOM LPS mm, with no smoothing or downsampling. */
export function makeLesionSurface(
  grid: LesionGrid,
  mask: LesionMask,
): LesionSurface {
  const { rows, columns, origins, columnVector, rowVector, normal, stepMm } =
    grid;
  const edges = Array.from({ length: origins.length + 1 }, (_, z) => {
    if (z === 0)
      return origins[0].map(
        (value, axis) => value - (normal[axis] * stepMm) / 2,
      );
    if (z === origins.length)
      return origins[z - 1].map(
        (value, axis) => value + (normal[axis] * stepMm) / 2,
      );
    return origins[z].map((value, axis) => (value + origins[z - 1][axis]) / 2);
  });
  const positions: number[] = [],
    indices: number[] = [];
  const area = Math.hypot(...columnVector) * Math.hypot(...rowVector);
  let volumeMl = 0;
  for (const [z, plane] of mask) {
    const adjacent = [mask.get(z - 1), plane, mask.get(z + 1)];
    const voxelMl =
      (area *
        Math.abs(
          normal.reduce(
            (total, n, axis) =>
              total + n * (edges[z + 1][axis] - edges[z][axis]),
            0,
          ),
        )) /
      1000;
    for (let i = 0; i < plane.length; i++) {
      if (!plane[i]) continue;
      const x = i % columns,
        y = Math.floor(i / columns);
      volumeMl += voxelMl;
      for (const {
        delta: [dx, dy, dz],
        corners,
      } of faces) {
        const nx = x + dx,
          ny = y + dy;
        if (
          nx >= 0 &&
          nx < columns &&
          ny >= 0 &&
          ny < rows &&
          adjacent[dz + 1]?.[ny * columns + nx]
        )
          continue;
        const base = positions.length / 3;
        if (base >= 1_200_000)
          throw new Error(
            'A máscara tem detalhes demais para a superfície 3D local. Os cortes 2D continuam disponíveis.',
          );
        for (const [cx, cy, cz] of corners) {
          const origin = edges[z + cz];
          for (let axis = 0; axis < 3; axis++) {
            positions.push(
              origin[axis] +
                columnVector[axis] * (x + cx - 0.5) +
                rowVector[axis] * (y + cy - 0.5),
            );
          }
        }
        indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
    }
  }
  return {
    positions: new Float32Array(positions),
    indices: new Uint32Array(indices),
    volumeMl,
  };
}
