import { getPlantaoScenario, plantaoCases } from './plantao-cases';
import { patientReplies } from './plantao-encounter';

let recordedLines: Set<string> | undefined;
export function hasPatientRecording(text: string) {
  recordedLines ??= new Set(plantaoVoiceLines().map((clip) => clip.text));
  return recordedLines.has(text);
}

export function plantaoVoiceUrl(text: string) {
  // Address clips by text so reordered questions and repeated answers reuse the recording.
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  }
  return `/audio/plantao/${(hash >>> 0).toString(16).padStart(8, '0')}.mp3`;
}

export function plantaoVoiceLines() {
  const clips = new Map<string, string>(
    Object.values(patientReplies).map((text) => [plantaoVoiceUrl(text), text]),
  );
  for (const base of plantaoCases) {
    // A seed changes question and answer order. Each case has one alternate transcript.
    const generated = getPlantaoScenario(`${base.id}~0`)!;
    for (const scenario of [base, generated]) {
      for (const text of [
        scenario.complaint,
        ...scenario.interview.map((item) => item.answer),
      ]) {
        const url = plantaoVoiceUrl(text);
        const existing = clips.get(url);
        if (existing !== undefined && existing !== text) {
          throw new Error(`Plantão voice filename collision: ${url}`);
        }
        clips.set(url, text);
      }
    }
  }
  return [...clips].map(([url, text]) => ({ url, text }));
}
