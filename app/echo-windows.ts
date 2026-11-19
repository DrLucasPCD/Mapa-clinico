export type EchoWindow = 'plax' | 'psax' | 'apical' | 'subcostal';

export const echoWindows = {
  plax: {
    label: 'Paraesternal · eixo longo',
    short: 'PLAX',
    x: 0.55,
    y: 0.3,
    roll: -38,
    tilt: 0,
    placement:
      'Posicione junto à borda esternal esquerda e aponte o marcador para o ombro direito do paciente.',
    landmarks:
      'Via de saída do ventrículo direito, septo interventricular, ventrículo esquerdo, valvas mitral e aórtica e átrio esquerdo.',
    reference: 'https://radiopaedia.org/cases/62652',
    referenceLabel: 'PLAX normal · David Carroll, Radiopaedia',
  },
  psax: {
    label: 'Paraesternal · eixo curto',
    short: 'PSAX',
    x: 0.55,
    y: 0.3,
    roll: 52,
    tilt: 0,
    placement:
      'Na janela paraesternal, gire a sonda cerca de um quarto de volta em relação ao eixo longo. Incline para variar o nível entre a base e o ápice.',
    landmarks:
      'No nível dos músculos papilares, observe o ventrículo esquerdo em corte transversal e o ventrículo direito em crescente.',
    reference: 'https://radiopaedia.org/cases/63358',
    referenceLabel:
      'Eixo curto basal e valva aórtica · David Carroll, Radiopaedia',
  },
  apical: {
    label: 'Apical · quatro câmaras',
    short: 'A4C',
    x: 0.69,
    y: 0.44,
    roll: 24,
    tilt: 0,
    placement:
      'Aproxime a sonda do impulso apical, geralmente abaixo e lateralmente à região mamária esquerda. Dirija o feixe para a base.',
    landmarks:
      'Identifique os dois átrios, os dois ventrículos, as valvas mitral e tricúspide e os septos. Procure incluir o ápice inteiro.',
    reference: 'https://echonet.github.io/dynamic/',
    referenceLabel: 'Cines apicais reais · Stanford EchoNet-Dynamic',
  },
  subcostal: {
    label: 'Subcostal · quatro câmaras',
    short: 'SC4C',
    x: 0.51,
    y: 0.53,
    roll: 78,
    tilt: 0,
    placement:
      'Coloque a sonda abaixo do xifoide e incline em direção ao coração, usando o fígado como janela acústica.',
    landmarks:
      'Observe o fígado no campo próximo e a relação entre o ventrículo direito, as demais câmaras e o pericárdio.',
    reference: 'https://radiopaedia.org/cases/64279',
    referenceLabel: 'FAST com vista subcostal · David Carroll, Radiopaedia',
  },
} satisfies Record<
  EchoWindow,
  {
    label: string;
    short: string;
    x: number;
    y: number;
    roll: number;
    tilt: number;
    placement: string;
    landmarks: string;
    reference: string;
    referenceLabel: string;
  }
>;
export const echoWindowOrder: EchoWindow[] = [
  'plax',
  'psax',
  'apical',
  'subcostal',
];
export type EchoProbe = {
  x: number;
  y: number;
  roll: number;
  tilt: number;
  depth: number;
};
export type EchoBeam = {
  window: EchoWindow;
  rollDelta: number;
  tilt: number;
  driftX: number;
  driftY: number;
  depth: number;
};
export type EchoCycleMarks = { start: number; systole: number; end: number };

export function echoBeamFor(probe: EchoProbe): EchoBeam | null {
  const anchors = ['plax', 'apical', 'subcostal'] as const;
  const nearest = anchors
    .map((window) => ({
      window,
      distance: Math.hypot(
        probe.x - echoWindows[window].x,
        probe.y - echoWindows[window].y,
      ),
    }))
    .sort((a, b) => a.distance - b.distance)[0];
  if (nearest.distance > 0.088) return null;
  const angularDistance = (a: number, b: number) => ((a - b + 540) % 360) - 180;
  const { window } = nearest;
  const detected =
    window === 'plax' &&
    Math.abs(angularDistance(probe.roll, echoWindows.psax.roll)) <
      Math.abs(angularDistance(probe.roll, echoWindows.plax.roll))
      ? 'psax'
      : window;
  const reference = echoWindows[detected];
  return {
    window: detected,
    rollDelta: angularDistance(probe.roll, reference.roll),
    tilt: probe.tilt,
    driftX: probe.x - reference.x,
    driftY: probe.y - reference.y,
    depth: probe.depth,
  };
}

/** Maps one manually marked cine cycle to phase 0…1 in the teaching heart. */
export function echoCinePhase(time: number, marks: EchoCycleMarks) {
  const { start, systole, end } = marks;
  if (!(start < systole && systole < end)) return null;
  const frame = Math.max(start, Math.min(end, time));
  return frame <= systole
    ? 0.43 * ((frame - start) / (systole - start))
    : 0.43 + 0.57 * ((frame - systole) / (end - systole));
}
