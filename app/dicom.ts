import { parseDicom, type DataSet } from 'dicom-parser';

export type Plane = 'axial' | 'coronal' | 'sagital';
export type Region = 'head' | 'thorax' | 'abdomen' | 'body';

export type CardiacTiming = {
  phasePercent?: number;
  triggerMs?: number;
  position?: number;
  rrMs?: number;
};
export type VelocityEncoding = {
  direction: [number, number, number];
  slopeCmPerSec: number;
  interceptCmPerSec: number;
  first: number;
  last: number;
};

export type DicomSlice = {
  seriesId: string;
  modality: 'CT' | 'MR';
  rows: number;
  columns: number;
  pixels: Int8Array | Uint8Array | Int16Array | Uint16Array | Float32Array;
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
  studyId?: string;
  referenceId?: string;
  stackId?: string;
  contrastKey?: string;
  cardiac?: CardiacTiming;
  velocity?: VelocityEncoding;
  padding?: [number, number];
};

export type DicomSeries = {
  id: string;
  modality: 'CT' | 'MR';
  rows: number;
  columns: number;
  slices: DicomSlice[];
  plane: Plane | null;
  cardiacPhase?: { kind: 'percent' | 'trigger' | 'index'; value: number };
  acquisitionId?: string;
};

const MAX_LOCAL_BYTES = 500 * 1024 * 1024;
const RLE_LOSSLESS = '1.2.840.10008.1.2.5';
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

function decimalList(
  ds: DataSet,
  tag: string,
  count: number,
): number[] | undefined {
  const value = text(ds, tag);
  if (!value) return undefined;
  const numbers = value.split('\\').map(Number);
  return numbers.length === count && numbers.every(Number.isFinite)
    ? numbers
    : undefined;
}

function numberValue(ds: DataSet, tag: string, fallback?: number) {
  const n = ds.floatString(tag);
  return n === undefined ? fallback : n;
}

function sequence(ds: DataSet | undefined, tag: string) {
  return ds?.elements[tag]?.items?.map((item) => item.dataSet) ?? [];
}

const functionalSequences = new Set([
  'x52009229',
  'x52009230',
  'x00289110',
  'x00289145',
  'x00289132',
  'x00209111',
  'x00209113',
  'x00209116',
  'x00189118',
  'x00189197',
  'x00409096',
  'x004008ea',
  'x00189114',
  'x00189226',
]);

function parseDataset(bytes: Uint8Array) {
  try {
    return parseDicom(bytes, {
      vrCallback: (tag) => (functionalSequences.has(tag) ? 'SQ' : undefined),
    });
  } catch {
    fail('Arquivo DICOM inválido ou ilegível.');
  }
}

function finiteNumber(
  value: number | undefined,
  low = -Infinity,
  high = Infinity,
) {
  return value !== undefined &&
    Number.isFinite(value) &&
    value >= low &&
    value <= high
    ? value
    : undefined;
}

function velocityEncoding(
  groups: (DataSet | undefined)[],
  signed: boolean,
): VelocityEncoding | undefined {
  const encodings = groups
    .map((group) => sequence(group, 'x00189197'))
    .find((items) => items.length);
  const maps = groups
    .map((group) => sequence(group, 'x00409096'))
    .find((items) => items.length);
  if (encodings?.length !== 1 || !encodings[0] || !maps) return;
  const vector = encodings[0];
  const direction = [0, 1, 2].map((axis) =>
    vector.double('x00189090', axis),
  ) as VelocityEncoding['direction'];
  if (
    !direction.every(Number.isFinite) ||
    Math.abs(Math.hypot(...direction) - 1) > 0.01
  )
    return;
  const mappings = maps.flatMap((item) => {
    if (!item) return [];
    const units = sequence(item, 'x004008ea')[0];
    const code = units && text(units, 'x00080100');
    const factor =
      code === 'cm/s' ? 1 : code === 'm/s' ? 100 : code === 'mm/s' ? 0.1 : 0;
    if (
      !factor ||
      !units ||
      text(units, 'x00080102') !== 'UCUM' ||
      item.elements.x00409212
    )
      return [];
    const slope = finiteNumber(item.double('x00409225'));
    const intercept = finiteNumber(item.double('x00409224'));
    const read = signed ? item.int16.bind(item) : item.uint16.bind(item);
    const first = read('x00409216'),
      last = read('x00409211');
    return slope &&
      intercept !== undefined &&
      first !== undefined &&
      last !== undefined &&
      first <= last
      ? [
          {
            direction,
            slopeCmPerSec: slope * factor,
            interceptCmPerSec: intercept * factor,
            first,
            last,
          },
        ]
      : [];
  });
  return mappings.length === 1 ? mappings[0] : undefined;
}

function decodeRleFrame(
  bytes: Uint8Array,
  count: number,
  bytesPerPixel: number,
) {
  if (bytes.length < 64) fail('Cabeçalho RLE incompleto.');
  const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (header.getUint32(0, true) !== bytesPerPixel)
    fail('Número de segmentos RLE incompatível.');
  const values = new Uint16Array(count);
  for (let segment = 0; segment < bytesPerPixel; segment++) {
    let input = header.getUint32(4 + 4 * segment, true);
    const end =
      segment + 1 === bytesPerPixel
        ? bytes.length
        : header.getUint32(8 + 4 * segment, true);
    if (input < 64 || end <= input || end > bytes.length)
      fail('Segmento RLE inválido.');
    const shift = (bytesPerPixel - segment - 1) * 8;
    for (let output = 0; output < count;) {
      if (input >= end) fail('Segmento RLE incompleto.');
      const control = header.getInt8(input++);
      if (control === -128) continue;
      const run = control < 0 ? 1 - control : control + 1;
      const payload = control < 0 ? 1 : run;
      if (output + run > count || input + payload > end)
        fail('Dados RLE inválidos.');
      for (let i = 0; i < run; i++)
        values[output++] |= bytes[input + (control < 0 ? 0 : i)] << shift;
      input += payload;
    }
  }
  return values;
}

function readPixels(
  ds: DataSet,
  rows: number,
  columns: number,
  bitsAllocated: number,
  bitsStored: number,
  highBit: number,
  signed: boolean,
  frame: number,
  frameCount: number,
  rle: boolean,
) {
  const pixel = ds.elements.x7fe00010;
  if (!pixel) fail('Dados de pixel ausentes.');
  const count = rows * columns;
  const bytesPerPixel = bitsAllocated / 8;
  const fragment =
    rle && pixel.encapsulatedPixelData && pixel.fragments?.length === frameCount
      ? pixel.fragments[frame]
      : undefined;
  if (
    rle &&
    (!fragment || fragment.position + fragment.length > ds.byteArray.length)
  )
    fail('Dados RLE exigem um fragmento por quadro.');
  if (!rle && (pixel.encapsulatedPixelData || pixel.hadUndefinedLength))
    fail('Dados de pixel encapsulados ou comprimidos não são suportados.');
  if (
    !rle &&
    (pixel.length < (frame + 1) * count * bytesPerPixel ||
      pixel.dataOffset + pixel.length > ds.byteArray.length)
  ) {
    fail('Os dados de pixel estão incompletos.');
  }
  const shift = highBit - bitsStored + 1;
  if (shift < 0 || highBit >= bitsAllocated)
    fail('Bits armazenados inválidos.');
  const mask = bitsStored === 16 ? 0xffff : (1 << bitsStored) - 1;
  const sign = 1 << (bitsStored - 1);
  const output =
    bitsAllocated === 8
      ? signed
        ? new Int8Array(count)
        : new Uint8Array(count)
      : signed
        ? new Int16Array(count)
        : new Uint16Array(count);
  const parser = ds.byteArrayParser;
  const encoded =
    fragment &&
    decodeRleFrame(
      ds.byteArray.subarray(
        fragment.position,
        fragment.position + fragment.length,
      ),
      count,
      bytesPerPixel,
    );
  for (let i = 0; i < count; i++) {
    const offset = pixel.dataOffset + (frame * count + i) * bytesPerPixel;
    const word = encoded
      ? encoded[i]
      : bitsAllocated === 8
        ? ds.byteArray[offset]
        : parser.readUint16(ds.byteArray, offset);
    let value = (word >> shift) & mask;
    if (signed && value & sign) value -= 2 ** bitsStored;
    output[i] = value;
  }
  return output;
}

export function parseDicomImage(
  bytes: Uint8Array,
  sourceName = 'imagem.dcm',
): DicomSlice {
  return parseNativeFrames(bytes, sourceName, false)[0];
}

/** Reads classic and Enhanced monochrome CT/MR frames locally. */
export function parseDicomFrames(
  bytes: Uint8Array,
  sourceName = 'imagem.dcm',
): DicomSlice[] {
  return parseNativeFrames(bytes, sourceName, true);
}

function parseNativeFrames(
  bytes: Uint8Array,
  sourceName: string,
  allowMultiple: boolean,
  pixelBudget = MAX_LOCAL_BYTES,
): DicomSlice[] {
  const ds = parseDataset(bytes);
  const syntax = text(ds, 'x00020010') || '1.2.840.10008.1.2';
  const rle = syntax === RLE_LOSSLESS;
  if (!rle && !NATIVE_TRANSFER_SYNTAXES.has(syntax))
    fail('Transfer syntax comprimida ou não suportada.');
  const modality = text(ds, 'x00080060');
  if (modality !== 'CT' && modality !== 'MR')
    fail('Somente imagens CT e RM são suportadas.');
  const frames = Number(text(ds, 'x00280008') || '1');
  if (!Number.isInteger(frames) || frames < 1 || frames > 3000)
    fail('Número de quadros DICOM inválido ou acima do limite de 3.000.');
  if (!allowMultiple && frames !== 1)
    fail('Use a importação de série para imagens multiframes.');
  const perFrame = sequence(ds, 'x52009230');
  const shared = sequence(ds, 'x52009229')[0];
  if (
    (frames > 1 || perFrame.length) &&
    (perFrame.length !== frames || perFrame.some((group) => !group))
  ) {
    fail(
      'Imagens multiframes exigem os grupos funcionais DICOM de cada quadro.',
    );
  }
  const rows = ds.uint16('x00280010');
  const columns = ds.uint16('x00280011');
  const samples = ds.uint16('x00280002') ?? 1;
  const photometric = text(ds, 'x00280004');
  const bitsAllocated = ds.uint16('x00280100');
  const bitsStored = ds.uint16('x00280101');
  const highBit = ds.uint16('x00280102');
  const representation = ds.uint16('x00280103') ?? 0;
  if (!rows || !columns || rows > 8192 || columns > 8192)
    fail('Dimensões da imagem inválidas.');
  if (
    samples !== 1 ||
    (photometric !== 'MONOCHROME1' && photometric !== 'MONOCHROME2')
  )
    fail('Imagens RGB ou não monocromáticas não são suportadas.');
  if (
    (bitsAllocated !== 8 && bitsAllocated !== 16) ||
    !bitsStored ||
    bitsStored > bitsAllocated ||
    highBit === undefined ||
    representation > 1
  )
    fail('Profundidade ou representação de pixel não suportada.');
  if ((rows * columns * frames * bitsAllocated) / 8 > pixelBudget)
    fail('A seleção excede 500 MB de pixels decodificados.');
  const seriesId = text(ds, 'x0020000e') || 'sem-serie';
  const studyId = text(ds, 'x0020000d');
  const referenceId = text(ds, 'x00200052');
  const instance = ds.intString('x00200013');
  const signed = representation === 1;
  const rawPixelValue = signed ? ds.int16.bind(ds) : ds.uint16.bind(ds);
  const paddingValue = rawPixelValue('x00280120');
  const paddingLimit = rawPixelValue('x00280121') ?? paddingValue;
  const padding: DicomSlice['padding'] =
    paddingValue !== undefined && paddingLimit !== undefined
      ? [
          Math.min(paddingValue, paddingLimit),
          Math.max(paddingValue, paddingLimit),
        ]
      : undefined;
  return Array.from({ length: frames }, (_, frame) => {
    const groups = [perFrame[frame], shared, ds];
    const group = (tag: string) =>
      groups.map((item) => sequence(item, tag)[0]).find(Boolean) ?? ds;
    const voi = group('x00289132');
    const transform = group('x00289145');
    const slope = numberValue(transform, 'x00281053', 1)!;
    const intercept = numberValue(transform, 'x00281052', 0)!;
    if (!Number.isFinite(slope) || slope === 0 || !Number.isFinite(intercept))
      fail('Rescale slope/intercept inválidos.');
    const center = numberValue(voi, 'x00281050');
    const width = numberValue(voi, 'x00281051');
    if (
      (center !== undefined && !Number.isFinite(center)) ||
      (width !== undefined && (!Number.isFinite(width) || width <= 0))
    )
      fail('Janela DICOM inválida.');
    const position = decimalList(
      group('x00209113'),
      'x00200032',
      3,
    ) as DicomSlice['position'];
    const orientation = decimalList(
      group('x00209116'),
      'x00200037',
      6,
    ) as DicomSlice['orientation'];
    const spacing = decimalList(group('x00289110'), 'x00280030', 2);
    const pixelSpacing =
      spacing && spacing.every((value) => value > 0)
        ? (spacing as DicomSlice['pixelSpacing'])
        : undefined;
    const sync = group('x00189118');
    const content = group('x00209111');
    const explicitPercent = finiteNumber(sync.float('x00209241'), 0, 100);
    const nominalDelay = finiteNumber(sync.double('x00209153'), 0);
    const triggerMs =
      nominalDelay ?? finiteNumber(numberValue(ds, 'x00181060'), 0);
    const rrMs = finiteNumber(
      sync.double('x00189070') ??
        ds.double('x00189070') ??
        numberValue(ds, 'x00181062'),
      200,
      3000,
    );
    const temporalPosition = finiteNumber(
      content.uint32('x00209128') ?? ds.intString('x00200100'),
      1,
    );
    const syncTechnique = text(sync, 'x00189037') ?? text(ds, 'x00189037');
    const cardiacFrames = ds.intString('x00181090') ?? 0;
    // Classic cine may record a different R–R interval at each slice location.
    // Bin those documented times by their relative phase, to the nearest half percent.
    const derivedPercent =
      nominalDelay === undefined &&
      cardiacFrames > 1 &&
      cardiacFrames <= 200 &&
      rrMs &&
      triggerMs !== undefined &&
      triggerMs < rrMs
        ? Math.round((triggerMs / rrMs) * 200) / 2
        : undefined;
    const nominalPercent = explicitPercent ?? derivedPercent;
    const cardiac =
      nominalPercent !== undefined ||
      triggerMs !== undefined ||
      cardiacFrames > 1 ||
      (syncTechnique && !['NONE', 'REALTIME'].includes(syncTechnique))
        ? {
            phasePercent: nominalPercent,
            triggerMs,
            rrMs,
            position: temporalPosition,
          }
        : undefined;
    const component =
      text(group('x00189226'), 'x00089208') ??
      text(ds, 'x00089208') ??
      text(ds, 'x00080008')?.split('\\')[2] ??
      '';
    const echo =
      ds.intString('x00180086') ?? group('x00189114').double('x00189082');
    const velocity =
      modality === 'MR' ? velocityEncoding(groups, signed) : undefined;
    const contrastKey = [
      velocity ? 'velocity' : component,
      echo ?? '',
      ...(velocity?.direction.map((v) => v.toFixed(3)) ?? []),
    ].join('|');
    return {
      seriesId,
      modality,
      rows,
      columns,
      slope,
      intercept,
      windowCenter: center,
      windowWidth: width,
      pixels: readPixels(
        ds,
        rows,
        columns,
        bitsAllocated!,
        bitsStored!,
        highBit,
        signed,
        frame,
        frames,
        rle,
      ),
      invert: photometric === 'MONOCHROME1',
      position,
      orientation,
      pixelSpacing,
      instance: frames > 1 ? frame + 1 : finiteNumber(instance),
      sourceName,
      studyId,
      referenceId,
      stackId: text(content, 'x00209056'),
      contrastKey,
      cardiac,
      velocity,
      padding,
    };
  });
}

function normal(slice: DicomSlice): [number, number, number] | undefined {
  const o = slice.orientation;
  if (!o) return undefined;
  const rowLength = Math.hypot(o[0], o[1], o[2]);
  const columnLength = Math.hypot(o[3], o[4], o[5]);
  if (
    Math.abs(rowLength - 1) > 0.01 ||
    Math.abs(columnLength - 1) > 0.01 ||
    Math.abs(o[0] * o[3] + o[1] * o[4] + o[2] * o[5]) > 0.001
  )
    return undefined;
  const cross: [number, number, number] = [
    o[1] * o[5] - o[2] * o[4],
    o[2] * o[3] - o[0] * o[5],
    o[0] * o[4] - o[1] * o[3],
  ];
  const length = Math.hypot(...cross);
  return length > 0.9999
    ? [cross[0] / length, cross[1] / length, cross[2] / length]
    : undefined;
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
      const ap = a.position!,
        bp = b.position!;
      return (
        ap[0] * n[0] +
        ap[1] * n[1] +
        ap[2] * n[2] -
        (bp[0] * n[0] + bp[1] * n[1] + bp[2] * n[2])
      );
    });
  }
  return [...slices].sort(
    (a, b) =>
      (a.instance ?? 0) - (b.instance ?? 0) ||
      a.sourceName.localeCompare(b.sourceName),
  );
}

/** Returns a physical fraction along the dominant increasing LPS coordinate, if geometry is usable. */
export function sliceFraction(
  slices: DicomSlice[],
  slice: DicomSlice,
): number | undefined {
  const n = normal(slice);
  if (!n || !slice.position || !consistentGeometry(slices)) return undefined;
  const axis = n
    .map(Math.abs)
    .reduce(
      (best, value, index, values) => (value > values[best] ? index : best),
      0,
    );
  const positions = slices.map((item) => item.position![axis]);
  const value = slice.position[axis];
  const low = Math.min(...positions),
    high = Math.max(...positions);
  return high > low ? (value - low) / (high - low) : 0;
}

function consistentGeometry(slices: DicomSlice[]) {
  const first = normal(slices[0]);
  if (!first)
    return slices.every((slice) => !slice.orientation && !slice.position);
  return slices.every((slice) => {
    const n = normal(slice);
    const o = slice.orientation,
      reference = slices[0].orientation!;
    return (
      !!n &&
      !!o &&
      !!slice.position &&
      dot(first, n) > 0.9999 &&
      dot(reference.slice(0, 3), o.slice(0, 3)) > 0.9999 &&
      dot(reference.slice(3, 6), o.slice(3, 6)) > 0.9999
    );
  });
}

function cardiacPhase(timing?: CardiacTiming): DicomSeries['cardiacPhase'] {
  if (timing?.phasePercent !== undefined)
    return {
      kind: 'percent',
      value: Math.round(timing.phasePercent * 100) / 100,
    };
  if (timing?.triggerMs !== undefined)
    return { kind: 'trigger', value: Math.round(timing.triggerMs) };
  if (timing?.position !== undefined)
    return { kind: 'index', value: timing.position };
}

export function groupDicomSeries(slices: DicomSlice[]): DicomSeries[] {
  const seriesByUid = new Map<string, DicomSlice[]>();
  for (const slice of slices) {
    const group = seriesByUid.get(slice.seriesId) ?? [];
    group.push(slice);
    seriesByUid.set(slice.seriesId, group);
  }
  const result: DicomSeries[] = [];
  for (const [id, images] of seriesByUid) {
    const phaseGroups = new Map<string, DicomSlice[]>();
    for (const slice of images) {
      const phase = cardiacPhase(slice.cardiac);
      const key = JSON.stringify([
        slice.stackId ?? '',
        slice.contrastKey ?? '',
        phase,
      ]);
      const group = phaseGroups.get(key) ?? [];
      group.push(slice);
      phaseGroups.set(key, group);
    }
    for (const group of phaseGroups.values()) {
      const first = group[0];
      if (
        !consistentGeometry(group) ||
        !group.every(
          (slice) =>
            slice.rows === first.rows &&
            slice.columns === first.columns &&
            slice.modality === first.modality &&
            slice.studyId === first.studyId &&
            slice.referenceId === first.referenceId,
        )
      )
        continue;
      result.push({
        id: phaseGroups.size === 1 ? id : id + '#' + (result.length + 1),
        acquisitionId: id,
        modality: first.modality,
        rows: first.rows,
        columns: first.columns,
        slices: sortSeries(group),
        plane: planeForSlice(first),
        cardiacPhase: cardiacPhase(first.cardiac),
      });
    }
  }
  return result;
}

export async function parseDicomFiles(
  files: File[],
): Promise<{ series: DicomSeries[]; errors: string[] }> {
  if (files.length > 3000)
    return {
      series: [],
      errors: ['Selecione no máximo 3.000 arquivos por vez.'],
    };
  if (files.reduce((total, file) => total + file.size, 0) > MAX_LOCAL_BYTES)
    return {
      series: [],
      errors: ['O total selecionado excede o limite local de 500 MB.'],
    };
  const slices: DicomSlice[] = [],
    errors: string[] = [];
  let decodedBytes = 0;
  for (const file of files) {
    try {
      const frames = parseNativeFrames(
        new Uint8Array(await file.arrayBuffer()),
        file.name,
        true,
        MAX_LOCAL_BYTES - decodedBytes,
      );
      decodedBytes += frames.length * frames[0].pixels.byteLength;
      slices.push(...frames);
    } catch (error) {
      errors.push(
        `${file.name}: ${error instanceof Error ? error.message : 'não foi possível abrir.'}`,
      );
    }
  }
  const series = groupDicomSeries(slices);
  if (
    series.reduce((total, group) => total + group.slices.length, 0) !==
    slices.length
  )
    errors.push(
      'Uma ou mais séries foram recusadas por geometria, orientação ou dimensões inconsistentes.',
    );
  return { series, errors };
}
