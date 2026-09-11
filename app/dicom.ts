import { parseDicom, type DataSet } from 'dicom-parser';

export type Plane = 'axial' | 'coronal' | 'sagital';
export type Region = 'head' | 'thorax' | 'abdomen' | 'body';

export type DicomSlice = {
  seriesId: string;
  modality: 'CT' | 'MR';
  rows: number;
  columns: number;
  pixels: Int16Array | Float32Array;
  slope: number;
  intercept: number;
  windowCenter?: number;
  windowWidth?: number;
  invert: boolean;
  position?: [number, number, number];
  orientation?: [number, number, number, number, number, number];
  /** DICOM Pixel Spacing: row spacing, then column spacing, in millimetres. */
  pixelSpacing?: [number, number];
  instance?: number;
  sourceName: string;
};

export type DicomSeries = {
  id: string;
  modality: 'CT' | 'MR';
  rows: number;
  columns: number;
  slices: DicomSlice[];
  plane: Plane | null;
};

const NATIVE_TRANSFER_SYNTAXES = new Set([
  '1.2.840.10008.1.2',
  '1.2.840.10008.1.2.1',
  '1.2.840.10008.1.2.2',
]);

function fail(message: string): never {
  throw new Error(message);
}

function text(ds: DataSet, tag: string) {
  return ds.string(tag)?.trim();
}

function decimalList(ds: DataSet, tag: string, count: number): number[] | undefined {
  const value = text(ds, tag);
  if (!value) return undefined;
  const numbers = value.split('\\').map(Number);
  return numbers.length === count && numbers.every(Number.isFinite) ? numbers : undefined;
}

function numberValue(ds: DataSet, tag: string, fallback?: number) {
  const n = ds.floatString(tag);
  return n === undefined ? fallback : n;
}

function readPixels(ds: DataSet, rows: number, columns: number, bitsAllocated: number, bitsStored: number, highBit: number, signed: boolean) {
  const pixel = ds.elements.x7fe00010;
  if (!pixel || pixel.encapsulatedPixelData || pixel.hadUndefinedLength) fail('Dados de pixel encapsulados ou comprimidos não são suportados.');
  const count = rows * columns;
  const bytesPerPixel = bitsAllocated / 8;
  if (pixel.length < count * bytesPerPixel) fail('Os dados de pixel estão incompletos.');
  const shift = highBit - bitsStored + 1;
  if (shift < 0 || highBit >= bitsAllocated) fail('Bits armazenados inválidos.');
  const mask = bitsStored === 16 ? 0xffff : (1 << bitsStored) - 1;
  const sign = 1 << (bitsStored - 1);
  // Float32 preserves the full unsigned-16 range as well as signed values after rescale.
  const output = new Float32Array(count);
  const parser = ds.byteArrayParser;
  for (let i = 0; i < count; i++) {
    const offset = pixel.dataOffset + i * bytesPerPixel;
    let value = bitsAllocated === 8 ? ds.byteArray[offset] : parser.readUint16(ds.byteArray, offset);
    value = (value >> shift) & mask;
    if (signed && value & sign) value -= 2 ** bitsStored;
    output[i] = value;
  }
  return output;
}

/** Parses one native, monochrome, single-frame CT or MR image. No patient attributes are retained. */
export function parseDicomImage(bytes: Uint8Array, sourceName = 'imagem.dcm'): DicomSlice {
  let ds: DataSet;
  try {
    ds = parseDicom(bytes);
  } catch {
    fail('Arquivo DICOM inválido ou ilegível.');
  }
  const syntax = text(ds, 'x00020010') || '1.2.840.10008.1.2';
  if (!NATIVE_TRANSFER_SYNTAXES.has(syntax)) fail('Transfer syntax comprimida ou não suportada.');
  const modality = text(ds, 'x00080060');
  if (modality !== 'CT' && modality !== 'MR') fail('Somente imagens CT e MR são suportadas.');
  const frames = text(ds, 'x00280008') || '1';
  if (!/^1$/.test(frames)) fail('Imagens multiframes não são suportadas.');
  const rows = ds.uint16('x00280010');
  const columns = ds.uint16('x00280011');
  const samples = ds.uint16('x00280002') ?? 1;
  const photometric = text(ds, 'x00280004');
  const bitsAllocated = ds.uint16('x00280100');
  const bitsStored = ds.uint16('x00280101');
  const highBit = ds.uint16('x00280102');
  const representation = ds.uint16('x00280103') ?? 0;
  if (!rows || !columns || rows > 8192 || columns > 8192) fail('Dimensões da imagem inválidas.');
  if (samples !== 1 || (photometric !== 'MONOCHROME1' && photometric !== 'MONOCHROME2')) fail('Imagens RGB ou não monocromáticas não são suportadas.');
  if ((bitsAllocated !== 8 && bitsAllocated !== 16) || !bitsStored || bitsStored > bitsAllocated || highBit === undefined || representation > 1) fail('Profundidade ou representação de pixel não suportada.');
  const slope = numberValue(ds, 'x00281053', 1);
  const intercept = numberValue(ds, 'x00281052', 0);
  if (!Number.isFinite(slope) || slope === 0 || !Number.isFinite(intercept)) fail('Rescale slope/intercept inválidos.');
  const center = numberValue(ds, 'x00281050');
  const width = numberValue(ds, 'x00281051');
  if ((center !== undefined && !Number.isFinite(center)) || (width !== undefined && (!Number.isFinite(width) || width <= 0))) fail('Janela DICOM inválida.');
  const position = decimalList(ds, 'x00200032', 3) as DicomSlice['position'] | undefined;
  const orientation = decimalList(ds, 'x00200037', 6) as DicomSlice['orientation'] | undefined;
  const spacingValues = decimalList(ds, 'x00280030', 2);
  const pixelSpacing = spacingValues && spacingValues[0] > 0 && spacingValues[1] > 0
    ? spacingValues as DicomSlice['pixelSpacing'] : undefined;
  const seriesId = text(ds, 'x0020000e') || 'sem-serie';
  const instance = ds.intString('x00200013');
  return { seriesId, modality, rows: rows!, columns: columns!, pixels: readPixels(ds, rows!, columns!, bitsAllocated!, bitsStored!, highBit!, representation === 1), slope: slope!, intercept: intercept!, windowCenter: center, windowWidth: width, invert: photometric === 'MONOCHROME1', position, orientation, pixelSpacing, instance: Number.isFinite(instance) ? instance : undefined, sourceName };
}

function normal(slice: DicomSlice): [number, number, number] | undefined {
  const o = slice.orientation;
  if (!o) return undefined;
  const rowLength = Math.hypot(o[0], o[1], o[2]);
  const columnLength = Math.hypot(o[3], o[4], o[5]);
  if (Math.abs(rowLength - 1) > 0.01 || Math.abs(columnLength - 1) > 0.01 || Math.abs(o[0] * o[3] + o[1] * o[4] + o[2] * o[5]) > 0.001) return undefined;
  const cross: [number, number, number] = [o[1] * o[5] - o[2] * o[4], o[2] * o[3] - o[0] * o[5], o[0] * o[4] - o[1] * o[3]];
  const length = Math.hypot(...cross);
  return length > 0.9999 ? [cross[0] / length, cross[1] / length, cross[2] / length] : undefined;
}

function dot(a: readonly number[], b: readonly number[]) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function planeForSlice(slice: DicomSlice): Plane | null {
  const n = normal(slice);
  if (!n) return null;
  const [x, y, z] = n.map(Math.abs);
  if (z >= x && z >= y && z > 0.9999) return 'axial';
  if (y >= x && y >= z && y > 0.9999) return 'coronal';
  if (x >= y && x >= z && x > 0.9999) return 'sagital';
  return null;
}

export function sortSeries(slices: DicomSlice[]): DicomSlice[] {
  const reference = slices.find((s) => s.position && normal(s));
  const n = reference && normal(reference);
  if (n && slices.every((s) => s.position && s.orientation)) {
    return [...slices].sort((a, b) => {
      const ap = a.position!, bp = b.position!;
      return ap[0] * n[0] + ap[1] * n[1] + ap[2] * n[2] - (bp[0] * n[0] + bp[1] * n[1] + bp[2] * n[2]);
    });
  }
  return [...slices].sort((a, b) => (a.instance ?? 0) - (b.instance ?? 0) || a.sourceName.localeCompare(b.sourceName));
}

/** Returns a physical fraction along the dominant increasing LPS coordinate, if geometry is usable. */
export function sliceFraction(slices: DicomSlice[], slice: DicomSlice): number | undefined {
  const n = normal(slice);
  if (!n || !slice.position || !consistentGeometry(slices)) return undefined;
  const axis = n.map(Math.abs).reduce((best, value, index, values) => value > values[best] ? index : best, 0);
  const positions = slices.map((item) => item.position![axis]);
  const value = slice.position[axis];
  const low = Math.min(...positions), high = Math.max(...positions);
  return high > low ? (value - low) / (high - low) : 0;
}

function consistentGeometry(slices: DicomSlice[]) {
  const first = normal(slices[0]);
  if (!first) return slices.every((slice) => !slice.orientation && !slice.position);
  return slices.every((slice) => {
    const n = normal(slice);
    const o = slice.orientation, reference = slices[0].orientation!;
    return !!n && !!o && !!slice.position && dot(first, n) > 0.9999 && dot(reference.slice(0, 3), o.slice(0, 3)) > 0.9999 && dot(reference.slice(3, 6), o.slice(3, 6)) > 0.9999;
  });
}

export function groupDicomSeries(slices: DicomSlice[]): DicomSeries[] {
  const groups = new Map<string, DicomSlice[]>();
  for (const slice of slices) groups.set(slice.seriesId, [...(groups.get(slice.seriesId) || []), slice]);
  return [...groups.entries()].filter(([, group]) => consistentGeometry(group) && group.every((slice) => slice.rows === group[0].rows && slice.columns === group[0].columns && slice.modality === group[0].modality)).map(([id, group]) => {
    const ordered = sortSeries(group);
    const first = ordered[0];
    return { id, modality: first.modality, rows: first.rows, columns: first.columns, slices: ordered, plane: planeForSlice(first) };
  });
}

export async function parseDicomFiles(files: File[]): Promise<{ series: DicomSeries[]; errors: string[] }> {
  if (files.length > 400) return { series: [], errors: ['Selecione no máximo 400 arquivos por vez.'] };
  if (files.reduce((total, file) => total + file.size, 0) > 500 * 1024 * 1024)
    return { series: [], errors: ['O total selecionado excede o limite local de 500 MB.'] };
  const slices: DicomSlice[] = [], errors: string[] = [];
  for (const file of files) {
    try { slices.push(parseDicomImage(new Uint8Array(await file.arrayBuffer()), file.name)); }
    catch (error) { errors.push(`${file.name}: ${error instanceof Error ? error.message : 'não foi possível abrir.'}`); }
  }
  const series = groupDicomSeries(slices);
  if (new Set(slices.map((slice) => slice.seriesId)).size !== series.length)
    errors.push('Uma ou mais séries foram recusadas por geometria, orientação ou dimensões inconsistentes.');
  return { series, errors };
}
