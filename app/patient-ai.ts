import type { PlantaoScenario } from './plantao-cases';

export type PatientReply = { reply: string; facts: number[] };

export type PatientAIRequest =
  | { type: 'prepare'; facts: string[] }
  | { type: 'search'; queries: string[] };

export type PatientAIEvent =
  | { type: 'progress'; value: number }
  | { type: 'ready' | 'error' }
  | { type: 'reply'; facts: number[] };

export function patientFactPassages(scenario: PlantaoScenario) {
  return scenario.interview.map(
    ({ question, answer }) => `passage: ${question} ${answer}`,
  );
}

export function patientQueries(question: string, previousQuestion?: string) {
  const text = question.trim().slice(0, 420);
  // A previous question is helpful only for an explicit reference to that turn.
  const followUp = /^(?:e (?:depois|antes)|depois disso|e isso)\b/i.test(text);
  return [
    `query: ${text}`,
    ...(followUp && previousQuestion
      ? [`query: ${text} Contexto: ${previousQuestion.slice(0, 200)}`]
      : []),
  ];
}

export function rankPatientFacts(scores: readonly (readonly number[])[]) {
  for (const similarities of scores) {
    const ranked = similarities
      .map((score, index) => ({ score, index }))
      .filter(({ score }) => Number.isFinite(score))
      .sort((a, b) => b.score - a.score);
    const [best, second] = ranked;
    if (
      best &&
      best.score >= 0.82 &&
      (!second || best.score - second.score >= 0.025)
    )
      return [best.index];
  }
  return [];
}

export function patientReplyFromFacts(
  scenario: PlantaoScenario,
  facts: number[],
  fallback: string,
): PatientReply {
  const known = [...new Set(facts)].filter(
    (index) => Number.isInteger(index) && scenario.interview[index],
  );
  return {
    facts: known,
    reply: known.length
      ? known.map((index) => scenario.interview[index].answer).join(' ')
      : fallback,
  };
}
