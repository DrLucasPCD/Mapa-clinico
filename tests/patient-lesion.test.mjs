import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

async function moduleUrl(file, imports = {}) {
  let source = await readFile('app/' + file + '.ts', 'utf8');
  for (const [name, url] of Object.entries(imports)) {
    source = source.replace("'" + name + "'", JSON.stringify(url));
  }
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
}
const mpr = await moduleUrl('mpr', {
  './patient-geometry': await moduleUrl('patient-geometry'),
});
const mask = await moduleUrl('lesion-mask', { './mpr': mpr });
const { makeLesionSurface, paintLesion, propagateLesion } = await import(mask);
const { mprPlaneCorners, correspondingCursor } = await import(mpr);
const adapter =
  'data:text/javascript,' +
  encodeURIComponent(
    `import parser from ${JSON.stringify(import.meta.resolve('dicom-parser'))}; export const parseDicom = parser.parseDicom;`,
  );
const { parseDicomSeg } = await import(
  await moduleUrl('dicom-seg', {
    './mpr': mpr,
    './lesion-mask': mask,
    'dicom-parser': adapter,
  })
);

const studyId = '1.2.3.1';
const referenceId = '1.2.3.2';
const seriesId = '1.2.3.3';
const phantom = {
  rows: 3,
  columns: 3,
  modality: 'CT',
  plane: 'axial',
  id: seriesId,
  slices: [30, 34, 38].map((z, i) => ({
    rows: 3,
    columns: 3,
    seriesId,
    studyId,
    referenceId,
    sopInstanceId: `1.2.3.4.${i + 1}`,
    sopClassId: '1.2.840.10008.5.1.4.1.1.2',
    position: [10, 20, z],
    orientation: [-1, 0, 0, 0, -1, 0],
    pixelSpacing: [2, 3],
  })),
};

const u16 = (n) => Buffer.from([n & 255, n >>> 8]);
const u32 = (n) => Buffer.from([n & 255, n >>> 8, n >>> 16, n >>> 24]);
function element(group, field, vr, content) {
  let bytes = typeof content === 'string' ? Buffer.from(content) : content;
  if (bytes.length % 2)
    bytes = Buffer.concat([bytes, Buffer.from([vr === 'UI' ? 0 : 32])]);
  const long = ['SQ', 'OB'].includes(vr);
  return Buffer.concat([
    u16(group),
    u16(field),
    Buffer.from(vr),
    ...(long ? [u16(0), u32(bytes.length)] : [u16(bytes.length)]),
    bytes,
  ]);
}
const sq = (group, field, ...items) =>
  element(
    group,
    field,
    'SQ',
    Buffer.concat(
      items.map((item) => {
        const data = Buffer.concat(item);
        return Buffer.concat([
          u16(0xfffe),
          u16(0xe000),
          u32(data.length),
          data,
        ]);
      }),
    ),
  );
function segmentation({
  wrongReference = false,
  shifted = false,
  wrongFrame = false,
  id = referenceId,
} = {}) {
  const shared = sq(0x5200, 0x9229, [
    sq(0x0028, 0x9110, [element(0x0028, 0x0030, 'DS', '2\\3')]),
    sq(0x0020, 0x9116, [element(0x0020, 0x0037, 'DS', '-1\\0\\0\\0\\-1\\0')]),
  ]);
  const frames = sq(
    0x5200,
    0x9230,
    ...[phantom.slices[2], phantom.slices[0]].map((slice, i) => [
      sq(0x0008, 0x9124, [
        sq(0x0008, 0x2112, [
          element(
            0x0008,
            0x1155,
            'UI',
            wrongReference ? '1.2.4' : slice.sopInstanceId,
          ),
          ...(wrongFrame ? [element(0x0008, 0x1160, 'IS', '2')] : []),
        ]),
      ]),
      sq(0x0020, 0x9113, [
        element(
          0x0020,
          0x0032,
          'DS',
          [10, 20, slice.position[2] + (shifted ? 0.5 : 0)].join('\\'),
        ),
      ]),
      sq(0x0062, 0x000a, [element(0x0062, 0x000b, 'US', u16(i + 1))]),
    ]),
  );
  return Buffer.concat([
    Buffer.alloc(128),
    Buffer.from('DICM'),
    element(2, 0x0010, 'UI', '1.2.840.10008.1.2.1'),
    element(8, 0x0016, 'UI', '1.2.840.10008.5.1.4.1.1.66.4'),
    element(0x20, 0x000d, 'UI', studyId),
    element(0x20, 0x0052, 'UI', id),
    ...[
      [2, 1],
      [0x10, 3],
      [0x11, 3],
      [0x100, 1],
      [0x101, 1],
      [0x102, 0],
      [0x103, 0],
    ].map(([tag, n]) => element(0x28, tag, 'US', u16(n))),
    element(0x28, 8, 'IS', '2'),
    element(0x62, 1, 'CS', 'BINARY'),
    sq(
      0x62,
      2,
      ...[1, 2].map((n) => [
        element(0x62, 4, 'US', u16(n)),
        element(0x62, 5, 'LO', `Região ${n}`),
      ]),
    ),
    shared,
    frames,
    // 9 pixels per frame, so the second frame starts in the middle of byte 1.
    element(0x7fe0, 0x10, 'OB', Buffer.from([16, 3, 2, 0])),
  ]);
}

test('maps binary SEG frames to referenced, physically matching source cuts without byte restart', () => {
  const regions = parseDicomSeg(segmentation(), phantom);
  assert.deepEqual(
    regions.map((region) => [...region.mask.keys()]),
    [[2], [0]],
  );
  assert.deepEqual([...regions[0].mask.get(2)], [0, 0, 0, 0, 1, 0, 0, 0, 1]);
  assert.deepEqual([...regions[1].mask.get(0)], [1, 0, 0, 0, 0, 0, 0, 0, 1]);
});
test('refuses wrong study frame, wrong SOP references, wrong source frames and displaced SEG planes', () => {
  assert.throws(
    () => parseDicomSeg(segmentation({ id: '1.2.4' }), phantom),
    /coordenadas da máscara/,
  );
  for (const options of [
    { wrongReference: true },
    { wrongFrame: true },
    { shifted: true },
  ]) {
    assert.throws(
      () => parseDicomSeg(segmentation(options), phantom),
      /fora da grade/,
    );
  }
});

test('coronal brush updates the same voxel and reconstructs its physical extents in reverse-oriented DICOM', () => {
  const cursor = { column: 1, row: 2, slice: 0 };
  const mark = [{ x: 1, y: 1 }];
  const marked = paintLesion(
    new Map(),
    phantom,
    'row',
    cursor,
    mark,
    0.9,
    4,
    1,
  );
  assert.deepEqual([...marked.keys()], [1]);
  assert.deepEqual([...marked.get(1)], [0, 0, 0, 0, 0, 0, 0, 1, 0]);
  const surface = makeLesionSurface(
    {
      rows: 3,
      columns: 3,
      origins: phantom.slices.map((slice) => slice.position),
      columnVector: [-3, 0, 0],
      rowVector: [0, -2, 0],
      normal: [0, 0, 1],
      stepMm: 4,
    },
    marked,
  );
  assert.equal(surface.indices.length, 36);
  assert.equal(surface.volumeMl, 0.024);
  const coords = Array.from(surface.positions);
  const bounds = [0, 1, 2].map((i) => {
    const axis = coords.filter((_, index) => index % 3 === i);
    return [Math.min(...axis), Math.max(...axis)];
  });
  assert.deepEqual(bounds, [
    [5.5, 8.5],
    [15, 17],
    [32, 36],
  ]);
  assert.ok(
    mprPlaneCorners(phantom, 'source', 1, null).every(
      (corner) => corner[2] === 34,
    ),
  );
  assert.ok(
    mprPlaneCorners(phantom, 'row', 1, [7, 16, 34]).every(
      (corner) => corner[1] === 16,
    ),
  );
  assert.ok(
    mprPlaneCorners(phantom, 'column', 1, [7, 16, 34]).every(
      (corner) => corner[0] === 7,
    ),
  );
  assert.equal(
    paintLesion(marked, phantom, 'column', cursor, [{ x: 2, y: 1 }], 0.9, 4, 0)
      .size,
    0,
  );
  assert.equal(marked.get(1)[7], 1);
});

const { echoBeamFor, echoCinePhase, echoWindows, echoProbeFeedback } =
  await import(await moduleUrl('echo-windows'));
test('rotating in the parasternal window changes axes, and cine marks constrain timing', () => {
  const probe = { ...echoWindows.plax, depth: 175 };
  assert.equal(echoBeamFor(probe).window, 'plax');
  assert.equal(
    echoBeamFor({ ...probe, roll: echoWindows.psax.roll }).window,
    'psax',
  );
  assert.equal(echoBeamFor({ ...probe, x: 0.14, y: 0.65 }), null);
  const marks = { start: 1.0, systole: 1.3, end: 1.8 };
  assert.equal(echoCinePhase(1.3, marks), 0.43);
  assert.equal(echoCinePhase(1.8, marks), 1);
  assert.equal(echoCinePhase(1.6, { ...marks, start: 1.4 }), null);
});

test('keeps the nearest physical voxel between series only within the same DICOM reference frame', () => {
  const shifted = {
    ...phantom,
    slices: phantom.slices.map((slice) => ({
      ...slice,
      position: [13, 20, slice.position[2]],
    })),
  };
  assert.deepEqual(correspondingCursor(phantom, shifted, [10, 18, 34]), {
    column: 1,
    row: 1,
    slice: 1,
  });
  assert.equal(correspondingCursor(phantom, shifted, [40, 18, 34]), null);
  assert.equal(
    correspondingCursor(
      phantom,
      {
        ...shifted,
        slices: shifted.slices.map((slice) => ({
          ...slice,
          referenceId: '1.8.7',
        })),
      },
      [10, 18, 34],
    ),
    null,
  );
});

const { encodeDicomSeg } = await import(
  await moduleUrl('dicom-seg-export', {
    './mpr': mpr,
    './lesion-mask': mask,
  })
);
test('round-trips named lesions and packed multi-frame references through DICOM SEG', () => {
  const acquired = {
    ...phantom,
    slices: phantom.slices.map((slice, i) => ({
      ...slice,
      sopInstanceId: '1.2.3.4',
      frameNumber: i + 1,
    })),
  };
  const original = parseDicomSeg(segmentation(), phantom);
  const edited = [
    {
      label: 'Lesão occipital',
      mask: propagateLesion(original[0].mask, 2, -1, 1, 3),
    },
    { label: 'Região contralateral', mask: original[1].mask },
  ];
  const bytes = encodeDicomSeg(acquired, edited);
  assert.deepEqual(Buffer.from(bytes.subarray(128, 132)).toString(), 'DICM');
  assert.deepEqual(
    parseDicomSeg(bytes, acquired).map(({ label, mask }) => ({ label, mask })),
    edited,
  );
  assert.throws(() => parseDicomSeg(bytes, phantom), /fora da grade/);
});
test('propagation stops at an existing contour and never edits a shared slice buffer', () => {
  const a = Uint8Array.of(0, 1, 0);
  const b = Uint8Array.of(1, 0, 0);
  const result = propagateLesion(
    new Map([
      [0, a],
      [2, b],
    ]),
    0,
    1,
    5,
    5,
  );
  assert.equal(result.size, 3);
  assert.deepEqual(result.get(1), a);
  assert.deepEqual(result.get(2), b);
});

test('echo exercise distinguishes displacement, rotation and tilt across the wraparound', () => {
  const probe = { ...echoWindows.psax, depth: 170 };
  assert.deepEqual(echoProbeFeedback(probe, 'psax'), {
    correct: true,
    hints: [],
  });
  const wrong = echoProbeFeedback(
    { ...probe, x: 0.25, roll: 175, tilt: 14 },
    'psax',
  );
  assert.deepEqual(wrong.hints, [
    'Desloque a sonda à esquerda do paciente.',
    'Gire o transdutor no sentido anti-horário.',
    'Reduza a inclinação do feixe.',
  ]);
});

const dicom = await moduleUrl('dicom', { 'dicom-parser': adapter });
const { readUltrasoundVolume } = await import(
  await moduleUrl('ultrasound-volume', { './dicom': dicom, './mpr': mpr })
);
const fd = (values) => {
  const bytes = Buffer.alloc(values.length * 8);
  values.forEach((value, i) => bytes.writeDoubleLE(value, i * 8));
  return bytes;
};
function enhancedUltrasound({
  displaced = false,
  timed = true,
  wrongClass = false,
} = {}) {
  const slices = timed
    ? [
        [3, 6, 40],
        [2, 0, 10],
        [3, 0, 50],
        [2, 6, 20],
      ]
    : [
        [2, 6, 20],
        [2, 0, 10],
      ];
  const perFrame = slices.map(([time, z]) => [
    sq(0x20, 0x930e, [
      element(0x20, 0x9301, 'FD', fd([displaced && time === 3 ? 1 : 0, 0, z])),
    ]),
    ...(timed
      ? [sq(0x20, 0x9310, [element(0x20, 0x930d, 'FD', fd([time]))])]
      : []),
  ]);
  return Buffer.concat([
    Buffer.alloc(128),
    Buffer.from('DICM'),
    element(2, 0x10, 'UI', '1.2.840.10008.1.2.1'),
    element(
      8,
      0x16,
      'UI',
      wrongClass
        ? '1.2.840.10008.5.1.4.1.1.3.1'
        : '1.2.840.10008.5.1.4.1.1.6.2',
    ),
    element(8, 0x60, 'CS', 'US'),
    element(0x28, 0x0004, 'CS', 'MONOCHROME2'),
    element(0x28, 0x0008, 'IS', String(slices.length)),
    ...[
      [2, 1],
      [0x10, 2],
      [0x11, 2],
      [0x100, 8],
      [0x101, 8],
      [0x102, 7],
      [0x103, 0],
    ].map(([tag, value]) => element(0x28, tag, 'US', u16(value))),
    sq(0x5200, 0x9229, [
      sq(0x20, 0x930f, [element(0x20, 0x9302, 'FD', fd([1, 0, 0, 0, 1, 0]))]),
      sq(0x28, 0x9110, [element(0x28, 0x0030, 'DS', '2\\3')]),
    ]),
    sq(0x5200, 0x9230, ...perFrame),
    element(
      0x7fe0,
      0x0010,
      'OB',
      Buffer.from(slices.flatMap(([, , value]) => Array(4).fill(value))),
    ),
  ]);
}
test('Enhanced US uses physical positions and recorded temporal offsets to reconstruct independent volumes', () => {
  const phases = readUltrasoundVolume(enhancedUltrasound());
  assert.deepEqual(
    phases.map((phase) => phase.time),
    [0, 1],
  );
  assert.deepEqual(
    phases.map((phase) =>
      phase.series.slices.map((slice) => [slice.position[2], slice.pixels[0]]),
    ),
    [
      [
        [0, 10],
        [6, 20],
      ],
      [
        [0, 50],
        [6, 40],
      ],
    ],
  );
  assert.equal(
    readUltrasoundVolume(enhancedUltrasound({ timed: false })).length,
    1,
  );
  assert.throws(
    () => readUltrasoundVolume(enhancedUltrasound({ displaced: true })),
    /mesma grade/,
  );
  assert.throws(
    () => readUltrasoundVolume(enhancedUltrasound({ wrongClass: true })),
    /Enhanced US Volume/,
  );
});
