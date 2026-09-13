import type { DicomSeries, DicomSlice } from './dicom';

const MAX_DIMENSION = 128;
const MAX_TRIANGLES = 1_000_000;
const EPSILON = 1e-4;
type Vector = [number, number, number];
type Eligibility = { eligible: true; row: Vector; column: Vector; normal: Vector; step: number } | { eligible: false; reason: string };

const dot = (a: Vector, b: Vector) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: Vector, b: Vector): Vector => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const magnitude = (a: Vector) => Math.hypot(...a);
const close = (a: number, b: number) => Math.abs(a - b) <= Math.max(EPSILON, Math.abs(b) * 1e-3);

function frame(slice: DicomSlice) {
  if (!slice.position || !slice.orientation || !slice.pixelSpacing || ![...slice.position, ...slice.orientation, ...slice.pixelSpacing].every(Number.isFinite)) return undefined;
  const row: Vector = [slice.orientation[0], slice.orientation[1], slice.orientation[2]];
  const column: Vector = [slice.orientation[3], slice.orientation[4], slice.orientation[5]];
  if (!slice.rows || !slice.columns || !Number.isInteger(slice.rows) || !Number.isInteger(slice.columns) || slice.pixelSpacing[0] <= 0 || slice.pixelSpacing[1] <= 0 || Math.abs(magnitude(row) - 1) > 0.01 || Math.abs(magnitude(column) - 1) > 0.01 || Math.abs(dot(row, column)) > 0.001) return undefined;
  const normal: Vector = [row[1] * column[2] - row[2] * column[1], row[2] * column[0] - row[0] * column[2], row[0] * column[1] - row[1] * column[0]];
  if (Math.abs(magnitude(normal) - 1) > 0.01) return undefined;
  return { row, column, normal };
}

/** Checks the geometry needed to make a physical (LPS) CT surface. */
export function validateCtSegmentation(series: DicomSeries): { eligible: boolean; reason?: string } {
  const result = eligibility(series);
  return result.eligible ? { eligible: true } : result;
}

function eligibility(series: DicomSeries): Eligibility {
  if (series.modality !== 'CT') return { eligible: false, reason: 'A segmentação local por limiar requer uma série CT.' };
  if (series.slices.length < 3) return { eligible: false, reason: 'São necessários pelo menos três cortes CT.' };
  const first = series.slices[0], base = frame(first);
  if (!base) return { eligible: false, reason: 'A série não possui posição, orientação e espaçamento de pixel válidos.' };
  let step = 0;
  for (let index = 0; index < series.slices.length; index++) {
    const slice = series.slices[index], current = frame(slice);
    if (!current || slice.rows !== first.rows || slice.columns !== first.columns || !close(slice.pixelSpacing![0], first.pixelSpacing![0]) || !close(slice.pixelSpacing![1], first.pixelSpacing![1]) || dot(base.row, current.row) < 0.9999 || dot(base.column, current.column) < 0.9999 || slice.pixels.length !== first.rows * first.columns) return { eligible: false, reason: 'Os cortes não têm a mesma grade física e orientação.' };
    if (index === 0) continue;
    const delta = sub(slice.position!, series.slices[index - 1].position!);
    const projected = dot(delta, base.normal);
    const inPlane: Vector = [delta[0] - projected * base.normal[0], delta[1] - projected * base.normal[1], delta[2] - projected * base.normal[2]];
    if (!Number.isFinite(projected) || Math.abs(projected) < EPSILON || magnitude(inPlane) > Math.max(EPSILON, Math.abs(projected) * 1e-3)) return { eligible: false, reason: 'A pilha possui deslocamento no plano ou espaçamento inválido.' };
    if (index === 1) step = projected;
    else if (!close(projected, step)) return { eligible: false, reason: 'A pilha não tem espaçamento regular entre cortes.' };
  }
  return { eligible: true, ...base, step };
}

const factorFor = (size: number) => Math.ceil(size / MAX_DIMENSION);
const at = (slice: DicomSlice, row: number, column: number) => slice.pixels[row * slice.columns + column] * slice.slope + slice.intercept;

/**
 * Extracts faces surrounding voxels at or above a high-density CT threshold.
 * It is a threshold surface only: it does not identify organs or provide a diagnosis.
 */
export function segmentCt(series: DicomSeries, threshold: number): { positions: Float32Array; indices: Uint32Array; voxelCount: number; truncated: boolean } {
  if (!Number.isFinite(threshold)) throw new Error('O limiar de densidade deve ser um número finito.');
  const valid = eligibility(series);
  if (!valid.eligible) throw new Error(valid.reason);
  const { row, column, normal, step } = valid;
  const zScale = factorFor(series.slices.length), yScale = factorFor(series.rows), xScale = factorFor(series.columns);
  const depth = Math.ceil(series.slices.length / zScale), height = Math.ceil(series.rows / yScale), width = Math.ceil(series.columns / xScale);
  const filled = new Uint8Array(width * height * depth);
  const offset = (z: number, y: number, x: number) => (z * height + y) * width + x;
  let voxelCount = 0;
  for (let z = 0; z < depth; z++) for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let hit = false;
    for (let sourceZ = z * zScale; sourceZ < Math.min((z + 1) * zScale, series.slices.length) && !hit; sourceZ++)
      for (let sourceY = y * yScale; sourceY < Math.min((y + 1) * yScale, series.rows) && !hit; sourceY++)
        for (let sourceX = x * xScale; sourceX < Math.min((x + 1) * xScale, series.columns); sourceX++)
          if (at(series.slices[sourceZ], sourceY, sourceX) >= threshold) { hit = true; break; }
    if (hit) { filled[offset(z, y, x)] = 1; voxelCount++; }
  }
  const occupied = (z: number, y: number, x: number) => z >= 0 && y >= 0 && x >= 0 && z < depth && y < height && x < width && filled[offset(z, y, x)] === 1;
  let triangles = 0;
  for (let z = 0; z < depth; z++) for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (occupied(z, y, x)) {
    triangles += (!occupied(z, y, x - 1) ? 2 : 0) + (!occupied(z, y, x + 1) ? 2 : 0) + (!occupied(z, y - 1, x) ? 2 : 0) + (!occupied(z, y + 1, x) ? 2 : 0) + (!occupied(z - 1, y, x) ? 2 : 0) + (!occupied(z + 1, y, x) ? 2 : 0);
    if (triangles > MAX_TRIANGLES) throw new Error('A superfície excede o limite local de triângulos; aumente o limiar ou use uma série menor.');
  }
  const positions = new Float32Array(triangles * 9), indices = new Uint32Array(triangles * 3);
  const first = series.slices[0];
  const point = (x: number, y: number, z: number): Vector => [first.position![0] + row[0] * x + column[0] * y + normal[0] * z, first.position![1] + row[1] * x + column[1] * y + normal[1] * z, first.position![2] + row[2] * x + column[2] * y + normal[2] * z];
  let triangle = 0;
  const addFace = (corners: [Vector, Vector, Vector, Vector]) => {
    let vertex = triangle * 3;
    for (const order of [[0, 1, 2], [0, 2, 3]]) for (const cornerIndex of order) {
      const p = corners[cornerIndex];
      positions[vertex * 3] = p[0]; positions[vertex * 3 + 1] = p[1]; positions[vertex * 3 + 2] = p[2];
      indices[vertex] = vertex;
      vertex++;
    }
    triangle += 2;
  };
  for (let z = 0; z < depth; z++) for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (occupied(z, y, x)) {
    const x0 = (x * xScale - .5) * first.pixelSpacing![1], x1 = (Math.min((x + 1) * xScale, series.columns) - .5) * first.pixelSpacing![1];
    const y0 = (y * yScale - .5) * first.pixelSpacing![0], y1 = (Math.min((y + 1) * yScale, series.rows) - .5) * first.pixelSpacing![0];
    const z0 = (z * zScale - .5) * step, z1 = (Math.min((z + 1) * zScale, series.slices.length) - .5) * step;
    const p000 = point(x0, y0, z0), p100 = point(x1, y0, z0), p110 = point(x1, y1, z0), p010 = point(x0, y1, z0), p001 = point(x0, y0, z1), p101 = point(x1, y0, z1), p111 = point(x1, y1, z1), p011 = point(x0, y1, z1);
    if (!occupied(z, y, x - 1)) addFace([p000, p010, p011, p001]);
    if (!occupied(z, y, x + 1)) addFace([p100, p101, p111, p110]);
    if (!occupied(z, y - 1, x)) addFace([p000, p001, p101, p100]);
    if (!occupied(z, y + 1, x)) addFace([p010, p110, p111, p011]);
    if (!occupied(z - 1, y, x)) addFace([p000, p100, p110, p010]);
    if (!occupied(z + 1, y, x)) addFace([p001, p011, p111, p101]);
  }
  return { positions, indices, voxelCount, truncated: false };
}
