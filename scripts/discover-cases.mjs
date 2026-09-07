// Public NCBI E-utilities: metadata discovery only. Never scrape Radiopaedia.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const out = new URL('../public/data/discoveries.json', import.meta.url);
const query =
  '("Case Reports"[Publication Type]) AND (radiology[Title/Abstract] OR imaging[Title/Abstract])';
const base = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
async function get(endpoint, params) {
  const url = new URL(endpoint, base);
  const all = { ...params, retmode: 'json', tool: 'mapa_clinico' };
  if (process.env.NCBI_EMAIL) all.email = process.env.NCBI_EMAIL;
  url.search = new URLSearchParams(all).toString();
  for (let i = 0; i < 3; i++) {
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (res.ok) return res.json();
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
      continue;
    }
    throw Error(`NCBI returned ${res.status}`);
  }
  throw Error('NCBI unavailable after 3 attempts');
}
const search = await get('esearch.fcgi', {
  db: 'pubmed',
  term: query,
  datetype: 'pdat',
  reldate: '60',
  retmax: '24',
  sort: 'pub date',
});
if (search.error || !Array.isArray(search.esearchresult?.idlist))
  throw Error('Unexpected ESearch response');
const ids = search.esearchresult.idlist.filter((x) => /^\d+$/.test(x));
await new Promise((r) => setTimeout(r, 500));
const data = ids.length
  ? await get('esummary.fcgi', { db: 'pubmed', id: ids.join(',') })
  : { result: {} };
if (ids.length && !data.result) throw Error('Unexpected ESummary response');
const items = ids.map((id) => {
  const v = data.result[id];
  if (!v?.title) throw Error('Incomplete PubMed record');
  return {
    id,
    title: v.title,
    date: v.pubdate,
    source: 'PubMed / NCBI',
    url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
    authors: (v.authors || [])
      .slice(0, 3)
      .map((a) => a.name)
      .join(', '),
    status: 'Descoberta automática • ainda não revisada',
  };
});
await mkdir(new URL('../public/data/', import.meta.url), { recursive: true });
let old;
try {
  old = JSON.parse(await readFile(out, 'utf8'));
} catch {}
const content = {
  lastChecked: new Date().toISOString(),
  query,
  provider: 'NCBI E-utilities',
  items,
};
await writeFile(out, JSON.stringify(content, null, 2) + '\n');
console.log(
  `Discovery complete: ${items.length} records. Previous count: ${old?.items?.length ?? 0}.`,
);
