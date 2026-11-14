export type Vector = readonly [left: number, inferior: number, anterior: number];
type Lead = { axis: Vector; plane: 'frontal' | 'horizontal'; placement: string };
const unitAt = (angle: number, horizontal = false): Vector => {
  const radians = angle * Math.PI / 180;
  return horizontal
    ? [Math.cos(radians), 0, Math.sin(radians)]
    : [Math.cos(radians), Math.sin(radians), 0];
};

export const frontalLeads = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF'] as const;
export const chestLeads = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const;
export const rightLeads = ['V3R', 'V4R'] as const;
export const posteriorLeads = ['V7', 'V8', 'V9'] as const;
export type LeadId = typeof frontalLeads[number] | typeof chestLeads[number] | typeof rightLeads[number] | typeof posteriorLeads[number];
const frontal = (angle: number, placement: string): Lead => ({ axis: unitAt(angle), plane: 'frontal', placement });
const chest = (angle: number, placement: string): Lead => ({ axis: unitAt(angle, true), plane: 'horizontal', placement });
export const ecgLeads: Record<LeadId, Lead> = {
  I: frontal(0, 'Braço direito → braço esquerdo.'),
  II: frontal(60, 'Braço direito → perna esquerda.'),
  III: frontal(120, 'Braço esquerdo → perna esquerda.'),
  aVR: frontal(-150, 'Polo positivo no braço direito.'),
  aVL: frontal(-30, 'Polo positivo no braço esquerdo.'),
  aVF: frontal(90, 'Polo positivo na perna esquerda.'),
  V1: chest(111, '4º espaço intercostal, borda esternal direita.'),
  V2: chest(85, '4º espaço intercostal, borda esternal esquerda.'),
  V3: chest(58, 'Entre V2 e V4.'),
  V4: chest(36, '5º espaço intercostal, linha hemiclavicular esquerda.'),
  V5: chest(14, 'No nível de V4, linha axilar anterior esquerda.'),
  V6: chest(0, 'No nível de V4, linha axilar média esquerda.'),
  V3R: chest(124, 'Posição espelhada de V3 no hemitórax direito.'),
  V4R: chest(144, '5º espaço intercostal, linha hemiclavicular direita.'),
  V7: chest(-30, 'No nível de V6, linha axilar posterior esquerda.'),
  V8: chest(-57, 'No nível de V6, linha médio-escapular esquerda.'),
  V9: chest(-83, 'No nível de V6, linha paravertebral esquerda.'),
};

export const ecgPatterns = {
  sinus: { name: 'Ritmo sinusal', bpm: 75, axis: 55, description: 'Onda P antes de cada QRS, intervalos RR regulares e QRS estreito neste exemplo.' },
  brady: { name: 'Bradicardia sinusal', bpm: 48, axis: 55, description: 'Ativação sinusal regular com frequência reduzida neste exemplo.' },
  tachy: { name: 'Taquicardia sinusal', bpm: 125, axis: 55, description: 'Ativação sinusal com intervalos RR mais curtos neste exemplo.' },
  af: { name: 'Fibrilação atrial', bpm: 105, axis: 55, description: 'Intervalos RR irregulares, atividade atrial variável e ausência de ondas P distintas neste exemplo.' },
  flutter: { name: 'Flutter atrial 2:1', bpm: 150, axis: 55, description: 'Atividade atrial em serrote a 300/min. Neste exemplo, uma de cada duas ativações atriais conduz aos ventrículos.' },
  av: { name: 'Bloqueio AV de 1º grau', bpm: 65, axis: 55, description: 'Cada onda P conduz aos ventrículos. O intervalo PR está prolongado neste exemplo.' },
  vt: { name: 'Taquicardia ventricular monomórfica', bpm: 165, axis: -100, description: 'Ritmo regular de complexos largos e morfologia repetitiva neste exemplo de origem ventricular.' },
  inferior: { name: 'Supra de ST inferior e direito', bpm: 72, axis: 58, description: 'Exemplo de alteração inferior e direita. Compare II, III e aVF com V3R e V4R e procure a alteração recíproca em aVL.' },
  posterior: { name: 'Alteração de ST posterior', bpm: 80, axis: 52, description: 'Exemplo de supra de ST em V7–V9 e infradesnível recíproco nas derivações anteriores.' },
} as const;
export type PatternId = keyof typeof ecgPatterns;
export const patternIds = Object.keys(ecgPatterns) as PatternId[];
export type ConductionStage = { index: number; progress: number; ventricularOnly: boolean };

const atrialPeak = (pattern: PatternId) => pattern === 'av' ? -.235 : -.155;
const hasOrganizedP = (pattern: PatternId) => pattern !== 'af' && pattern !== 'flutter' && pattern !== 'vt';

const dot = (a: Vector, b: Vector) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const pulse = (time: number, center: number, width: number) => Math.exp(-.5 * ((time - center) / width) ** 2);
const period = (bpm: number) => 60 / bpm;
const afIntervals = [.76, 1.18, .89, 1.37, .67, 1.04, 1.09];

export function ecgBeats(pattern: PatternId, bpm: number, until: number) {
  const result: number[] = [];
  const spacing = period(bpm);
  for (let time = -spacing; time < until + .5;) {
    result.push(time);
    const ratio = pattern === 'af' ? afIntervals[(result.length - 1) % afIntervals.length] : 1;
    time += spacing * ratio;
  }
  return result;
}

export function electricalVector(time: number, beats: number[], pattern: PatternId, axis: number): Vector {
  const radians = axis * Math.PI / 180;
  const wide = pattern === 'vt';
  let left = 0, inferior = 0, anterior = 0;
  for (const beat of beats) {
    const t = time - beat;
    if (t < -.37 || t > .47) continue;
    const p = hasOrganizedP(pattern) ? pulse(t, atrialPeak(pattern), .019) * .16 : 0;
    const q = pulse(t, wide ? -.044 : -.018, wide ? .017 : .007) * .18;
    const r = pulse(t, 0, wide ? .032 : .012) * 1.20;
    const s = pulse(t, wide ? .065 : .028, wide ? .021 : .009) * .40;
    const tWave = pulse(t, wide ? .187 : .225, wide ? .032 : .045) * (wide ? -.34 : .30);
    const j = wide ? .09 : .043;
    const stEnd = j + .097;
    const smooth = (x: number) => 1 / (1 + Math.exp(-x / .006));
    const st = smooth(t - j) * (1 - smooth(t - stEnd));
    const qrs = r - q - s + tWave;
    left += Math.cos(radians) * qrs + p * .54;
    inferior += Math.sin(radians) * qrs + p * .84;
    anterior += -.39 * r + .39 * q - .36 * s - .04 * tWave + p * .18;
    if (pattern === 'inferior') {
      left -= .12 * st;
      inferior += .28 * st;
      anterior += .16 * st;
    }
    if (pattern === 'posterior') {
      left += .015 * st;
      anterior -= .30 * st;
    }
  }
  const atrial = pattern === 'af'
    ? .025 * (Math.sin(time * 40) + .42 * Math.sin(time * 57 + 1.2))
    : pattern === 'flutter' ? .105 * (2 * (((time * 5 + .31) % 1 + 1) % 1) - 1) : 0;
  return [left, inferior + atrial, anterior + atrial * .48];
}

export function projectLead(vector: Vector, lead: LeadId) {
  const gain = lead.startsWith('a') ? Math.sqrt(3) / 2 : 1;
  return dot(vector, ecgLeads[lead].axis) * gain;
}

export function calculateAxis(leadI: number, avf: number) {
  if (!Number.isFinite(leadI) || !Number.isFinite(avf) || (leadI === 0 && avf === 0)) return null;
  return Math.round(Math.atan2(avf / (Math.sqrt(3) / 2), leadI) * 180 / Math.PI);
}

export function axisClass(angle: number) {
  if (angle >= -30 && angle <= 90) return 'Eixo frontal na faixa habitual';
  if (angle < -30 && angle >= -90) return 'Desvio para a esquerda';
  if (angle > 90) return 'Desvio para a direita';
  return 'Eixo extremo';
}

export function ecgActivation(time: number, beats: number[], pattern: PatternId) {
  const atrial = hasOrganizedP(pattern);
  const p = atrialPeak(pattern);
  const wide = pattern === 'vt';
  const phase = (name: string, detail: string, region: string, index: number, start: number, end: number) => {
    const beat = beats.find(value => time >= value + start && time < value + end);
    if (beat === undefined) return null;
    const progress = Math.max(0, Math.min(1, (time - (beat + start)) / (end - start)));
    const stage: ConductionStage | null = wide ? null : { index, progress, ventricularOnly: !atrial };
    return { name, detail, region, stage };
  };
  // Resolve coincident activity in fast simulated rhythms in favor of QRS,
  // then the atrial event, then repolarization from the previous beat.
  return (wide
    ? phase('QRS', 'Despolarização ventricular', 'ventricles', 5, -.075, .115)
    : phase('QRS', 'Despolarização ventricular', 'ventricles', 4, -.039, -.012)
      ?? phase('QRS', 'Despolarização ventricular', 'ventricles', 5, -.012, .054))
    ?? (atrial
      ? phase('Início de P', 'Ativação do nó sinoatrial', 'atria', 0, p - .050, p - .031)
        ?? phase('P', 'Despolarização atrial', 'atria', 1, p - .031, p + .038)
        ?? phase('PR', 'Condução atrioventricular', 'av', 2, p + .038, -.057)
        ?? phase('PR', 'Condução pelo feixe de His', 'av', 3, -.057, -.039)
      : !wide ? phase('Pré-QRS', 'Condução pelo feixe de His', 'av', 3, -.057, -.039) : null)
    ?? phase('T', 'Repolarização ventricular', 'ventricles', 6, wide ? .135 : .145, wide ? .255 : .315)
    ?? { name: 'Entre ondas', detail: 'Observe o segmento do traçado', region: 'rest', stage: null };
}

export function activationTimes(duration: number, beats: number[], pattern: PatternId) {
  const times: Record<number, number[]> = {};
  let previous: number | undefined;
  let start = 0;
  const sampleCount = Math.floor(duration * 250) + 1;
  for (let sample = 0; sample <= sampleCount; sample += 1) {
    const index = sample === sampleCount ? undefined : ecgActivation(sample / 250, beats, pattern).stage?.index;
    if (index === previous) continue;
    if (previous !== undefined) (times[previous] ??= []).push(Math.floor((start + sample - 1) / 2) / 250);
    previous = index;
    start = sample;
  }
  return times;
}
