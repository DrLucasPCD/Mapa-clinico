import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, Crosshair, ExternalLink, RotateCcw } from 'lucide-react';
import { pathCoreSteps, pathSteps, reviewAnswer, studyPaths, type PathProgress, type PathStep } from './study-paths';
import './study-paths.css';

const storageKey = 'mapa-study-paths-v1';
const formatDate = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' });

function firstUnanswered(progress: PathProgress, id?: string) {
  const path = studyPaths.find(item => item.id === id);
  const records = id ? progress.paths[id]?.questions : undefined;
  return Math.max(0, path?.questions.findIndex(q => !records?.[q.id]) ?? 0);
}

export function readPathProgress(): PathProgress {
  const result: PathProgress = { paths: {} };
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    if (studyPaths.some(path => path.id === stored?.lastPath)) result.lastPath = stored.lastPath;
    for (const path of studyPaths) {
      const saved = stored?.paths?.[path.id];
      if (!saved) continue;
      const questions: NonNullable<PathProgress['paths'][string]['questions']> = {};
      for (const question of path.questions) {
        const record = saved.questions?.[question.id];
        if (record && Number.isInteger(record.answer) && record.answer >= 0 && record.answer < question.options.length &&
            Number.isFinite(record.due) && record.due >= 0 && record.due <= 8.64e15 &&
            Number.isInteger(record.streak) && record.streak >= 0 && record.streak <= 5) {
          questions[question.id] = { answer: record.answer, due: record.due, streak: record.streak };
        }
      }
      result.paths[path.id] = {
        step: pathSteps.includes(saved.step) ? saved.step : undefined,
        studied: pathCoreSteps.filter(step => Array.isArray(saved.studied) && saved.studied.includes(step)),
        questions,
      };
    }
  } catch { /* O percurso continua utilizável se o armazenamento estiver indisponível. */ }
  return result;
}

type Props = {
  period: number;
  entry?: { id: string; step: PathStep; question?: number };
  modelVariant: 'male' | 'female';
  onLocate: (id: string, label: string, maleOnly?: boolean) => void;
  onOpenBiliary: () => void;
  onOpenStroke: () => void;
};

export default function StudyPaths({ period, entry, modelVariant, onLocate, onOpenBiliary, onOpenStroke }: Props) {
  const [progress, setProgress] = useState(() => {
    const saved = readPathProgress();
    if (entry) {
      saved.lastPath = entry.id;
      saved.paths[entry.id] = { ...saved.paths[entry.id], step: entry.step };
    }
    return saved;
  });
  const [imageIndex, setImageIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(() => entry?.question ?? firstUnanswered(progress, progress.lastPath));
  const [reviewing, setReviewing] = useState(entry?.question !== undefined);
  const [answer, setAnswer] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [now, setNow] = useState(Date.now);
  const [canSave, setCanSave] = useState(true);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(progress));
      setCanSave(true);
    } catch {
      setCanSave(false);
    }
  }, [progress]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const path = studyPaths.find(item => item.id === progress.lastPath);
  const current = path ? progress.paths[path.id] : undefined;
  const step = current?.step ?? 'Atlas';
  const stepIndex = pathSteps.indexOf(step);
  const question = path?.questions[questionIndex];
  const reviews = studyPaths.flatMap(item => item.questions.flatMap((entry, index) => {
    const record = progress.paths[item.id]?.questions?.[entry.id];
    return record ? [{ path: item, question: entry, index, record }] : [];
  })).sort((a, b) => a.record.due - b.record.due);
  const dueCount = reviews.filter(item => item.record.due <= now).length;
  const studiedCount = (id: string) => {
    const item = studyPaths.find(path => path.id === id);
    const record = progress.paths[id];
    return (record?.studied?.length ?? 0) + Number(Boolean(item?.questions.every(q => record?.questions?.[q.id])));
  };

  function resetActivity(index = 0) {
    setImageIndex(0);
    setRevealed(false);
    setQuestionIndex(index);
    setAnswer(null);
    setChecked(false);
    setNow(Date.now());
  }

  function openPath(id: string, destination?: PathStep, index?: number) {
    setProgress(previous => {
      const saved = previous.paths[id];
      const resumedStep = destination ?? saved?.step ?? 'Atlas';
      return {
        lastPath: id,
        paths: { ...previous.paths, [id]: { ...saved, step: resumedStep } },
      };
    });
    resetActivity(index ?? firstUnanswered(progress, id));
    setReviewing(index !== undefined);
    focusHeading();
  }

  function focusHeading() {
    requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
  }

  function navigate(next: PathStep, markStudied?: typeof pathCoreSteps[number]) {
    if (!path || (next === step && !markStudied)) return;
    setProgress(previous => {
      const saved = previous.paths[path.id];
      const studied = saved?.studied ?? [];
      return {
        ...previous,
        paths: {
          ...previous.paths,
          [path.id]: {
            ...saved,
            step: next,
            studied: markStudied && !studied.includes(markStudied) ? [...studied, markStudied] : studied,
          },
        },
      };
    });
    setRevealed(false);
    setAnswer(null);
    setChecked(false);
    setReviewing(false);
    setNow(Date.now());
    if (next === 'Questões') {
      setQuestionIndex(firstUnanswered(progress, path.id));
    }
    focusHeading();
  }

  function checkAnswer() {
    if (!path || !question || answer === null || checked) return;
    const timestamp = Date.now();
    setProgress(previous => {
      const saved = previous.paths[path.id];
      return {
        ...previous,
        paths: {
          ...previous.paths,
          [path.id]: {
            ...saved,
            questions: {
              ...saved?.questions,
              [question.id]: reviewAnswer(answer, question.correct, timestamp, saved?.questions?.[question.id]),
            },
          },
        },
      };
    });
    setNow(timestamp);
    setChecked(true);
  }

  const next = pathSteps[stepIndex + 1];
  const coreStep = pathCoreSteps.find(item => item === step);
  return (
    <section className="study-paths" id="study-paths" aria-label="Percursos de estudo">
      <header className="path-header">
        <div>
          <BookOpen aria-hidden="true" size={21} />
          <h2 tabIndex={-1} ref={headingRef}>{path?.title ?? 'Percursos de estudo'}</h2>
        </div>
        <p>{path?.summary ?? 'Escolha um tema para estudar com o atlas 3D, interpretar uma imagem e testar seu raciocínio.'}</p>
        {path && <button className="path-link" onClick={() => {
          setProgress(previous => ({ paths: previous.paths }));
          focusHeading();
        }}><ArrowLeft size={16} /> Todos os percursos</button>}
      </header>

      {!path ? (
        <>
          <div className="path-list">
            {studyPaths.map(item => {
              const completed = studiedCount(item.id);
              return (
                <button key={item.id} className="path-card" onClick={() => openPath(item.id)}>
                  <small>{item.system}</small>
                  <strong>{item.title}</strong>
                  <span>{item.summary}</span>
                  <span className="path-card-action">
                    {completed === 4 ? 'Revisitar percurso' : progress.paths[item.id] ? 'Continuar percurso' : 'Iniciar percurso'}
                    <ArrowRight size={15} />
                  </span>
                  {completed > 0 && <progress value={completed} max={4} aria-label={`Progresso: ${completed} de 4 etapas de estudo`} />}
                </button>
              );
            })}
          </div>
          {reviews.length > 0 && (
            <button className="path-secondary" onClick={() => openPath(reviews[0].path.id, 'Revisão')}>
              <RotateCcw size={16} /> Abrir revisão {dueCount > 0 && `· ${dueCount} para agora`}
            </button>
          )}
        </>
      ) : (
        <>
          <nav className="path-steps" aria-label="Etapas do percurso">
            {pathSteps.map(item => {
              const done = current?.studied?.some(studied => studied === item) ||
                (item === 'Questões' && path.questions.every(q => current?.questions?.[q.id]));
              return (
                <button key={item} className={step === item ? 'active' : ''} aria-current={step === item ? 'step' : undefined}
                  aria-label={done ? `${item}, concluída` : item} onClick={() => navigate(item)}>
                  {done && <Check size={14} aria-hidden="true" />}{item}
                </button>
              );
            })}
          </nav>

          <div className="path-stage" key={`${path.id}/${step}`}>
            {step === 'Atlas' && (
              <>
                <h3>Localize as estruturas</h3>
                <p className="path-prompt"><strong>Seu foco no {period}º período</strong><br />{path.focus[period <= 2 ? 0 : period <= 4 ? 1 : period <= 8 ? 2 : 3]}</p>
                <div className="path-targets">
                  {path.targets.map(target => (
                    <article key={target.id}>
                      <strong>{target.label}</strong>
                      <p>{target.detail}</p>
                      <button className="path-link" onClick={() => onLocate(target.id, target.label, target.maleOnly)}>
                        <Crosshair size={16} /> {target.maleOnly && modelVariant === 'female' ? 'Ver no modelo masculino' : 'Localizar no Atlas 3D'}
                      </button>
                    </article>
                  ))}
                </div>
                <p className="path-meta">O atlas mostra a localização anatômica em um modelo de referência.</p>
              </>
            )}

            {step === 'Imagem' && (
              <>
                <h3>Observe o exame</h3>
                <p>{path.imageTask}</p>
                <figure className="path-figure">
                  <a href={path.images[imageIndex].src} target="_blank" rel="noreferrer" aria-label="Abrir imagem em tamanho original">
                    <img src={path.images[imageIndex].src} alt={path.images[imageIndex].label} />
                  </a>
                  <figcaption>{path.images[imageIndex].label}</figcaption>
                </figure>
                {path.images.length > 1 && (
                  <div className="path-image-options" aria-label="Imagens disponíveis">
                    {path.images.map((item, index) => (
                      <button className="path-secondary" key={item.src} aria-pressed={imageIndex === index} onClick={() => setImageIndex(index)}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
                <p className="path-meta">
                  {path.imageCredit ? <>
                    Imagem sem alterações · <a href={path.imageCredit.url} target="_blank" rel="noreferrer">{path.imageCredit.label}</a> · <a href={path.imageCredit.licence} target="_blank" rel="noreferrer">CC BY-SA 3.0</a>
                  </> : <>
                    Cortesia de {path.case.author} · <a href={path.case.source} target="_blank" rel="noreferrer">Radiopaedia</a> · <a href="https://radiopaedia.org/licence" target="_blank" rel="noreferrer">Licença</a>
                  </>}
                  <br />Imagens selecionadas. A relação com o atlas é anatômica.
                </p>
                <details className="path-details">
                  <summary>Conferir achados <ChevronDown size={16} /></summary>
                  <p>{path.findings}</p>
                </details>
                {path.id === 'biliar' && <button className="path-secondary" onClick={onOpenBiliary}>Praticar esta janela no simulador de USG <ArrowRight size={16} /></button>}
              </>
            )}

            {step === 'Caso' && (
              <>
                <h3>{path.case.title}</h3>
                <p>{path.case.presentation}</p>
                <button className="path-secondary" aria-expanded={revealed} onClick={() => setRevealed(value => !value)}>
                  {revealed ? 'Ocultar discussão' : 'Revelar discussão'}
                </button>
                {revealed && <p className="path-prompt">{path.case.discussion}</p>}
                <p className="path-meta">Caso de {path.case.author}.</p>
                <a className="path-link" href={path.case.source} target="_blank" rel="noreferrer">Ver caso e exames na Radiopaedia <ExternalLink size={15} /></a>
                {path.id === 'avc' && <button className="path-secondary" onClick={onOpenStroke}>Abrir caso no Mapa Clínico <ArrowRight size={16} /></button>}
              </>
            )}

            {step === 'Questões' && question && (
              <>
                <fieldset className="path-quiz">
                  <legend>{question.prompt}</legend>
                  <small>Questão {questionIndex + 1} de {path.questions.length}</small>
                  {question.options.map((option, index) => (
                    <label key={option} className={checked && index === question.correct ? 'correct' : checked && answer === index ? 'incorrect' : ''}>
                      <input type="radio" name="path-answer" checked={answer === index} disabled={checked}
                        onChange={() => setAnswer(index)} />
                      {option}
                    </label>
                  ))}
                </fieldset>
                {!checked && <button className="path-primary" disabled={answer === null} onClick={checkAnswer}>Conferir resposta</button>}
                {checked && (
                  <>
                    <div className="path-prompt" role="status">
                      <strong>{answer === question.correct ? 'Correto' : `Resposta correta: ${question.options[question.correct]}`}</strong>
                      <p>{question.explanation}</p>
                      <p>{answer === question.correct ? 'A próxima revisão foi agendada.' : 'A questão ficou disponível para revisão agora.'}</p>
                    </div>
                    {!reviewing && questionIndex + 1 < path.questions.length ?
                      <button className="path-primary" onClick={() => { resetActivity(questionIndex + 1); focusHeading(); }}>Próxima questão <ArrowRight size={16} /></button> :
                      <button className="path-primary" onClick={() => navigate('Revisão')}>Ver minha revisão <ArrowRight size={16} /></button>}
                  </>
                )}
              </>
            )}

            {step === 'Revisão' && (
              <>
                <h3>Minha revisão {dueCount > 0 && <span>· {dueCount} para agora</span>}</h3>
                {reviews.length === 0 ? (
                  <>
                    <p>Responda a uma questão para começar sua revisão.</p>
                    <button className="path-primary" onClick={() => navigate('Questões')}>Responder questões <ArrowRight size={16} /></button>
                  </>
                ) : (
                  <ul className="path-reviews">
                    {reviews.map(item => (
                      <li key={`${item.path.id}/${item.question.id}`}>
                        <small>{item.path.title} · {item.record.due <= now ? 'Disponível agora' : `Agendada para ${formatDate.format(item.record.due)}`}</small>
                        <strong>{item.question.prompt}</strong>
                        <button className="path-link" onClick={() => openPath(item.path.id, 'Questões', item.index)}>
                          {item.record.due <= now ? 'Revisar agora' : 'Praticar antes da data'} <ArrowRight size={15} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {coreStep && next && (
              <button className="path-primary" onClick={() => navigate(next, coreStep)}>
                {next === 'Imagem' ? 'Examinar imagem' : next === 'Caso' ? 'Ler o caso' : 'Responder questões'} <ArrowRight size={16} />
              </button>
            )}
          </div>

          <details className="path-details path-references">
            <summary>Fontes de estudo <ChevronDown size={16} /></summary>
            <ul>{path.references.map(ref => <li key={ref.url}><a href={ref.url} target="_blank" rel="noreferrer">{ref.label}</a></li>)}</ul>
          </details>
        </>
      )}
      <p className="path-meta" role="status">{canSave ? 'O progresso fica salvo neste navegador.' : 'O navegador bloqueou o armazenamento. O progresso está disponível nesta sessão.'}</p>
    </section>
  );
}
