import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const curriculum = JSON.parse(await readFile('app/curriculum.json', 'utf8'));
const vessels = JSON.parse(await readFile('app/vessels.json', 'utf8'));

function uniqueIds(items, label) {
  const ids = items.map((item) => item.id);
  assert.equal(
    new Set(ids).size,
    ids.length,
    `${label} IDs must be unique`,
  );
  assert(ids.every((id) =>
    (typeof id === 'string' && id.length > 0) ||
    (Number.isInteger(id) && id >= 0),
  ));
}

function citedPages(value) {
  return String(value)
    .split(',')
    .flatMap((part) => {
      const match = part.trim().match(/^(\d+)(?:[–-](\d+))?$/);
      assert(match, `Invalid page citation: ${value}`);
      const first = Number(match[1]);
      const last = Number(match[2] ?? match[1]);
      assert(first > 0 && last >= first, `Invalid page range: ${value}`);
      return [first, last];
    });
}

test('Study sources, modules, and citations form a consistent catalog', () => {
  assert.equal(curriculum.modules.length, 33, 'StudyPanel advertises 33 topics');
  uniqueIds(curriculum.sources, 'Source');
  uniqueIds(curriculum.modules, 'Module');

  const sources = new Map(curriculum.sources.map((source) => [source.id, source]));
  for (const source of curriculum.sources) {
    assert.equal(typeof source.pages, 'number');
    assert(source.pages > 0);
    assert(source.title);
  }

  for (const module of curriculum.modules) {
    const source = sources.get(module.source);
    assert(source, `Module ${module.id} references missing source ${module.source}`);
    assert(module.title && module.group && module.structure);
    assert(Array.isArray(module.points) && module.points.length > 0);
    assert(module.clinic && module.question && module.explanation);
    for (const page of citedPages(module.pages))
      assert(page <= source.pages, `Module ${module.id} cites page ${page} of ${source.pages}`);
    assert.match(module.reference, /^https:\/\/\S+$/);
  }
});

test('Every study question has distinct options and an in-range answer key', () => {
  for (const module of curriculum.modules) {
    assert(Array.isArray(module.options) && module.options.length >= 2);
    assert.equal(new Set(module.options).size, module.options.length, module.id);
    assert(Number.isInteger(module.correct), module.id);
    assert(module.correct >= 0 && module.correct < module.options.length, module.id);
    assert(module.options.every((option) => typeof option === 'string' && option.length > 0));
  }
});

test('Vessel IDs and parent links form one acyclic rooted tree', () => {
  assert.equal(vessels.length, 92, 'StudyPanel advertises 92 vessels');
  uniqueIds(vessels, 'Vessel');
  const byId = new Map(vessels.map((vessel) => [vessel.id, vessel]));
  const sourceIds = new Set(curriculum.sources.map((source) => source.id));
  const roots = vessels.filter((vessel) => vessel.parent === '');
  assert.equal(roots.length, 1, 'Expected exactly one vessel root');

  for (const vessel of vessels) {
    assert(vessel.name && vessel.territory && vessel.group);
    assert.equal(typeof vessel.parent, 'string');
    assert(byId.has(vessel.parent) || vessel.parent === '', `${vessel.id} has missing parent ${vessel.parent}`);
    assert(sourceIds.has(vessel.source), `${vessel.id} references missing source ${vessel.source}`);

    const seen = new Set();
    let current = vessel;
    while (current.parent !== '') {
      assert(!seen.has(current.id), `Cycle detected at vessel ${current.id}`);
      seen.add(current.id);
      current = byId.get(current.parent);
      assert(current, `${vessel.id} does not resolve to a root`);
    }
  }
});
