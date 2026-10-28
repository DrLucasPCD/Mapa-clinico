import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile('app/ultrasound-data.ts', 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const { ultrasoundCases, ultrasoundZoneAt, ultrasoundViewFor } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

test('probe position selects only the zones documented by the chosen case', () => {
  assert.equal(ultrasoundZoneAt({ x: .43, y: .45 }, '27525'), 'gallbladder');
  assert.equal(ultrasoundZoneAt({ x: .72, y: .57 }, '27525'), null);
  assert.equal(ultrasoundZoneAt({ x: .5, y: .79 }, '64279'), 'bladder');
  assert.equal(ultrasoundZoneAt({ x: .5, y: .79 }, '148000'), 'bladder');
});

test('rotation changes only between real frames of the same case', () => {
  const first = ultrasoundViewFor('27525', 'gallbladder', -90);
  const second = ultrasoundViewFor('27525', 'gallbladder', 90);
  assert.notEqual(first.image, second.image);
  assert.equal(first.source, second.source);
  assert.equal(ultrasoundViewFor('27525', 'liver', 0), null);
  assert.equal(ultrasoundViewFor('64279', 'bladder', 0).source, 'https://radiopaedia.org/cases/64279');
});

test('every simulator frame is a bundled real image attributed to its case', async () => {
  for (const [id, item] of Object.entries(ultrasoundCases)) {
    for (const views of Object.values(item.zoneViews)) for (const view of views) {
      assert.equal(view.source, item.source, `wrong source for rID ${id}`);
      assert.equal(view.author, item.author, `wrong author for rID ${id}`);
      assert.ok((await stat(`public${view.image}`)).size > 10000, `missing frame ${view.image}`);
    }
  }
});
