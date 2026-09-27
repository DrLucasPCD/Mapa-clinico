import { useEffect, useState } from 'react';
import { cases, type ClinicalCase } from './content';

type RecordEntry = { answer?: number; wrong?: boolean; note?: string; completed?: boolean };
type Records = Record<string, RecordEntry>;
const STORAGE_KEY = 'mapa-case-journey-v1';
const focusByCase: Record<string, { structure: string; task: string; imageTask: string }> = {
  '2604': {
    structure: 'Encéfalo e território da artéria cerebral média direita',
    task: 'Localize o hemisfério direito. A via motora cruza antes de alcançar o corpo: relacione o lado do déficit ao lado da lesão.',
    imageTask: 'Compare os dois momentos da TC. Procure a artéria hiperdensa e a perda da diferenciação entre substância cinzenta e branca.',
  },
  '164685': {
    structure: 'Quinto metacarpo direito',
    task: 'Localize o quinto metacarpo e identifique seu colo, imediatamente proximal à cabeça do osso.',
    imageTask: 'Na incidência frontal, encontre a descontinuidade do colo e descreva angulação ou desvio antes de revelar a discussão.',
  },
  '87566': {
    structure: 'Lobos parieto-occipital e temporal esquerdos',
    task: 'Localize o hemisfério esquerdo e compare as regiões parieto-occipital e temporal com a fraqueza do lado direito.',
    imageTask: 'Percorra os 24 cortes FLAIR. Descreva localização e sinal; restrição à difusão e realce dependem de outras sequências do caso original.',
  },
};
const atlasTargets: Record<string, { id: string; label: string; role: string }[]> = {
  '2604': [
    { id: 'middle-cerebral-artery-m1-segment-right', label: 'Artéria cerebral média direita · M1', role: 'Vaso do achado hiperdenso; irriga parte do hemisfério direito.' },
    { id: 'internal-carotid-artery-right', label: 'Carótida interna direita', role: 'Vaso proximal que dá origem à artéria cerebral média.' },
  ],
  '164685': [{ id: 'fifth-metacarpal-bone-right', label: 'Quinto metacarpo direito', role: 'Identifique corpo, colo e cabeça do osso envolvido.' }],
  '87566': [
    { id: 'superior-occipital-gyri-left', label: 'Região occipital esquerda', role: 'Referência anatômica da topografia descrita.' },
    { id: 'middle-temporal-gyrus-left', label: 'Região temporal esquerda', role: 'Referência anatômica da outra região descrita.' },
  ],
};

function readRecords(): Records {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([id, entry]) => /^\d+$/.test(id) && entry && typeof entry === 'object' && !Array.isArray(entry)).map(([id, raw]) => {
      const entry = raw as RecordEntry;
      return [id, { note: typeof entry.note === 'string' ? entry.note.slice(0, 1200) : '', wrong: entry.wrong === true, completed: entry.completed === true, answer: typeof entry.answer === 'number' && Number.isInteger(entry.answer) ? entry.answer : undefined }];
    })) as Records;
  } catch { return {}; }
}

export default function CaseJourney({ item, period, onLocate, onSelectCase, onFocusStructure }: { item: ClinicalCase; period: number; onLocate: () => void; onSelectCase: (id: string) => void; onFocusStructure: (id: string, label: string) => void }) {
  const [step, setStep] = useState(0);
  const [records, setRecords] = useState<Records>(readRecords);
  const [answer, setAnswer] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const current = records[item.id] ?? {};
  const focus = focusByCase[item.id] ?? { structure: item.regionLabel, task: 'Localize a região indicada no atlas.', imageTask: 'Descreva a modalidade, o plano e o achado antes de ler a discussão.' };

  useEffect(() => { setStep(0); setAnswer(null); setRevealed(false); }, [item.id]);
  const save = (entry: Partial<RecordEntry>) => {
    setRecords(previous => {
      const next = { ...previous, [item.id]: { ...previous[item.id], ...entry } };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* armazenamento opcional */ }
      return next;
    });
  };
  const answerQuestion = (choice: number) => {
    setAnswer(choice);
    save({ answer: choice, wrong: Boolean(current.wrong || choice !== item.correct), completed: true });
  };
  const reviewItems = Object.entries(records).filter(([, entry]) => entry.wrong || entry.note?.trim());

  return <section id="case-journey" className="case-journey" aria-label="Trilha guiada do caso">
    <div className="journey-heading"><div><small>TRILHA GUIADA · {period}º PERÍODO</small><h3>Do caso ao atlas</h3></div><button onClick={() => setReviewOpen(value => !value)} aria-expanded={reviewOpen}>Minha revisão {reviewItems.length ? `(${reviewItems.length})` : ''}</button></div>
    {reviewOpen && <div className="journey-review" aria-label="Casos para rever">{reviewItems.length ? reviewItems.map(([id, entry]) => <article key={id}><button onClick={() => { onSelectCase(id); setReviewOpen(false); setStep(3); }}>{cases.find(candidate => candidate.id === id)?.title ?? `Caso rID ${id}`} →</button>{entry.wrong && <span> · questão para rever</span>}{entry.note && <p>{entry.note}</p>}</article>) : <p>Suas respostas erradas e notas aparecerão aqui.</p>}</div>}
    <nav className="journey-steps" aria-label="Etapas da trilha">{['Caso', 'Atlas', 'Imagem', 'Raciocínio'].map((label, index) => <button key={label} className={step === index ? 'active' : ''} aria-current={step === index ? 'step' : undefined} onClick={() => setStep(index)}><span>{index + 1}</span>{label}</button>)}</nav>
    {step === 0 && <div className="journey-stage"><h4>Primeiro, leia a apresentação</h4><p>{item.presentation}</p><p className="journey-prompt">Que localização anatômica pode explicar os sintomas? Formule uma hipótese antes de ir ao atlas.</p><button className="journey-primary" onClick={() => setStep(1)}>Explorar anatomia →</button></div>}
    {step === 1 && <div className="journey-stage"><h4>{focus.structure}</h4><p>{focus.task}</p><button className="journey-primary" onClick={onLocate}>Destacar região no atlas 3D</button><div className="journey-structures"><strong>Estruturas para conferir no modelo masculino</strong>{(atlasTargets[item.id] ?? []).map(target => <button key={target.id} onClick={() => onFocusStructure(target.id, target.label)}><span>{target.label} ↗</span><small>{target.role}</small></button>)}</div><button onClick={() => setStep(2)}>Examinar imagens →</button></div>}
    {step === 2 && <div className="journey-stage"><h4>Procure o achado</h4><p>{focus.imageTask}</p><p className="journey-prompt">Use a imagem acima. Se houver pilha, percorra os cortes com o scroll ou pelas miniaturas.</p><button className="journey-primary" onClick={() => setStep(3)}>Responder questão →</button></div>}
    {step === 3 && <div className="journey-stage"><h4>{item.question}</h4><div className="journey-options">{item.options.map((option, index) => <button key={option} className={answer === index ? (index === item.correct ? 'correct' : 'incorrect') : ''} onClick={() => answerQuestion(index)}>{String.fromCharCode(65 + index)}. {option}</button>)}</div>{answer !== null && <p role="status" className="journey-feedback"><strong>{answer === item.correct ? 'Correto.' : `Reveja: ${item.options[item.correct]}.`}</strong> {item.explanation}</p>}<button onClick={() => setRevealed(value => !value)}>{revealed ? 'Ocultar discussão' : 'Revelar achados e discussão'}</button>{revealed && <p className="journey-findings">{item.findings} <small>{item.certainty}</small></p>}</div>}
    <label className="journey-note">Minha observação neste caso<textarea value={current.note ?? ''} maxLength={1200} placeholder="O que preciso rever? Qual corte ou estrutura chamou atenção?" onChange={event => save({ note: event.target.value })} /></label>
    <small className="journey-local">Suas notas e respostas ficam neste dispositivo.</small>
  </section>;
}
