export const cardiacPhases = [
  'Diástase',
  'Sístole atrial',
  'Contração isovolumétrica',
  'Ejeção ventricular',
  'Relaxamento isovolumétrico',
  'Enchimento rápido',
] as const;

export type Valve = 'mitral' | 'tricuspid' | 'aortic' | 'pulmonary';
export type CardiacMotion = {
  phase: (typeof cardiacPhases)[number];
  seconds: number;
  period: number;
  ventricular: number;
  twist: number;
  atrial: number;
  valves: Record<Valve, number>;
  pressureLV: number;
  pressureRV: number;
  volumeLV: number;
  volumeRV: number;
  ejection: number;
  filling: number;
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};
const ramp = (time: number, from: number, until: number) =>
  ease((time - from) / (until - from));
const hump = (time: number, start: number, peak: number, end: number) =>
  ramp(time, start, peak) * (1 - ramp(time, peak, end));

/** One educational pressure/volume cycle. The time origin is the R peak. */
export function heartCycle(
  time: number,
  bpm = 75,
  atrialBeat = true,
): CardiacMotion {
  const period = 60 / bpm;
  const t = ((time % period) + period) % period;
  const closeAv = 0.023;
  const openOut = Math.min(0.082, period * 0.19);
  const closeOut = Math.min(0.338 * Math.sqrt(period / 0.8), period * 0.68);
  const openAv = closeOut + Math.min(0.07, period * 0.13);
  const atrialStart = period - Math.min(0.11, period * 0.135);
  const fastEnd = openAv + (atrialStart - openAv) * 0.59;
  const atrial = atrialBeat ? hump(t, atrialStart, period - 0.047, period) : 0;
  const eject = ramp(t, openOut, closeOut);
  const earlyFill = 0.77 * ramp(t, openAv, fastEnd);
  const slowFill = 0.12 * ramp(t, fastEnd, atrialStart);
  const lateFill = 0.11 * ramp(t, atrialStart, period);
  const remaining = clamp(eject - earlyFill - slowFill - lateFill);
  // Shape can change at nearly constant cavity volume, especially during untwisting.
  const ventricular =
    remaining + 0.055 * hump(t, closeAv, openOut, openOut + 0.1);
  const twist =
    ramp(t, openOut, closeOut) * (1 - ramp(t, closeOut, openAv + 0.07));
  const avOpening =
    1 - ramp(t, closeAv - 0.012, closeAv) + ramp(t, openAv, openAv + 0.025);
  const outOpening =
    ramp(t, openOut, openOut + 0.026) *
    (1 - ramp(t, closeOut - 0.024, closeOut));
  const pressurizing = ramp(t, closeAv, openOut);
  const pressurePeak = hump(
    t,
    openOut,
    openOut + (closeOut - openOut) * 0.44,
    closeOut,
  );
  const falling = ramp(t, closeOut, openAv);
  const pressureLV =
    8 + 74 * (pressurizing - falling) + 38 * pressurePeak + 4 * atrial;
  const pressureRV =
    3 + 9 * (pressurizing - falling) + 14 * pressurePeak + 2 * atrial;
  const atrialLeft =
    9.5 +
    4 * atrial +
    1.5 * ramp(t, openOut, openAv) * (1 - ramp(t, openAv, fastEnd));
  const atrialRight =
    4.3 +
    2 * atrial +
    1.4 * ramp(t, openOut, openAv) * (1 - ramp(t, openAv, fastEnd));
  const pressureAorta = 78 + 9 * eject + 13 * pressurePeak;
  const pressurePulmonary = 10 + 4 * eject + 6 * pressurePeak;
  const gates = {
    mitral: clamp(avOpening) * ramp(atrialLeft - pressureLV, 0, 1.2),
    tricuspid: clamp(avOpening) * ramp(atrialRight - pressureRV, 0, 1),
    aortic: outOpening * ramp(pressureLV - pressureAorta, 0, 4),
    pulmonary: outOpening * ramp(pressureRV - pressurePulmonary, 0, 2),
  };
  let phase: CardiacMotion['phase'] = 'Diástase';
  if (t >= atrialStart && atrialBeat) phase = 'Sístole atrial';
  else if (t >= closeAv && t < openOut) phase = 'Contração isovolumétrica';
  else if (t >= openOut && t < closeOut) phase = 'Ejeção ventricular';
  else if (t >= closeOut && t < openAv) phase = 'Relaxamento isovolumétrico';
  else if (t >= openAv && t < fastEnd) phase = 'Enchimento rápido';
  return {
    phase,
    seconds: t,
    period,
    ventricular,
    twist,
    atrial,
    valves: gates,
    pressureLV,
    pressureRV,
    volumeLV: 120 - 72 * remaining,
    volumeRV: 122 - 72 * remaining,
    ejection: eject,
    filling: clamp(earlyFill + slowFill + lateFill),
  };
}

/** Mechanical phase follows each simulated R peak, including irregular RR intervals. */
export function heartCycleAtBeat(
  time: number,
  beats: readonly number[],
  bpm: number,
  atrialBeat: boolean,
) {
  const beat = beats.findLastIndex((value) => value <= time);
  if (beat < 0) return heartCycle(time, bpm, atrialBeat);
  const next = beats[beat + 1];
  const interval =
    next === undefined ? 60 / bpm : Math.max(0.32, next - beats[beat]);
  return heartCycle(time - beats[beat], 60 / interval, atrialBeat);
}

export function cycleComparison(bpm: number, systole: boolean) {
  const period = 60 / bpm;
  return systole
    ? Math.min(0.338 * Math.sqrt(period / 0.8), period * 0.68) - 0.006
    : 0;
}
