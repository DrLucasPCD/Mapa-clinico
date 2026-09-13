import type { SliceFrame } from './patient-geometry';

export type OverlaySystem = 'nervous' | 'cardiovascular' | 'skeletal';
export type OverlayClip = 'volume' | 'axial' | 'coronal' | 'sagital';

export function overlayStyle(
  system: string,
  anatomyId: string,
  enabled: readonly OverlaySystem[],
) {
  if (!enabled.includes(system as OverlaySystem)) return null;
  if (system === 'cardiovascular') {
    const vein = /vein|venous|vena/.test(anatomyId);
    return { color: vein ? '#4f8dd8' : '#ef4055', opacity: 0.9 };
  }
  if (system === 'nervous') return { color: '#76d7dc', opacity: 0.42 };
  return { color: '#eee0bd', opacity: 0.28 };
}

export type PlaneEquation = { normal: [number, number, number]; constant: number };

/** Returns the two patient-space planes that retain one voxel-thick slab. */
export function slabPlaneEquations(
  frame: SliceFrame,
  point: readonly number[] | null | undefined,
  clip: OverlayClip,
  sliceStepMm: number,
): PlaneEquation[] {
  if (
    clip === 'volume' ||
    !point ||
    point.length !== 3 ||
    !point.every(Number.isFinite)
  ) return [];
  const [normal, spacing] = clip === 'axial'
    ? [frame.normal, sliceStepMm]
    : clip === 'coronal'
      ? [frame.columnDirection, frame.rowSpacing]
      : [frame.rowDirection, frame.columnSpacing];
  if (!Number.isFinite(spacing) || spacing <= 0) return [];
  const location = normal[0] * point[0] + normal[1] * point[1] + normal[2] * point[2];
  const half = Math.max(0.5, spacing / 2);
  const opposite = normal.map((value) => value === 0 ? 0 : -value) as [number, number, number];
  return [
    { normal: [...normal], constant: -(location - half) },
    { normal: opposite, constant: location + half },
  ];
}
