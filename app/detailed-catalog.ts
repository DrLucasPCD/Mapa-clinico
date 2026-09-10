export type DetailedModelVariant = 'male' | 'female';
export type DetailedCatalogEntry = {
  id: string; name: string; system: string; objectCount: 1;
  sourceId: string; sourceName: string; aliases: string[];
};

type Organ = { organ_id: string; name_en: string; system: string; node: string; path: string[] };
const urls = { male: '/models/detailed/manifest.json', female: '/models/detailed/manifest_female.json' } as const;
const cache = new Map<DetailedModelVariant, Promise<{ organs: Organ[] }>>();

function slug(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/\(left\)|\.l$/g, ' left').replace(/\(right\)|\.r$/g, ' right')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function detailedAliases(organ: Organ): string[] {
  const id = organ.organ_id.replace(/_l$/, '_left').replace(/_r$/, '_right').replace(/_/g, '-');
  const name = slug(organ.name_en), path = organ.path.map(slug).filter(Boolean);
  const aliases = new Set([id, name]);
  const legacy: Record<string, string> = { deltoid: 'deltoid-muscles', supraspinatus: 'rotator-cuff-muscles-supraspinatus', infraspinatus: 'rotator-cuff-muscles-infraspinatus', subscapularis: 'rotator-cuff-muscles-subscapularis', gluteus_medius: 'superficial-gluteal-muscles-gluteus-medius' };
  const base = organ.organ_id.replace(/_[lr]$/, '').replace(/_muscle$/, '').replace(/^.*_part_of_deltoid$/, 'deltoid');
  if (legacy[base]) aliases.add(legacy[base] + (/_l$/.test(organ.organ_id) ? '-left' : '-right'));

  for (let i = 0; i < path.length; i++) aliases.add([...path.slice(i), name].join('-'));
  if (organ.path.some((part) => /cerebrum/i.test(part))) aliases.add(`cerebrum-${name}`);
  if (/^(left|right)_(atrium|ventricle)$/.test(organ.organ_id)) aliases.add(`heart-${id}`);
  if (/^kidney_[lr]$/.test(organ.organ_id)) aliases.add(`kidneys-${id}`);
  return [...aliases];
}

export async function getDetailedCatalog(variant: DetailedModelVariant): Promise<DetailedCatalogEntry[]> {
  let request = cache.get(variant);
  if (!request) {
    request = fetch(urls[variant]).then(async (response) => {
      if (!response.ok) throw new Error(`Detailed anatomy manifest failed (HTTP ${response.status}).`);
      return response.json();
    });
    cache.set(variant, request);
    request.catch(() => cache.delete(variant));
  }
  const manifest = await request;
  return manifest.organs.map((organ) => ({
    id: organ.organ_id.replace(/_l$/, '_left').replace(/_r$/, '_right').replace(/_/g, '-'),
    name: organ.name_en,
    system: organ.system === 'renal' ? 'urinary' : organ.system,
    objectCount: 1,
    sourceId: organ.organ_id,
    sourceName: organ.node,
    aliases: detailedAliases(organ),
  }));
}
