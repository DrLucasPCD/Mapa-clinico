import type { SliceFrame } from './patient-geometry';
import type { MprGeometry } from './mpr';

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
  labels: MprGeometry['labels'] = { source: 'axial', row: 'coronal', column: 'sagital' },
): PlaneEquation[] {
  if (
    clip === 'volume' ||
    !point ||
    point.length !== 3 ||
    !point.every(Number.isFinite)
  ) return [];
  const [normal, spacing] = clip === labels.source
    ? [frame.normal, sliceStepMm]
    : clip === labels.row
      ? [frame.columnDirection, frame.rowSpacing]
      : [frame.rowDirection, frame.columnSpacing];
  if (!Number.isFinite(spacing) || spacing <= 0) return [];
  const location = normal[0] * point[0] + normal[1] * point[1] + normal[2] * point[2];
  const half = spacing / 2;
  const opposite = normal.map((value) => value === 0 ? 0 : -value) as [number, number, number];
  return [
    { normal: [...normal], constant: -(location - half) },
    { normal: opposite, constant: location + half },
  ];
}
