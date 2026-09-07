export type AtlasGroup = {
  id: string;
  center: { x: number; y: number; z: number };
  size: { x: number; y: number; z: number };
};

/**
 * Returns a stable catalogue layout for complete selectable structures.  Meshes
 * with the same anatomy id retain their relative shape; only their shared
 * group offset changes.
 */
export function catalogueLayout(groups: AtlasGroup[]) {
  const ordered = [...groups].sort((a, b) => a.id.localeCompare(b.id));
  if (!ordered.length)
    return new Map<string, { x: number; y: number; z: number }>();
  const widest = Math.max(
    ...ordered.map((group) => Math.max(group.size.x, group.size.y)),
    0.12,
  );
  const columns = Math.ceil(Math.sqrt(ordered.length));
  const rows = Math.ceil(ordered.length / columns);
  const gap = widest * 1.35;
  return new Map(
    ordered.map((group, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      return [
        group.id,
        {
          x: (column - (columns - 1) / 2) * gap,
          y: ((rows - 1) / 2 - row) * gap,
          z: 0,
        },
      ];
    }),
  );
}

export function isFootStructure(id: string) {
  return /(?:foot|toe|talus|calcane|tarsal|metatars|plantar)/.test(id);
}

export function inAtlasRegion(
  region: 'all' | 'arm' | 'ankle' | undefined,
  id: string,
  center: { x: number; y: number; z: number },
) {
  if (!region || region === 'all') return true;
  if (region === 'ankle')
    return (
      isFootStructure(id) || (Math.abs(center.x) < 0.18 && center.y < 0.22)
    );
  // The spatial condition includes vessels and nerves whose IDs do not name a hand bone.
  return (
    /(?:arm|hand|forearm|shoulder|axillary|humerus|radius|ulna|carpal|metacarp|finger|thumb|brach|biceps|triceps|deltoid)/.test(
      id,
    ) ||
    (Math.abs(center.x) > 0.18 && center.y > 0.65 && center.y < 1.45)
  );
}
