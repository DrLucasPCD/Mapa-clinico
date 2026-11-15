/** The structures rendered together in the ECG Lab and the Atlas heart view. */
export const heartChambers = ['right_atrium', 'left_atrium', 'right_ventricle', 'left_ventricle'];
export const heartValveMeshes = [
  'inferior_leaflet_of_right_atrioventricular_valve',
  'posterior_leaflet_of_left_atrioventricular_valve',
  'septal_leaflet_of_right_atrioventricular_valve',
  'right_coronary_leaflet', 'left_coronary_leaflet', 'non_coronary_leaflet',
  'anterior_semilunar_leaflet_of_pulmonary_valve',
  'right_semilunar_leaflet_of_pulmonary_valve',
  'left_semilunar_leaflet_of_pulmonary_valve',
  'anterior_papillary_muscle_of_right_ventricle',
  'inferior_papillary_muscle_of_right_ventricle',
  'inferior_papillary_muscle_of_left_ventricle',
  'septal_papillary_muscle_of_right_ventricle',
];
export const heartOrgans = [
  ...heartValveMeshes,
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
  if (organ.includes('leaflet')) return { color:'#dab48f', roughness:.56 };
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
