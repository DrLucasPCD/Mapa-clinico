import { useState } from 'react';
import { Crosshair, Library, ListChecks } from 'lucide-react';
import curriculum from './curriculum.json';
import { cases } from './content';
import { readCaseJourneyRecords } from './CaseJourney';
import { readPathProgress } from './StudyPaths';
import { studyPaths } from './study-paths';
import { atlasVisualTask, libraryCases, plantaoDecisions, visualTasks, type LibraryCase } from './training-data';
import { getTrainingReview, recordTrainingReview } from './training-review';

type Mark = { x: number; y: number };
export type VisualId = typeof visualTasks[number]['id'] | typeof atlasVisualTask.id;
export const kneeOrgans = ['femur_r', 'tibia_r', 'patella_r'] as const;

export function VisualTraining({ taskId, setTaskId, atlasSelection, selectAtlas, atlasRevision }: {
  taskId: VisualId;
  setTaskId: (value: VisualId) => void;
  atlasSelection: string;
  selectAtlas: (id: string) => void;
  atlasRevision: number;
}) {
  return (
    <section id="visual-training" className="training-screen" aria-labelledby="visual-title">
      <header className="training-header">
        <span className="training-icon"><Crosshair size={23} /></span>
        <div><h2 id="visual-title">Treino visual</h2><p>Localize um achado no exame ou uma estrutura no modelo 3D.</p></div>
      </header>
      <nav className="training-tabs" aria-label="Exercícios visuais">
        {[...visualTasks, atlasVisualTask].map(item => <button key={item.id} aria-pressed={item.id === taskId} onClick={() => setTaskId(item.id)}>{item.title}</button>)}
      </nav>
      {taskId === atlasVisualTask.id
        ? <AtlasExercise key={atlasRevision} selection={atlasSelection} onSelect={selectAtlas} />
        : <ImageExercise key={taskId} task={visualTasks.find(item => item.id === taskId)!} />}
    </section>
  );
}

function AtlasExercise({ selection, onSelect }: { selection: string; onSelect: (id: string) => void }) {
  const [checked, setChecked] = useState(false);
  const correct = selection === atlasVisualTask.target;
  return <div className="training-card">
    <h3>Joelho direito</h3>
    <p>{atlasVisualTask.prompt} Gire o modelo para conferir a posição do osso.</p>
    <p className="training-note">Seleção: {atlasVisualTask.choices.find(choice => choice.id === selection)?.label ?? 'Clique no modelo ou selecione uma opção.'}</p>
    <details><summary>Responder pela lista</summary>
      <div className="training-actions">{atlasVisualTask.choices.map(choice => <button className="training-secondary" key={choice.id} aria-pressed={selection === choice.id} onClick={() => onSelect(choice.id)}>{choice.label}</button>)}</div>
    </details>
    <button className="training-primary" disabled={!selection || checked} onClick={() => {
      setChecked(true);
      recordTrainingReview('visual', atlasVisualTask.id, correct);
    }}>Conferir estrutura</button>
    {checked && <p className="training-feedback" role="status"><strong>{correct ? 'Correto. ' : 'Reveja a vista anterior. '}</strong>{atlasVisualTask.explanation}</p>}
  </div>;
}

function ImageExercise({ task }: { task: typeof visualTasks[number] }) {
  const [mark, setMark] = useState<Mark | null>(null);
  const [checked, setChecked] = useState(false);
  const correct = mark && ((mark.x - task.target.x) / task.target.rx) ** 2 + ((mark.y - task.target.y) / task.target.ry) ** 2 <= 1;
  return (
    <div className="training-card">
      <h3>{task.title}</h3>
      <p>{task.prompt}</p>
      <figure className="training-figure visual-figure">
        <div className="visual-image">
          <button className="visual-click" aria-label="Marcar ponto no exame. Use as setas para mover o marcador." onClick={event => {
            const bounds = event.currentTarget.getBoundingClientRect();
            setChecked(false);
            setMark(event.detail ? { x: (event.clientX - bounds.left) / bounds.width, y: (event.clientY - bounds.top) / bounds.height } : { x: .5, y: .5 });
          }} onKeyDown={event => {
            const keys = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
            const direction = keys[event.key as keyof typeof keys];
            if (!Array.isArray(direction)) return;
            event.preventDefault();
            setChecked(false);
            setMark(previous => {
              const { x, y } = previous ?? { x: .5, y: .5 };
              return { x: Math.max(0, Math.min(1, x + .025 * direction[0])), y: Math.max(0, Math.min(1, y + .025 * direction[1])) };
            });
          }}>
            <img src={task.image} alt={task.title} />
          </button>
          {mark && <span aria-hidden="true" className="visual-mark" style={{ left: `${mark.x * 100}%`, top: `${mark.y * 100}%` }} />}
          {checked && <span aria-hidden="true" className="visual-target" style={{
            left: `${task.target.x * 100}%`, top: `${task.target.y * 100}%`,
            width: `${task.target.rx * 200}%`, height: `${task.target.ry * 200}%`,
          }} />}
        </div>
        <figcaption>{task.credit} · <a href={task.source} target="_blank" rel="noreferrer">Fonte</a> · <a href={task.licence} target="_blank" rel="noreferrer">Licença</a></figcaption>
      </figure>
      <button className="training-primary" disabled={!mark || checked} onClick={() => {
        setChecked(true);
        recordTrainingReview('visual', task.id, Boolean(correct));
      }}>Conferir marcação</button>
      {checked && <p className="training-feedback" role="status"><strong>{correct ? 'Correto. ' : 'Veja a região indicada no exame. '}</strong>{task.explanation}</p>}
    </div>
  );
}

export function CaseLibrary({ onOpen }: { onOpen: (item: LibraryCase) => void }) {
  const [query, setQuery] = useState('');
  const [system, setSystem] = useState('');
  const [modality, setModality] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const visible = libraryCases.filter(item =>
    (!system || item.system === system) && (!modality || item.modality === modality) && (!difficulty || item.difficulty === difficulty) &&
    normalize(`${item.title} ${item.symptoms} ${item.id}`).includes(normalize(query.trim())));
  const filters = [
    { name: 'Sistema', key: 'system', value: system, set: setSystem },
    { name: 'Modalidade', key: 'modality', value: modality, set: setModality },
    { name: 'Dificuldade', key: 'difficulty', value: difficulty, set: setDifficulty },
  ] as const;
  return (
    <section id="case-library" className="training-screen" aria-labelledby="library-title">
      <header className="training-header"><span className="training-icon"><Library size={23} /></span>
        <div><h2 id="library-title">Biblioteca de casos</h2><p>Encontre um caso por sintoma, sistema ou modalidade.</p></div>
      </header>
      <div className="library-filters">
        <label>Sintoma ou tema<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Ex.: febre, trauma ou dor abdominal" /></label>
        {filters.map(filter => <label key={filter.key}>{filter.name}<select value={filter.value} onChange={event => filter.set(event.target.value)}>
          <option value="">Todos</option>
          {[...new Set(libraryCases.map(item => item[filter.key]))].map(value => <option key={value}>{value}</option>)}
        </select></label>)}
      </div>
      <p role="status" className="training-note">{visible.length} {visible.length === 1 ? 'caso encontrado' : 'casos encontrados'}</p>
      <div className="library-cards">
        {visible.map(item => <article className="training-card library-case" key={item.id}>
          {'image' in item && <img src={item.image} alt="" loading="lazy" />}
          <div>
            <small>{item.system} · {item.modality} · {item.difficulty}</small>
            <h3>{item.title}</h3>
            <p>{item.symptoms}</p>
            <p className="training-note">{item.author} · <a href={item.source} target="_blank" rel="noreferrer">Fonte · Radiopaedia</a></p>
            <button className="training-secondary" onClick={() => onOpen(item)}>Estudar caso</button>
          </div>
        </article>)}
      </div>
      {visible.some(item => item.id === '27525') && visible.some(item => item.id === '148000') && <details className="training-card">
        <summary>Comparar USG da vesícula normal e com cálculos</summary>
        <div className="library-compare">{libraryCases.filter(item => item.id === '27525' || item.id === '148000').map(item => <figure key={item.id} className="training-figure">
          <img src={item.image} alt={item.title} loading="lazy" /><figcaption>{item.title} · {item.author}</figcaption>
        </figure>)}</div>
        <p className="training-note"><a href="https://radiopaedia.org/licence" target="_blank" rel="noreferrer">Licença das imagens</a></p>
      </details>}
    </section>
  );
}

export type ReviewDestination =
  | { kind: 'path'; id: string; question: number }
  | { kind: 'case'; id: string }
  | { kind: 'curriculum'; id: string }
  | { kind: 'visual'; id: VisualId }
  | { kind: 'plantao'; decision: number };

export function ReviewCenter({ onOpen }: { onOpen: (destination: ReviewDestination) => void }) {
  const paths = readPathProgress().paths;
  const caseNotes = readCaseJourneyRecords();
  const pending = getTrainingReview();
  const today = Date.now();
  const entries: { label: string; detail: string; destination: ReviewDestination }[] = [];
  studyPaths.forEach(path => path.questions.forEach((question, index) => {
    const record = paths[path.id]?.questions?.[question.id];
    if (record && record.due <= today) entries.push({ label: question.prompt, detail: path.title, destination: { kind: 'path', id: path.id, question: index } });
  }));
  cases.forEach(item => {
    const record = caseNotes[item.id];
    if (record?.wrong || record?.note?.trim()) entries.push({
      label: item.title, detail: record.note?.trim() || 'Questão do caso', destination: { kind: 'case', id: item.id },
    });
  });
  pending.forEach(item => {
    if (item.kind === 'curriculum') {
      const topic = curriculum.modules.find(entry => entry.id === item.id);
      if (topic) entries.push({ label: topic.question, detail: topic.title, destination: { kind: 'curriculum', id: topic.id } });
    } else if (item.kind === 'visual') {
      const task = [...visualTasks, atlasVisualTask].find(entry => entry.id === item.id);
      if (task) entries.push({ label: task.title, detail: 'Treino visual', destination: { kind: 'visual', id: task.id } });
    } else {
      const decision = plantaoDecisions[Number(item.id)];
      if (decision) entries.push({ label: decision.title, detail: 'Plantão · Dor no hipocôndrio direito', destination: { kind: 'plantao', decision: Number(item.id) } });
    }
  });

  return (
    <section id="review-center" className="training-screen" aria-labelledby="review-title">
      <header className="training-header"><span className="training-icon"><ListChecks size={23} /></span>
        <div><h2 id="review-title">Minha revisão</h2><p>Questões pendentes, exercícios e notas de caso neste navegador.</p></div>
      </header>
      {entries.length ? <ul className="review-entries">
        {entries.map((entry, index) => <li key={`${entry.destination.kind}/${index}`} className="training-card">
          <div><strong>{entry.label}</strong><p>{entry.detail}</p></div>
          <button className="training-secondary" onClick={() => onOpen(entry.destination)}>Revisar</button>
        </li>)}
      </ul> : <p className="training-card" role="status">Sem revisões pendentes. As questões a vencer e os próximos erros aparecem aqui.</p>}
    </section>
  );
}
