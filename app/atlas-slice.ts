/** Relative educational mapping. This is not registration to the patient. */
export type AtlasSlice = {
  plane: 'axial' | 'coronal' | 'sagital';
  fraction: number;
  region: 'head' | 'thorax' | 'abdomen' | 'body';
};
const regions = {
  head: { x: [-0.14, 0.14], y: [1.44, 1.75], z: [-0.15, 0.15] },
  thorax: { x: [-0.26, 0.26], y: [1.03, 1.44], z: [-0.16, 0.16] },
  abdomen: { x: [-0.23, 0.23], y: [0.70, 1.12], z: [-0.16, 0.16] },
  body: { x: [-0.85, 0.85], y: [0, 1.75], z: [-0.20, 0.20] },
};
export function relativeSlice(slice: AtlasSlice) {
  const bounds = regions[slice.region];
  const axis: 'x' | 'y' | 'z' = slice.plane === 'axial' ? 'y' : slice.plane === 'coronal' ? 'z' : 'x';
  const fraction = Math.max(0, Math.min(1, slice.fraction));
  // DICOM LPS increases posteriorly, whereas this atlas uses +z anteriorly.
  const progress = axis === 'z' ? 1 - fraction : fraction;
  const position = bounds[axis][0] + (bounds[axis][1] - bounds[axis][0]) * progress;
  return { axis, position, bounds };
}
