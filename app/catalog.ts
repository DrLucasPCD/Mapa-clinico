import entries from './atlas-catalog.json';
import { lessons } from './content';
export type AtlasStructure = {
  id: string;
  name: string;
  system: string;
  objectCount: number;
  aliases?: string[];
};
export const ATLAS_STRUCTURE_COUNT = entries.length;
export const ATLAS_MESH_COUNT = entries.reduce(
  (sum, item) => sum + item.objectCount,
  0,
);
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
const aliases: Record<string, string> = {
  heart: 'Coração',
  cerebrum: 'Encéfalo',
  lungs: 'Pulmões',
  liver: 'Fígado',
  trachea: 'Traqueia',
  oesophagus: 'Esôfago',
  stomach: 'Estômago',
  spleen: 'Baço',
  pancreas: 'Pâncreas',
  kidneys: 'Rins',
  bladder: 'Bexiga',
  aorta: 'Aorta',
};
const terms: [RegExp, string][] = [
  [/\bright\b/gi, 'direito'],
  [/\bleft\b/gi, 'esquerdo'],
  [/\bmuscle\b/gi, 'músculo'],
  [/\bbone\b/gi, 'osso'],
  [/\bartery\b/gi, 'artéria'],
  [/\bvein\b/gi, 'veia'],
  [/\bnerve\b/gi, 'nervo'],
  [/\btendon\b/gi, 'tendão'],
  [/\btibia\b/gi, 'tíbia'],
  [/\bfibula\b/gi, 'fíbula'],
  [/\bhumerus\b/gi, 'úmero'],
  [/\bradius\b/gi, 'rádio'],
  [/\bscapula\b/gi, 'escápula'],
  [/\bclavicle\b/gi, 'clavícula'],
  [/\bfemur\b/gi, 'fêmur'],
  [/\bpatella\b/gi, 'patela'],
];
/** Preserve source names, with Portuguese lesson names and search synonyms. */
export function searchAtlasStructures(
  query: string,
  system = 'all',
  limit = 30,
  catalogue: AtlasStructure[] = entries,
): AtlasStructure[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return catalogue
    .filter((item) => {
      if (system !== 'all' && item.system !== system) return false;
      const lesson = lessons.find((l) => item.id === l.id);
      const translated = terms.reduce(
        (text, [pattern, replacement]) => text.replace(pattern, replacement),
        item.name,
      );
      const text = normalize(
        [item.id, item.name, translated, aliases[item.id], lesson?.name, ...(item.aliases ?? [])]
          .filter(Boolean)
          .join(' '),
      );
      return words.every((word) => text.includes(word));
    })
    .slice(0, limit)
    .map((item) => ({
      ...item,
      name:
        lessons.find((l) => l.id === item.id)?.name ||
        aliases[item.id] ||
        item.name,
    }));
}
