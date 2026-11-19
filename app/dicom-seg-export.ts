import type { DicomSeries, DicomSlice } from './dicom';
import { regularVolumeGrid } from './mpr';
import { maxMaskBytes, type LesionMask } from './lesion-mask';

type Segment = { label: string; mask: LesionMask; imported?: boolean };
type Tag = [number, number];
type Element = {
  tag: Tag;
  vr: string;
  value: string | number[] | Uint8Array | Element[][];
};
const segClass = '1.2.840.10008.5.1.4.1.1.66.4';
const explicitLE = '1.2.840.10008.1.2.1';
const implementation = '2.25.174117588798222771330735505176831203029';
function uid() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  return '2.25.' + BigInt('0x' + hex).toString();
}
const validUid = (value: string | undefined): value is string =>
  Boolean(value && value.length <= 64 && /^\d+(\.\d+)+$/.test(value));
const e = (tag: Tag, vr: string, value: Element['value']): Element => ({
  tag,
  vr,
  value,
});
const sq = (tag: Tag, ...items: Element[][]) => e(tag, 'SQ', items);
const textEncoder = new TextEncoder();
const join = (chunks: Uint8Array[]) => {
  const output = new Uint8Array(
    chunks.reduce((n, chunk) => n + chunk.length, 0),
  );
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
};

function encodeElement({ tag, vr, value }: Element) {
  let payload: Uint8Array;
  if (typeof value === 'string') {
    payload = textEncoder.encode(value);
    if (payload.length % 2)
      payload = join([payload, Uint8Array.of(vr === 'UI' ? 0 : 32)]);
  } else if (vr === 'SQ') {
    payload = join(
      (value as Element[][]).map((item) => {
        const data = encodeDataset(item);
        const header = Uint8Array.of(254, 255, 0, 224, 0, 0, 0, 0);
        new DataView(header.buffer).setUint32(4, data.length, true);
        return join([header, data]);
      }),
    );
  } else if (value instanceof Uint8Array) {
    payload = value;
  } else {
    const values = value as number[];
    const size = vr === 'UL' ? 4 : 2;
    payload = new Uint8Array(values.length * size);
    const view = new DataView(payload.buffer);
    values.forEach((number, index) =>
      size === 4
        ? view.setUint32(index * size, number, true)
        : view.setUint16(index * size, number, true),
    );
  }
  const long = vr === 'SQ' || vr === 'OB';
  const header = new Uint8Array(long ? 12 : 8);
  const view = new DataView(header.buffer);
  view.setUint16(0, tag[0], true);
  view.setUint16(2, tag[1], true);
  header.set(textEncoder.encode(vr), 4);
  if (long) view.setUint32(8, payload.length, true);
  else view.setUint16(6, payload.length, true);
  return [header, payload];
}

const encodeDataset = (elements: Element[]) =>
  join(
    elements
      .slice()
      .sort((a, b) => a.tag[0] - b.tag[0] || a.tag[1] - b.tag[1])
      .flatMap(encodeElement),
  );

const code = (tag: Tag, value: string, scheme: string, meaning: string) =>
  sq(tag, [
    e([8, 0x0100], 'SH', value),
    e([8, 0x0102], 'SH', scheme),
    e([8, 0x0104], 'LO', meaning),
  ]);
const ref = (slice: DicomSlice) => [
  e([8, 0x1150], 'UI', slice.sopClassId!),
  e([8, 0x1155], 'UI', slice.sopInstanceId!),
];
const dsVector = (values: readonly number[]) =>
  values.map((n) => Number(n.toPrecision(10)).toString()).join('\\');

export function canExportDicomSeg(series: DicomSeries) {
  const first = series.slices[0];
  return Boolean(
    first &&
    validUid(first.studyId) &&
    validUid(first.referenceId) &&
    validUid(first.seriesId) &&
    series.slices.every(
      (slice) =>
        slice.studyId === first.studyId &&
        slice.referenceId === first.referenceId &&
        slice.seriesId === first.seriesId &&
        validUid(slice.sopInstanceId) &&
        validUid(slice.sopClassId),
    ),
  );
}

export function encodeDicomSeg(series: DicomSeries, segments: Segment[]) {
  const grid = regularVolumeGrid(series);
  if (!grid || !canExportDicomSeg(series))
    throw new Error(
      'A série precisa da geometria e dos identificadores DICOM originais para exportação.',
    );
  const selected = segments.filter((segment) => segment.mask.size);
  if (!selected.length) throw new Error('Marque uma região antes de exportar.');
  const planePixels = series.rows * series.columns;
  const frames = selected.flatMap((segment, index) =>
    [...segment.mask.entries()]
      .sort(([a], [b]) => a - b)
      .map(([z, mask]) => ({ z, mask, number: index + 1 })),
  );
  if (frames.length > 12_000 || frames.length * planePixels > maxMaskBytes)
    throw new Error(
      'A seleção excede o limite local de exportação. Exporte menos regiões por vez.',
    );
  const byteCount = Math.ceil((frames.length * planePixels) / 8);
  const pixels = new Uint8Array(byteCount + (byteCount % 2));
  const planes = new Map(
    [...new Set(frames.map((frame) => frame.z))]
      .sort((a, b) => a - b)
      .map((z, index) => [z, index + 1]),
  );
  const references = new Map<string, DicomSlice>();
  const functional = frames.map(({ z, mask, number }, ordinal) => {
    const slice = series.slices[z];
    if (!slice || mask.length !== planePixels || !mask.includes(1))
      throw new Error('A máscara contém um corte inválido.');
    references.set(slice.sopInstanceId!, slice);
    const offset = ordinal * planePixels;
    for (let i = 0; i < mask.length; i++) {
      if (mask[i]) pixels[(offset + i) >>> 3] |= 1 << ((offset + i) & 7);
    }
    return [
      sq([0x20, 0x9111], [e([0x20, 0x9157], 'UL', [number, planes.get(z)!])]),
      sq([0x20, 0x9113], [e([0x20, 0x0032], 'DS', dsVector(slice.position!))]),
      sq([0x62, 0x000a], [e([0x62, 0x000b], 'US', [number])]),
      sq(
        [8, 0x9124],
        [
          code([8, 0x9215], '113076', 'DCM', 'Segmentation'),
          sq(
            [8, 0x2112],
            [
              ...ref(slice),
              ...(slice.frameNumber
                ? [e([8, 0x1160], 'IS', String(slice.frameNumber))]
                : []),
              e([0x28, 0x135a], 'CS', 'YES'),
              code(
                [0x40, 0xa170],
                '121322',
                'DCM',
                'Source image for image processing operation',
              ),
            ],
          ),
        ],
      ),
    ];
  });
  const date = new Date().toISOString();
  const first = series.slices[0];
  const instance = uid();
  const dimension = uid();
  const dimensionItem = (pointer: Tag, group: Tag, label: string) => [
    e([0x20, 0x9164], 'UI', dimension),
    e([0x20, 0x9165], 'AT', pointer),
    e([0x20, 0x9167], 'AT', group),
    e([0x20, 0x9421], 'LO', label),
  ];
  const data: Element[] = [
    e([8, 0x0005], 'CS', 'ISO_IR 192'),
    e([8, 0x0008], 'CS', 'DERIVED\\PRIMARY'),
    e([8, 0x0016], 'UI', segClass),
    e([8, 0x0018], 'UI', instance),
    e([8, 0x0020], 'DA', ''),
    e([8, 0x0030], 'TM', ''),
    e([8, 0x0023], 'DA', date.slice(0, 10).replaceAll('-', '')),
    e([8, 0x0033], 'TM', date.slice(11, 19).replaceAll(':', '')),
    e([8, 0x0201], 'SH', '+0000'),
    e([8, 0x0050], 'SH', ''),
    e([8, 0x0060], 'CS', 'SEG'),
    e([8, 0x0070], 'LO', 'Mapa Clinico'),
    e([8, 0x0090], 'PN', ''),
    e([8, 0x103e], 'LO', 'Segmentos para estudo'),
    e([8, 0x1090], 'LO', 'Mapa Clinico Web'),
    e([0x18, 0x1000], 'LO', 'WEB'),
    e([0x18, 0x1020], 'LO', '1'),
    e([0x10, 0x0010], 'PN', ''),
    e([0x10, 0x0020], 'LO', ''),
    e([0x10, 0x0030], 'DA', ''),
    e([0x10, 0x0040], 'CS', ''),
    e([0x20, 0x000d], 'UI', first.studyId!),
    e([0x20, 0x000e], 'UI', uid()),
    e([0x20, 0x0010], 'SH', ''),
    e([0x20, 0x0011], 'IS', '900'),
    e([0x20, 0x0013], 'IS', '1'),
    e([0x20, 0x0052], 'UI', first.referenceId!),
    e([0x20, 0x1040], 'LO', ''),
    e([0x28, 0x0002], 'US', [1]),
    e([0x28, 0x0004], 'CS', 'MONOCHROME2'),
    e([0x28, 0x0008], 'IS', String(frames.length)),
    e([0x28, 0x0010], 'US', [series.rows]),
    e([0x28, 0x0011], 'US', [series.columns]),
    e([0x28, 0x0100], 'US', [1]),
    e([0x28, 0x0101], 'US', [1]),
    e([0x28, 0x0102], 'US', [0]),
    e([0x28, 0x0103], 'US', [0]),
    e([0x28, 0x0301], 'CS', 'NO'),
    e([0x28, 0x2110], 'CS', '00'),
    e([0x62, 0x0001], 'CS', 'BINARY'),
    sq(
      [0x62, 0x0002],
      ...selected.map((segment, index) => [
        e([0x62, 0x0004], 'US', [index + 1]),
        e(
          [0x62, 0x0005],
          'LO',
          Array.from(segment.label.trim() || `Regiao ${index + 1}`)
            .slice(0, 45)
            .map((char) =>
              char.charCodeAt(0) < 32 || char === '\\' ? ' ' : char,
            )
            .join(''),
        ),
        e([0x62, 0x0008], 'CS', segment.imported ? 'SEMIAUTOMATIC' : 'MANUAL'),
        ...(segment.imported
          ? [e([0x62, 0x0009], 'LO', 'Imported segmentation in manual editor')]
          : []),
        code(
          [0x62, 0x0003],
          '49755003',
          'SCT',
          'Morphologically abnormal structure',
        ),
        code(
          [0x62, 0x000f],
          '49755003',
          'SCT',
          'Morphologically abnormal structure',
        ),
      ]),
    ),
    e([0x62, 0x0013], 'CS', 'UNDEFINED'),
    e([0x70, 0x0080], 'CS', 'MAPACLINICO'),
    e([0x70, 0x0081], 'LO', 'Marcacao de regioes para estudo'),
    e([0x70, 0x0084], 'PN', ''),
    sq([0x20, 0x9221], [e([0x20, 0x9164], 'UI', dimension)]),
    sq(
      [0x20, 0x9222],
      dimensionItem([0x62, 0x000b], [0x62, 0x000a], 'Segment'),
      dimensionItem([0x20, 0x0032], [0x20, 0x9113], 'Image position'),
    ),
    sq(
      [8, 0x1115],
      [
        e([0x20, 0x000e], 'UI', first.seriesId!),
        sq([8, 0x114a], ...[...references.values()].map(ref)),
      ],
    ),
    sq(
      [0x5200, 0x9229],
      [
        sq(
          [0x28, 0x9110],
          [
            e([0x28, 0x0030], 'DS', dsVector(first.pixelSpacing!)),
            e([0x18, 0x0050], 'DS', ''),
            e([0x18, 0x0088], 'DS', dsVector([grid.stepMm])),
          ],
        ),
        sq(
          [0x20, 0x9116],
          [e([0x20, 0x0037], 'DS', dsVector(first.orientation!))],
        ),
      ],
    ),
    sq([0x5200, 0x9230], ...functional),
    e([0x7fe0, 0x0010], 'OB', pixels),
  ];
  const meta = encodeDataset([
    e([2, 1], 'OB', Uint8Array.of(0, 1)),
    e([2, 2], 'UI', segClass),
    e([2, 3], 'UI', instance),
    e([2, 0x0010], 'UI', explicitLE),
    e([2, 0x0012], 'UI', implementation),
    e([2, 0x0013], 'SH', 'MAPACLINICO'),
  ]);
  return join([
    new Uint8Array(128),
    textEncoder.encode('DICM'),
    ...encodeElement(e([2, 0], 'UL', [meta.length])),
    meta,
    encodeDataset(data),
  ]);
}
