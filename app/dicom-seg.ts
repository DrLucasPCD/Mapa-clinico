import { parseDicom, type DataSet } from 'dicom-parser';
import type { DicomSeries } from './dicom';
import { maxMaskBytes, type LesionMask } from './lesion-mask';
import { regularVolumeGrid } from './mpr';

export type DicomSegment = { id: number; label: string; mask: LesionMask };

const sequences = new Set([
  'x00081115',
  'x0008114a',
  'x00089124',
  'x00082112',
  'x00620002',
  'x0062000a',
  'x52009229',
  'x52009230',
  'x00209113',
  'x00209116',
  'x00289110',
]);
const items = (ds: DataSet | undefined, tag: string) =>
  ds?.elements[tag]?.items?.flatMap((item) =>
    item.dataSet ? [item.dataSet] : [],
  ) ?? [];
const read = (ds: DataSet | undefined, tag: string) => ds?.string(tag)?.trim();
function coordinates(ds: DataSet | undefined, tag: string, expected: number) {
  const value = read(ds, tag)?.split('\\');
  if (value?.length !== expected || value.some((part) => !part.trim()))
    return undefined;
  const numbers = value.map(Number);
  return numbers.every(Number.isFinite) ? numbers : undefined;
}

const close = (
  a: number[] | undefined,
  b: readonly number[] | undefined,
  tolerance: number,
) =>
  Boolean(
    a &&
    b &&
    a.length === b.length &&
    a.every((n, index) => Math.abs(n - b[index]) <= tolerance),
  );

/** Accept a native binary SEG only on the same voxel grid as its referenced acquisition. */
export function parseDicomSeg(
  bytes: Uint8Array,
  series: DicomSeries,
): DicomSegment[] {
  const grid = regularVolumeGrid(series);
  if (!grid)
    throw new Error(
      'Abra uma série de TC ou RM com geometria regular antes da máscara.',
    );

  let ds: DataSet;
  try {
    ds = parseDicom(bytes, {
      vrCallback: (tag) => (sequences.has(tag) ? 'SQ' : undefined),
    });
  } catch {
    throw new Error('Não foi possível ler o arquivo DICOM SEG.');
  }
  if (
    read(ds, 'x00080016') !== '1.2.840.10008.5.1.4.1.1.66.4' ||
    read(ds, 'x00620001') !== 'BINARY'
  )
    throw new Error(
      'Selecione um DICOM SEG binário. Máscaras fracionárias e mapas de rótulos usam outra codificação.',
    );
  const syntax = read(ds, 'x00020010');
  if (syntax !== '1.2.840.10008.1.2.1' && syntax !== '1.2.840.10008.1.2')
    throw new Error(
      'A máscara precisa usar codificação DICOM nativa Little Endian, sem compressão.',
    );

  const first = series.slices[0];
  if (
    !first.referenceId ||
    first.referenceId !== read(ds, 'x00200052') ||
    !first.studyId ||
    first.studyId !== read(ds, 'x0020000d')
  )
    throw new Error(
      'O estudo ou sistema de coordenadas da máscara difere da série aberta.',
    );
  if (
    ds.uint16('x00280010') !== series.rows ||
    ds.uint16('x00280011') !== series.columns
  )
    throw new Error('A matriz de pixels da máscara difere da série aberta.');

  const frameCount = Number(read(ds, 'x00280008'));
  const planePixels = series.rows * series.columns;
  const packedBytes = Math.ceil((frameCount * planePixels) / 8);
  const pixelData = ds.elements.x7fe00010;
  const frames = items(ds, 'x52009230');
  if (
    !Number.isSafeInteger(frameCount) ||
    frameCount < 1 ||
    frameCount > 12_000 ||
    frames.length !== frameCount ||
    ds.uint16('x00280002') !== 1 ||
    ds.uint16('x00280100') !== 1 ||
    ds.uint16('x00280101') !== 1 ||
    ds.uint16('x00280102') !== 0 ||
    ds.uint16('x00280103') !== 0 ||
    !pixelData ||
    pixelData.encapsulatedPixelData ||
    pixelData.length !== packedBytes + (packedBytes % 2) ||
    pixelData.dataOffset + pixelData.length > ds.byteArray.length
  )
    throw new Error('Os quadros ou dados de pixel do DICOM SEG são inválidos.');
  if (frameCount * planePixels > maxMaskBytes)
    throw new Error(
      'A máscara excede o limite local de 224 MB de voxels decodificados.',
    );

  const segments = new Map<
    number,
    { id: number; label: string; mask: Map<number, Uint8Array> }
  >();
  for (const item of items(ds, 'x00620002')) {
    const id = item.uint16('x00620004');
    if (!id || segments.has(id))
      throw new Error('O DICOM SEG tem identificadores de segmento inválidos.');
    const label = item.elements.x00620005;
    const decoded = label && read(ds, 'x00080005') === 'ISO_IR 192'
      ? new TextDecoder().decode(item.byteArray.subarray(label.dataOffset, label.dataOffset + label.length)).trim()
      : read(item, 'x00620005');
    segments.set(id, {
      id,
      label: decoded || `Segmento ${id}`,
      mask: new Map(),
    });
  }

  const byUid = new Map<string, number[]>();
  series.slices.forEach((slice, i) => {
    if (!slice.sopInstanceId) return;
    const indexes = byUid.get(slice.sopInstanceId) ?? [];
    indexes.push(i);
    byUid.set(slice.sopInstanceId, indexes);
  });
  const referencedClassic = new Set(
    items(ds, 'x00081115')
      .filter((item) => read(item, 'x0020000e') === first.seriesId)
      .flatMap((item) => items(item, 'x0008114a'))
      .map((item) => read(item, 'x00081155')),
  );
  const shared = items(ds, 'x52009229')[0];
  const tolerance = Math.min(
    0.02,
    grid.stepMm * 0.1,
    grid.frame.columnSpacing * 0.1,
    grid.frame.rowSpacing * 0.1,
  );
  const seen = new Set<string>();
  frames.forEach((frame, frameIndex) => {
    const group = (tag: string) =>
      items(frame, tag)[0] ?? items(shared, tag)[0];
    const orientation = coordinates(group('x00209116'), 'x00200037', 6);
    const position = coordinates(group('x00209113'), 'x00200032', 3);
    const spacing = coordinates(group('x00289110'), 'x00280030', 2);
    const id = group('x0062000a')?.uint16('x0062000b');
    const segment = id === undefined ? undefined : segments.get(id);
    if (!position || !segment)
      throw new Error('Há quadros sem posição ou identificação do segmento.');
    const derivation = items(frame, 'x00089124').length
      ? items(frame, 'x00089124')
      : items(shared, 'x00089124');
    const sources = derivation.flatMap((item) => items(item, 'x00082112'));
    const candidateIndexes = new Set<number>();
    for (const source of sources) {
      if (read(source, 'x0028135a') === 'NO') continue;
      const frameNumbers = read(source, 'x00081160')?.split('\\');
      for (const index of byUid.get(read(source, 'x00081155') ?? '') ?? []) {
        const number = series.slices[index].frameNumber;
        if (
          frameNumbers
            ? frameNumbers.includes(String(number ?? 1))
            : number === undefined
        )
          candidateIndexes.add(index);
      }
    }
    if (!sources.length) {
      // Some SEG exporters record references only in the Common Instance Reference module.
      const z = Math.round(
        grid.frame.normal.reduce(
          (sum, n, axis) =>
            sum + n * (position[axis] - grid.frame.origin[axis]),
          0,
        ) / grid.stepMm,
      );
      const candidate = series.slices[z];
      if (
        candidate?.sopInstanceId &&
        candidate.frameNumber === undefined &&
        referencedClassic.has(candidate.sopInstanceId)
      )
        candidateIndexes.add(z);
    }
    const matches = [...candidateIndexes].filter((index) => {
      const slice = series.slices[index];
      return (
        close(position, slice.position, tolerance) &&
        close(orientation, slice.orientation, 0.0001) &&
        close(spacing, slice.pixelSpacing, 0.0001)
      );
    });
    if (matches.length !== 1)
      throw new Error(
        'Há quadros da máscara fora da grade ou sem referência inequívoca à série aberta.',
      );
    const z = matches[0];
    const key = `${id}:${z}`;
    if (seen.has(key))
      throw new Error('Há quadros duplicados para o mesmo corte e segmento.');
    seen.add(key);

    const bitOffset = frameIndex * planePixels;
    const plane = new Uint8Array(planePixels);
    let nonempty = false;
    for (let index = 0; index < planePixels; index++) {
      const bit = bitOffset + index;
      const selected =
        (ds.byteArray[pixelData.dataOffset + (bit >>> 3)] >>> (bit & 7)) & 1;
      plane[index] = selected;
      nonempty ||= Boolean(selected);
    }
    if (nonempty) segment.mask.set(z, plane);
  });
  const nonempty = [...segments.values()].filter(
    (segment) => segment.mask.size,
  );
  if (!nonempty.length)
    throw new Error('O arquivo DICOM SEG não contém regiões marcadas.');
  return nonempty;
}
