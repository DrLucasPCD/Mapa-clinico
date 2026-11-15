/** The structures rendered together in the ECG Lab and the Atlas heart view. */
export const heartChambers = [
  'right_atrium',
  'left_atrium',
  'right_ventricle',
  'left_ventricle',
];
export const heartValveMeshes = [
  'inferior_leaflet_of_right_atrioventricular_valve',
  'posterior_leaflet_of_left_atrioventricular_valve',
  'septal_leaflet_of_right_atrioventricular_valve',
  'right_coronary_leaflet',
  'left_coronary_leaflet',
  'non_coronary_leaflet',
  'anterior_semilunar_leaflet_of_pulmonary_valve',
  'right_semilunar_leaflet_of_pulmonary_valve',
  'left_semilunar_leaflet_of_pulmonary_valve',
  'anterior_papillary_muscle_of_right_ventricle',
  'inferior_papillary_muscle_of_right_ventricle',
  'inferior_papillary_muscle_of_left_ventricle',
  'septal_papillary_muscle_of_right_ventricle',
];
export const coronaryArteries = [
  {
    id: 'left-coronary-artery',
    label: 'Tronco da coronária esquerda',
    parent: 'ascending-aorta',
  },
  {
    id: 'anterior-interventricular-artery',
    label: 'Descendente anterior (DA)',
    parent: 'left-coronary-artery',
  },
  {
    id: 'circumflex-artery-of-heart',
    label: 'Circunflexa (Cx)',
    parent: 'left-coronary-artery',
  },
  {
    id: 'septal-branches-of-anterior-interventricular-artery',
    label: 'Ramos septais da DA',
    parent: 'anterior-interventricular-artery',
  },
  {
    id: 'right-coronary-artery',
    label: 'Coronária direita (CD)',
    parent: 'ascending-aorta',
  },
  {
    id: 'right-inferolateral-branch-of-right-coronary-artery',
    label: 'Ramo inferolateral da CD',
    parent: 'right-coronary-artery',
  },
] as const;

export const coronaryVeins = [
  { id: 'coronary-sinus', label: 'Seio coronário', parent: 'right-atrium' },
  {
    id: 'great-cardiac-vein',
    label: 'Veia cardíaca magna',
    parent: 'coronary-sinus',
  },
  {
    id: 'middle-cardiac-vein',
    label: 'Veia cardíaca média',
    parent: 'coronary-sinus',
  },
  {
    id: 'inferior-vein-of-left-ventricle',
    label: 'Veia inferior do ventrículo esquerdo',
    parent: 'coronary-sinus',
  },
] as const;

export const atrialInlets = [
  {
    id: 'superior-vena-cava',
    atrium: 'right-atrium',
    normal: [0, 1, 0],
    label: 'Veia cava superior',
  },
  {
    id: 'inferior-vena-cava-thoracic-part',
    atrium: 'right-atrium',
    normal: [0, -1, 0],
    label: 'Veia cava inferior · porção torácica',
  },
  {
    id: 'right-superior-pulmonary-vein',
    atrium: 'left-atrium',
    normal: [-1, 0, 0],
    label: 'Veia pulmonar superior direita',
  },
  {
    id: 'right-inferior-pulmonary-vein',
    atrium: 'left-atrium',
    normal: [-1, 0, 0],
    label: 'Veia pulmonar inferior direita',
  },
  {
    id: 'left-superior-pulmonary-vein',
    atrium: 'left-atrium',
    normal: [1, 0, 0],
    label: 'Veia pulmonar superior esquerda',
  },
  {
    id: 'left-inferior-pulmonary-vein',
    atrium: 'left-atrium',
    normal: [1, 0, 0],
    label: 'Veia pulmonar inferior esquerda',
  },
] as const;

export const heartOrgans = [
  ...heartValveMeshes,
  ...heartChambers,
  'ascending_aorta',
  'aortic_arch',
  'pulmonary_trunk',
  'bifurcation_of_pulmonary_trunk',
  'right_pulmonary_artery',
  'left_pulmonary_artery',
  ...[...atrialInlets, ...coronaryArteries, ...coronaryVeins].map(({ id }) =>
    id.replaceAll('-', '_'),
  ),
];

const heartIds = new Set(heartOrgans.map((id) => id.replaceAll('_', '-')));
export function isHeartStructure(id: string) {
  return heartIds.has(id);
}

export function heartMaterial(organ: string) {
  if (!heartOrgans.includes(organ)) return undefined;
  let color = '#c83f48';
  if (organ.includes('leaflet')) return { color: '#dab48f', roughness: 0.56 };
  if (heartChambers.includes(organ)) color = '#ac393d';
  else if (/pulmonary_(trunk|artery)|vena_cava/.test(organ)) color = '#4c6fb2';
  else if (organ.includes('pulmonary_vein')) color = '#c36470';
  else if (coronaryVeins.some(({ id }) => id.replaceAll('-', '_') === organ))
    color = '#567fbd';
  else if (coronaryArteries.some(({ id }) => id.replaceAll('-', '_') === organ))
    color = '#e38978';
  return { color, roughness: 0.44 };
}

export const heartLighting = {
  ambient: { sky: 0xf6f5ff, ground: 0x45323b, intensity: 2 },
  key: { color: 0xffd7c7, intensity: 2.3, position: [2, 2, 3] as const },
  rim: { color: 0x9ed5ff, intensity: 1.5, position: [-2, 1, -3] as const },
};
