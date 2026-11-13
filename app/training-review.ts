const storageKey = 'mapa-training-review-v1';
export type TrainingReviewKind = 'curriculum' | 'visual' | 'plantao';
export type TrainingReviewEntry = { kind: TrainingReviewKind; id: string };

export function getTrainingReview(): TrainingReviewEntry[] {
  try {
    const items: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    if (!Array.isArray(items)) return [];
    return items.filter((item): item is TrainingReviewEntry =>
      item && ['curriculum', 'visual', 'plantao'].includes(item.kind) && typeof item.id === 'string');
  } catch { return []; }
}

export function recordTrainingReview(kind: TrainingReviewKind, id: string, correct: boolean) {
  try {
    const pending = getTrainingReview().filter(item => item.kind !== kind || item.id !== id);
    if (!correct) pending.push({ kind, id });
    localStorage.setItem(storageKey, JSON.stringify(pending));
  } catch { /* A sessão continua disponível sem armazenamento local. */ }
}
