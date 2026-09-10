import { detailedAliases } from './detailed-catalog';
import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export type DetailedModelVariant = 'male' | 'female';

export type DetailedManifestOrgan = {
  organ_id: string;
  name_en: string;
  ta2_latin: string;
  system: string;
  mesh_file: string;
  node: string;
  path: string[];
};

export type DetailedManifest = {
  version: number;
  gender_model: DetailedModelVariant;
  license: string;
  attribution: string;
  credit: string;
  source?: Record<string, unknown>;
  systems: Array<{ system: string; organ_count: number; load_on_start: boolean }>;
  organs: DetailedManifestOrgan[];
};

const BASE = '/models/detailed/';
const TARGET_HEIGHT = 1.743;
const MALE_SOURCE_HEIGHT = 1.74372258190752;
const SCALE = TARGET_HEIGHT / MALE_SOURCE_HEIGHT;

/** Static metadata for model pickers; structure names are available from loadDetailedManifest. */
export const DETAILED_MODEL_CATALOG = {
  male: {
    label: 'Male whole body',
    manifestUrl: `${BASE}manifest.json`,
    structureCount: 3478,
    license: 'CC-BY-SA-4.0',
    source: 'Z-Anatomy / BodyParts3D (DBCLS)',
    systems: ['articular', 'cardiovascular', 'digestive', 'endocrine', 'lymphatic', 'muscular', 'nervous', 'regional', 'renal', 'reproductive', 'respiratory', 'skeletal'],
    sourceBounds: { min: [-0.340059, -0.000382, -0.165944], max: [0.340059, 1.74334, 0.154378] },
  },
  female: {
    label: 'Female trunk',
    manifestUrl: `${BASE}manifest_female.json`,
    structureCount: 264,
    license: 'CC-BY-4.0',
    source: 'NIH Human Reference Atlas / Visible Human Female (NLM)',
    systems: ['cardiovascular', 'digestive', 'integumentary', 'lymphatic', 'renal', 'reproductive', 'skeletal'],
    sourceBounds: { min: [-0.166996, -0.052087, -0.182455], max: [0.149842, 0.717912, 0.089364] },
  },
} as const;

const manifestCache = new Map<DetailedModelVariant, Promise<DetailedManifest>>();

export function loadDetailedManifest(variant: DetailedModelVariant): Promise<DetailedManifest> {
  const cached = manifestCache.get(variant);
  if (cached) return cached;
  const promise = fetch(DETAILED_MODEL_CATALOG[variant].manifestUrl).then(async (response) => {
    if (!response.ok) throw new Error(`Detailed anatomy manifest failed (HTTP ${response.status}).`);
    return (await response.json()) as DetailedManifest;
  });
  manifestCache.set(variant, promise);
  promise.catch(() => manifestCache.delete(variant));
  return promise;
}

export type DetailedCatalogEntry = {
  id: string;
  name: string;
  system: string;
  objectCount: 1;
  sourceId: string;
  sourceName: string;
  aliases: string[];
};

/** Search/catalog rows without paying the cost of loading any GLB geometry. */
export async function getDetailedCatalog(variant: DetailedModelVariant): Promise<DetailedCatalogEntry[]> {
  const manifest = await loadDetailedManifest(variant);
  return manifest.organs.map((organ) => ({
    id: organ.organ_id.replace(/_l$/, '_left').replace(/_r$/, '_right').replace(/_/g, '-'),
    name: organ.name_en,
    system: organ.system === 'renal' ? 'urinary' : organ.system,
    objectCount: 1,
    sourceId: organ.organ_id,
    sourceName: organ.node,
    aliases: aliasesForDetailedStructure(organ),
  }));
}

function slug(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\(left\)|\.l$/g, ' left')
    .replace(/\(right\)|\.r$/g, ' right')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Legacy Atlas names plus hierarchy-derived aliases used by lessons and search. */
export function aliasesForDetailedStructure(organ: DetailedManifestOrgan): string[] { return detailedAliases(organ); }

export function detailedStructureMatches(mesh: THREE.Object3D, selection: string): boolean {
  if (!selection) return false;
  const [base, side] = selection.split('@');
  const wantedSide = side === 'left' || side === 'right' ? side : '';
  const values = [String(mesh.userData.anatomyId || ''), ...(mesh.userData.aliases || [])];
  return values.some((value) => value.includes(base) && (!wantedSide || value.endsWith(`-${wantedSide}`)));
}

function loadGlb(loader: GLTFLoader, url: string): Promise<THREE.Group> {
  return new Promise((resolve, reject) => loader.load(url, (gltf) => resolve(gltf.scene), undefined, reject));
}

/** Load one complete atlas and return independent meshes in legacy metre coordinates. */
export async function loadDetailedModel(
  variant: DetailedModelVariant,
  onProgress?: (message: string) => void,
): Promise<THREE.Group> {
  onProgress?.('Carregando catálogo anatômico…');
  const manifest = await loadDetailedManifest(variant);
  const files = [...new Set(manifest.organs.map((organ) => organ.mesh_file))].sort();
  const draco = new DRACOLoader();
  draco.setDecoderPath(`${BASE}draco/`);
  draco.preload();
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const scenes: THREE.Group[] = [];
  try {
    for (let index = 0; index < files.length; index += 1) {
      onProgress?.(`Carregando anatomia detalhada • ${Math.round((index / files.length) * 100)}%`);
      scenes.push(await loadGlb(loader, `${BASE}${files[index]}`));
    }
  } finally {
    draco.dispose();
  }

  const nodes = new Map<string, THREE.Mesh>();
  for (let index = 0; index < scenes.length; index += 1) {
    const scene = scenes[index];
    scene.updateMatrixWorld(true);
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) nodes.set(`${files[index]}\0${object.name}`, object);
    });
  }

  // Male source is already a 1.743 m standing body. The female source is a
  // true 0.77 m trunk; its offset is the median alignment of 66 homologous
  // structures, so it keeps physical scale instead of being stretched.
  const offset = variant === 'male'
    ? new THREE.Vector3(0, 0.0003824472868535467, 0.005783102513088)
    : new THREE.Vector3(0.008577220142603874, 0.8434303684788143, 0.04654541239142418);
  const root = new THREE.Group();
  root.name = `detailed-${variant}`;
  root.userData = {
    variant,
    license: manifest.license,
    attribution: manifest.attribution,
    credit: manifest.credit,
    orientation: 'Y-up; anterior +Z; patient left +X',
    sourceBounds: DETAILED_MODEL_CATALOG[variant].sourceBounds,
  };

  const missing: string[] = [];
  for (const organ of manifest.organs) {
    const source = nodes.get(`${organ.mesh_file}\0${organ.node}`)
      ?? nodes.get(`${organ.mesh_file}\0${THREE.PropertyBinding.sanitizeNodeName(organ.node)}`);
    if (!source) {
      missing.push(organ.node);
      continue;
    }
    const geometry = source.geometry.clone();
    geometry.applyMatrix4(source.matrixWorld);
    geometry.translate(offset.x, offset.y, offset.z);
    geometry.scale(SCALE, SCALE, SCALE);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const palette: Record<string, string> = { skeletal: '#e7d7b5', muscular: '#b34e4b', articular: '#c3d8dc', cardiovascular: '#c83f48', nervous: '#e6cb77', digestive: '#c89079', renal: '#ab5755', reproductive: '#cb8d97', respiratory: '#cb949b', lymphatic: '#77a27a', endocrine: '#d9a067', integumentary: '#c8a68e', regional: '#c8a68e' };
    const color = /vein|venous|vena_/.test(organ.organ_id) ? '#567fbd' : /fascia|tendon|ligament/.test(organ.organ_id) ? '#ded9c8' : palette[organ.system] ?? '#c6b5a0';
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0 });
    const mesh = new THREE.Mesh(geometry, material);
    const canonicalId = organ.organ_id.replace(/_l$/, '_left').replace(/_r$/, '_right').replace(/_/g, '-');
    mesh.name = organ.name_en;
    mesh.userData = {
      anatomyId: canonicalId,
      isEnvelope: organ.system === 'regional' || organ.system === 'integumentary' || /(?:^|_)fascia(?:_|$)/.test(organ.organ_id),
      anatomySystem: organ.system === 'renal' ? 'urinary' : organ.system,
      sourceName: organ.name_en,
      sourceNode: organ.node,
      ta2Latin: organ.ta2_latin,
      aliases: aliasesForDetailedStructure(organ),
      sourceFile: organ.mesh_file,
      sourcePath: organ.path,
      modelVariant: variant,
    };
    root.add(mesh);
  }
  if (missing.length) throw new Error(`${variant} detailed atlas is missing ${missing.length} manifest meshes (first: ${missing[0]}).`);
  // GLTFLoader's source scenes are no longer rendered after their geometry and
  // materials have been cloned and baked into the flat group.
  for (const scene of scenes) scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => material.dispose());
  });
  root.updateMatrixWorld(true);
  onProgress?.('');
  return root;
}
