import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

async function loadDicom() {
  let source = await readFile('app/dicom.ts', 'utf8');
  source = source.replace(
    "import { parseDicom, type DataSet } from 'dicom-parser';",
    `import dicomParser from ${JSON.stringify(pathToFileURL(resolve("node_modules/dicom-parser/dist/dicomParser.min.js")).href)}; const { parseDicom } = dicomParser;`,
  );
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
}
const { parseDicomImage, groupDicomSeries, planeForSlice, sliceFraction } = await loadDicom();

const enc = new TextEncoder();
const u16 = (n) => Uint8Array.of(n & 255, n >> 8);
const u32 = (n) => Uint8Array.of(n & 255, n >> 8, n >> 16, n >> 24);
const join = (...parts) => { const all = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let at = 0; for (const part of parts) { all.set(part, at); at += part.length; } return all; };
function element(group, element, vr, value) {
  let bytes = typeof value === 'string' ? enc.encode(value + (value.length % 2 ? ' ' : '')) : value;
  const long = ['OB', 'OD', 'OF', 'OL', 'OW', 'SQ', 'UC', 'UR', 'UT', 'UN'].includes(vr);
  return join(u16(group), u16(element), enc.encode(vr), long ? new Uint8Array(2) : new Uint8Array(), long ? u32(bytes.length) : u16(bytes.length), bytes);
}
function dicom({ position = '0\\0\\0', orientation = '1\\0\\0\\0\\1\\0', series = '1.2.3', pixels = [-1000, 0, 500, 1000], samples = 1, frames = '1', syntax = '1.2.840.10008.1.2.1', signed = 1 } = {}) {
  const pixelBytes = new Uint8Array(8); pixels.forEach((value, i) => { pixelBytes[i * 2] = value & 255; pixelBytes[i * 2 + 1] = (value >> 8) & 255; });
  return join(new Uint8Array(128), enc.encode('DICM'),
    element(2, 0x0010, 'UI', syntax),
    element(8, 0x0060, 'CS', 'CT'), element(0x20, 0x000e, 'UI', series), element(0x20, 0x0013, 'IS', '2'),
    element(0x20, 0x0032, 'DS', position), element(0x20, 0x0037, 'DS', orientation),
    element(0x28, 0x0002, 'US', u16(samples)), element(0x28, 0x0004, 'CS', samples === 1 ? 'MONOCHROME2' : 'RGB'), element(0x28, 0x0008, 'IS', frames),
    element(0x28, 0x0010, 'US', u16(2)), element(0x28, 0x0011, 'US', u16(2)), element(0x28, 0x0100, 'US', u16(16)), element(0x28, 0x0101, 'US', u16(16)), element(0x28, 0x0102, 'US', u16(15)), element(0x28, 0x0103, 'US', u16(signed)),
    element(0x28, 0x1052, 'DS', '-1024'), element(0x28, 0x1053, 'DS', '1'), element(0x28, 0x1050, 'DS', '40'), element(0x28, 0x1051, 'DS', '400'), element(0x7fe0, 0x0010, 'OW', pixelBytes));
}

test('reads native single-frame monochrome CT pixels without retaining patient tags', () => {
  const image = parseDicomImage(dicom(), 'slice.dcm');
  assert.equal(image.modality, 'CT');
  assert.deepEqual([...image.pixels], [-1000, 0, 500, 1000]);
  assert.equal(image.intercept, -1024);
  assert.equal(image.windowWidth, 400);
  assert.equal(planeForSlice(image), 'axial');
  assert.equal('patientName' in image, false);
});

test('groups by series and physically orders slices using image position', () => {
  const superior = parseDicomImage(dicom({ position: '0\\0\\10' }), 'superior.dcm');
  const inferior = parseDicomImage(dicom({ position: '0\\0\\-10' }), 'inferior.dcm');
  const grouped = groupDicomSeries([superior, inferior]);
  assert.equal(grouped.length, 1);
  assert.deepEqual(grouped[0].slices.map((slice) => slice.position?.[2]), [-10, 10]);
});

test('preserves unsigned 16-bit samples and synchronizes on increasing LPS coordinate', () => {
  const low = parseDicomImage(dicom({ signed: 0, pixels: [65535, 0, 1, 2], position: '0\\0\\-4', orientation: '1\\0\\0\\0\\-1\\0' }), 'low.dcm');
  const high = parseDicomImage(dicom({ signed: 0, pixels: [65535, 0, 1, 2], position: '0\\0\\4', orientation: '1\\0\\0\\0\\-1\\0' }), 'high.dcm');
  assert.equal(low.pixels[0], 65535);
  assert.equal(sliceFraction([low, high], high), 1);
  assert.equal(sliceFraction([low, high], low), 0);
});

test('refuses oblique and in-plane rotated acquisitions for atlas synchronization', () => {
  const axial = parseDicomImage(dicom({ position: '0\\0\\0' }), 'axial.dcm');
  const rotated = parseDicomImage(dicom({ position: '0\\0\\1', orientation: '0\\1\\0\\-1\\0\\0' }), 'rotated.dcm');
  const oblique = parseDicomImage(dicom({ orientation: '0.99\\0\\0.141\\0\\1\\0' }), 'oblique.dcm');
  assert.equal(groupDicomSeries([axial, rotated]).length, 0);
  assert.equal(planeForSlice(oblique), null);
});

test('rejects unsupported RGB, multiframe, and compressed inputs', () => {
  assert.throws(() => parseDicomImage(dicom({ samples: 3 })), /RGB|monocromáticas/);
  assert.throws(() => parseDicomImage(dicom({ frames: '2' })), /multiframes/);
  assert.throws(() => parseDicomImage(dicom({ syntax: '1.2.840.10008.1.2.4.50' })), /comprimida/);
});
