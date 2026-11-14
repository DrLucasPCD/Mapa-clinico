/** The structures rendered together in the ECG Lab and the Atlas heart view. */
export const heartChambers = ['right_atrium', 'left_atrium', 'right_ventricle', 'left_ventricle'];
export const heartOrgans = [
  ...heartChambers,
  'ascending_aorta', 'aortic_arch', 'pulmonary_trunk', 'superior_vena_cava',
  'right_coronary_artery', 'left_coronary_artery', 'anterior_interventricular_artery', 'great_cardiac_vein',
];

const heartIds = new Set(heartOrgans.map(id => id.replaceAll('_', '-')));
export function isHeartStructure(id: string) {
  return heartIds.has(id);
}

export function heartMaterial(organ: string) {
  if (!heartOrgans.includes(organ)) return undefined;
  let color = '#c83f48';
  if (heartChambers.includes(organ)) color = '#ac393d';
  else if (organ === 'pulmonary_trunk' || organ === 'superior_vena_cava') color = '#4c6fb2';
  else if (organ === 'great_cardiac_vein') color = '#567fbd';
  else if (organ.includes('coronary_artery') || organ === 'anterior_interventricular_artery') color = '#e38978';
  return { color, roughness: .44 };
}

export const heartLighting = {
  ambient: { sky: 0xf6f5ff, ground: 0x45323b, intensity: 2 },
  key: { color: 0xffd7c7, intensity: 2.3, position: [2, 2, 3] as const },
  rim: { color: 0x9ed5ff, intensity: 1.5, position: [-2, 1, -3] as const },
};
