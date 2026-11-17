import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  FlaskConical,
  ListChecks,
  SlidersHorizontal,
  Square,
  Stethoscope,
  Volume2,
} from 'lucide-react';
import {
  plantaoCases,
  getPlantaoScenario,
  plantaoReviewKey,
  type PlantaoReview,
  type PlantaoScenario,
} from './plantao-cases';
import { getClinicalPlan } from './plantao-clinical';
import { plantaoVoiceUrl } from './plantao-voice';
import { recordTrainingReview } from './training-review';
import type { VisualId } from './visual-localization';
import PlantaoEncounter, {
  EncounterDialog,
  PatientPortrait,
  PatientVitals,
  type EncounterTurn,
} from './PlantaoEncounter';
import {
  assessCommunication,
  examFindings,
  patientIdentity,
  requestedIntervention,
  resolvePatientTurn,
  type Communication,
} from './plantao-encounter';
import './plantao-encounter.css';

const clinicalStages = [
  'Entrevista',
  'Avaliação inicial',
  'Hipótese',
  'Manejo',
  'Devolutiva',
];
const legacyStages = [
  'Entrevista',
  'Exame',
  'Imagem',
  'Hipótese',
  'Devolutiva',
];
const autoVoicePreference = 'mapa-plantao-auto-voice';
const disciplines = [
  ...new Set(plantaoCases.map((item) => item.discipline)),
].sort((a, b) => a.localeCompare(b, 'pt-BR'));
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
type Mode = 'guided' | 'exam';
type Panel = 'record' | 'actions' | 'finish' | null;
type InterventionTab = 'examine' | 'investigate' | 'manage';
const actionTabs: [InterventionTab, string][] = [
  ['examine', 'Examinar'],
  ['investigate', 'Investigar'],
  ['manage', 'Conduzir'],
];
const resultLabel: Record<string, string> = {
  exam: 'Exame físico dirigido',
  vitals: 'Sinais vitais',
  imaging: 'Exame complementar',
  plan: 'Nota de conduta',
};
type Links = {
  onAtlas: (id: string, label: string) => void;
  onCloseAtlas: () => void;
  onUltrasound: () => void;
  onVisual: (id: VisualId) => void;
};

export default function Plantao({
  review,
  ...links
}: Links & { review?: PlantaoReview }) {
  const [selection, setSelection] = useState<string | null>(
    review?.caseId ?? null,
  );
  const [activeReview, setActiveReview] = useState(review);
  const [autoVoice, setAutoVoice] = useState(() => {
    try {
      return localStorage.getItem(autoVoicePreference) !== 'off';
    } catch {
      return true;
    }
  });
  const [discipline, setDiscipline] = useState('');
  const [query, setQuery] = useState('');
  const scenario = selection ? getPlantaoScenario(selection) : undefined;
  const normalizedQuery = normalize(query.trim());
  const visible = plantaoCases.filter(
    (item) =>
      (!discipline || item.discipline === discipline) &&
      normalize(
        `${item.title} ${item.discipline} ${item.modality} ${item.complaint}`,
      ).includes(normalizedQuery),
  );

  function changeAutoVoice(enabled: boolean) {
    setAutoVoice(enabled);
    try {
      localStorage.setItem(autoVoicePreference, enabled ? 'on' : 'off');
    } catch {
      /* Keep the setting for this visit. */
    }
  }

  function generate(previousId?: string) {
    if (!visible.length) return;
    const previousBase = previousId?.split('~')[0];
    const candidates = visible.filter((item) => item.id !== previousBase);
    const pool = candidates.length ? candidates : visible;
    const values = crypto.getRandomValues(new Uint32Array(2));
    const base = pool[values[0] % pool.length];
    const id = `${base.id}~${values[1].toString(36)}`;
    openCase(
      id === previousId
        ? `${base.id}~${((values[1] + 1) >>> 0).toString(36)}`
        : id,
    );
  }

  function openCase(id: string | null) {
    setActiveReview(undefined);
    setSelection(id);
    links.onCloseAtlas();
  }

  return (
    <section
      id="plantao"
      className="training-screen plantao-screen"
      aria-labelledby="plantao-title"
    >
      <header className="training-header">
        <span className="training-icon">
          <Stethoscope size={23} />
        </span>
        <div>
          <h2 id="plantao-title">Modo Plantão</h2>
          <p>
            {scenario?.title ??
              'Investigue a queixa, estabeleça a prioridade e escolha a conduta.'}
          </p>
        </div>
      </header>
      {scenario ? (
        <>
          <button
            className="training-secondary plantao-return"
            onClick={() => openCase(null)}
          >
            <ArrowLeft size={16} /> Voltar aos casos
          </button>
          <PlantaoSession
            key={scenario.id}
            scenario={scenario}
            review={activeReview}
            onBack={() => openCase(null)}
            onGenerate={
              scenario.generated && !activeReview
                ? () => generate(scenario.id)
                : undefined
            }
            autoVoice={autoVoice}
            onAutoVoiceChange={changeAutoVoice}
            {...links}
          />
        </>
      ) : (
        <>
          <div className="library-filters plantao-filters">
            <label>
              Buscar atendimento
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Queixa ou especialidade"
              />
            </label>
            <label>
              Especialidade
              <select
                value={discipline}
                onChange={(event) => setDiscipline(event.target.value)}
              >
                <option value="">Todas</option>
                {disciplines.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <button
              className="training-primary"
              disabled={!visible.length}
              onClick={() => generate()}
            >
              Gerar caso clínico <ArrowRight size={16} />
            </button>
          </div>
          <output className="training-note">
            {visible.length === plantaoCases.length
              ? `${visible.length} casos na base`
              : `${visible.length} de ${plantaoCases.length} casos`}{' '}
            · O gerador usa a base filtrada para variar o relato e treinar
            avaliação inicial, hipótese e manejo.
          </output>
          <div className="plantao-catalog" aria-label="Casos do Modo Plantão">
            {visible.map((item) => (
              <article className="training-card plantao-case" key={item.id}>
                <small>{item.discipline}</small>
                <h3>{item.title}</h3>
                <p>{item.complaint}</p>
                <button
                  className="training-secondary"
                  onClick={() => openCase(item.id)}
                >
                  Atender <span className="sr-only">{item.title}</span>
                  <ArrowRight size={16} />
                </button>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function PlantaoSession({
  scenario,
  review,
  onBack,
  onGenerate,
  onAtlas,
  onCloseAtlas,
  onUltrasound,
  onVisual,
  autoVoice,
  onAutoVoiceChange,
}: Links & {
  scenario: PlantaoScenario;
  review?: PlantaoReview;
  onBack: () => void;
  onGenerate?: () => void;
  autoVoice: boolean;
  onAutoVoiceChange: (enabled: boolean) => void;
}) {
  const reviewing = review !== undefined;
  const clinical = !review || review.clinical === true;
  const stages = clinical ? clinicalStages : legacyStages;
  const [mode, setMode] = useState<Mode | null>(reviewing ? 'guided' : null);
  const [step, setStep] = useState(review ? review.decision + 1 : 0);
  const [asked, setAsked] = useState<number[]>([]);
  const [turns, setTurns] = useState<EncounterTurn[]>([]);
  const [communication, setCommunication] = useState<Communication>({
    introduced: false,
    supported: false,
  });
  const [panel, setPanel] = useState<Panel>(null);
  const [actionTab, setActionTab] = useState<InterventionTab>('examine');
  const [results, setResults] = useState<string[]>([]);
  const [planDraft, setPlanDraft] = useState('');
  const [savedPlan, setSavedPlan] = useState('');
  const [answers, setAnswers] = useState<number[]>([]);
  const [choice, setChoice] = useState<number | null>(null);
  const [hint, setHint] = useState(false);
  const player = useRef<HTMLAudioElement>(null);
  const medicalConsole = useRef<HTMLDivElement>(null);
  const visitStage = useRef<HTMLDivElement>(null);
  const voiceRequest = useRef(0);
  const [activeVoice, setActiveVoice] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [voiceError, setVoiceError] = useState(false);
  useEffect(() => {
    const audio = player.current;
    return () => {
      voiceRequest.current += 1;
      audio?.pause();
    };
  }, []);
  const { interview, visual, atlas } = scenario;
  const plan = getClinicalPlan(scenario);
  const decisions = clinical ? plan.decisions : scenario.decisions;
  const reference = clinical ? plan.reference : scenario.reference;
  const decision = decisions[step - 1];
  const confirmed = step > 0 && answers[step - 1] !== undefined;
  const keyQuestions = interview.filter((item) => item.key);
  const askedKey = asked.filter((index) => interview[index].key).length;
  const finished = mode !== null && step === stages.length - 1;
  const identity = patientIdentity(scenario);
  const latest = turns.at(-1);
  const findings = examFindings(scenario);

  function stopVoice() {
    voiceRequest.current += 1;
    player.current?.pause();
    setActiveVoice(null);
    setSpeaking(false);
  }

  function playVoice(key: string, text: string) {
    const audio = player.current;
    if (!audio) return;
    const request = ++voiceRequest.current;
    audio.src = plantaoVoiceUrl(text);
    setActiveVoice(key);
    setVoiceError(false);
    audio.play().catch(() => {
      if (request !== voiceRequest.current) return;
      stopVoice();
      setVoiceError(true);
    });
  }

  function voiceButton(key: string, text: string, label: string) {
    const active = activeVoice === key;
    const Icon = active ? Square : Volume2;
    return (
      <button
        type="button"
        className="plantao-voice-button"
        onClick={() => (active ? stopVoice() : playVoice(key, text))}
      >
        <Icon size={16} aria-hidden="true" /> {active ? 'Parar áudio' : label}
      </button>
    );
  }

  function start(next: Mode | null) {
    stopVoice();
    setVoiceError(false);
    if (next && autoVoice) playVoice('complaint', scenario.complaint);
    setMode(next);
    setStep(0);
    setAsked([]);
    setTurns([]);
    setCommunication({ introduced: false, supported: false });
    setResults([]);
    setPanel(null);
    setPlanDraft('');
    setSavedPlan('');
    setAnswers([]);
    setChoice(null);
    setHint(false);
    onCloseAtlas();
  }

  function advance() {
    stopVoice();
    setStep((value) => value + 1);
    setChoice(null);
    setHint(false);
  }

  function submit() {
    if (choice === null || !decision || confirmed) return;
    const nextAnswers = [...answers];
    nextAnswers[step - 1] = choice;
    setAnswers(nextAnswers);
    recordTrainingReview(
      'plantao',
      plantaoReviewKey(scenario.id, step - 1, clinical),
      choice === decision.correct,
    );
    if (mode === 'exam') advance();
  }

  function openActions(tab: InterventionTab) {
    setActionTab(tab);
    setPanel('actions');
  }

  function collect(result: string) {
    setResults((previous) => [
      ...previous.filter((item) => item !== result),
      result,
    ]);
    setPanel(null);
    requestAnimationFrame(() => medicalConsole.current?.focus());
  }

  function retainCommunication(cues: Communication) {
    setCommunication((previous) => ({
      introduced: previous.introduced || cues.introduced,
      supported: previous.supported || cues.supported,
    }));
  }

  function ask(text: string) {
    const action = requestedIntervention(text);
    if (action) {
      stopVoice();
      retainCommunication(assessCommunication(text));
      if (action === 'investigate') openActions('investigate');
      else collect(action);
      return;
    }
    const result = resolvePatientTurn(scenario, text);
    retainCommunication(result);
    if (result.index !== undefined) {
      const index = result.index;
      setAsked((previous) =>
        previous.includes(index) ? previous : [...previous, index],
      );
    }
    setTurns((previous) => [
      ...previous,
      { question: text, answer: result.answer },
    ]);
    if (autoVoice) playVoice('reply', result.answer);
  }

  function finish() {
    stopVoice();
    setPanel(null);
    setStep(stages.length - 1);
    setChoice(null);
    setHint(false);
  }

  return (
    <div
      className={'plantao-layout' + (!reviewing ? ' plantao-consultation' : '')}
    >
      {!reviewing && <PatientVitals scenario={scenario} />}
      <div
        className="training-card plantao-stage"
        tabIndex={-1}
        ref={visitStage}
      >
        {!mode && (
          <>
            <h3>Escolha como atender</h3>
            <div className="plantao-mode">
              <button onClick={() => start('guided')}>
                <strong>Modo guiado</strong>
                <span>Dicas e comentários após cada decisão.</span>
                <ArrowRight size={18} />
              </button>
              <button onClick={() => start('exam')}>
                <strong>Modo prova</strong>
                <span>Respostas e explicações na devolutiva.</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </>
        )}
        {mode && step === 0 && (
          <>
            <PlantaoEncounter
              scenario={scenario}
              latest={latest}
              asked={asked}
              speaking={speaking}
              onAsk={ask}
              onOpen={(next) =>
                next === 'actions' ? openActions('examine') : setPanel(next)
              }
              onStopVoice={stopVoice}
              voiceButton={voiceButton}
            />
            {mode === 'guided' && (
              <>
                {turns.length > 0 && (
                  <details>
                    <summary>
                      Feedback da entrevista · {askedKey}/{keyQuestions.length}{' '}
                      pistas
                    </summary>
                    <CommunicationChecklist cues={communication} />
                  </details>
                )}
                <details>
                  <summary>Ver dica</summary>
                  <p>{scenario.interviewHint}</p>
                </details>
              </>
            )}
            <button className="training-primary" onClick={advance}>
              Ir para a avaliação inicial <ArrowRight size={16} />
            </button>
          </>
        )}
        {mode && decision && (
          <>
            {reviewing && <h3>Revisão · {stages[step]}</h3>}
            {!clinical && step === 2 && <PlantaoFigure scenario={scenario} />}
            {!clinical && step === 3 && (
              <p className="training-feedback">
                <strong>Laudo resumido</strong>
                <br />
                {scenario.report}
              </p>
            )}
            <fieldset className="training-options">
              <legend>{decision.title}</legend>
              {decision.options.map((option, index) => (
                <label key={option}>
                  <input
                    type="radio"
                    name={`plantao-${scenario.id}-${step}`}
                    checked={choice === index}
                    disabled={confirmed}
                    onChange={() => setChoice(index)}
                  />
                  {option}
                </label>
              ))}
            </fieldset>
            {clinical && !reviewing && (
              <div className="training-actions">
                {step === 1 ? (
                  <button
                    type="button"
                    className="training-secondary"
                    onClick={() => openActions('examine')}
                  >
                    <Stethoscope size={15} /> Examinar paciente
                  </button>
                ) : (
                  <button
                    type="button"
                    className="training-secondary"
                    onClick={() => openActions('investigate')}
                  >
                    <FlaskConical size={15} /> Consultar exames complementares
                  </button>
                )}
              </div>
            )}
            {mode === 'guided' && !confirmed && (
              <button
                className="training-secondary"
                aria-expanded={hint}
                onClick={() => setHint((value) => !value)}
              >
                Dica
              </button>
            )}
            {hint && !confirmed && (
              <p className="training-feedback">{decision.hint}</p>
            )}
            {!confirmed && (
              <button
                className="training-primary"
                disabled={choice === null}
                onClick={submit}
              >
                {mode === 'exam' ? 'Registrar e continuar' : 'Conferir decisão'}{' '}
                <ArrowRight size={16} />
              </button>
            )}
            {confirmed && (
              <>
                <output className="training-feedback">
                  <strong>
                    {choice === decision.correct
                      ? 'Correto'
                      : decision.options[decision.correct]}
                  </strong>
                  <br />
                  {decision.explanation}
                </output>
                <button
                  className="training-primary"
                  onClick={reviewing ? onBack : advance}
                >
                  {reviewing ? 'Voltar aos casos' : stages[step + 1]}{' '}
                  <ArrowRight size={16} />
                </button>
              </>
            )}
          </>
        )}
        {finished && (
          <>
            <h3>Devolutiva</h3>
            <p>
              <strong>
                {
                  answers.filter(
                    (answer, index) => answer === decisions[index].correct,
                  ).length
                }{' '}
                de {decisions.length} decisões corretas
              </strong>{' '}
              · {askedKey} de {keyQuestions.length} pistas principais
              exploradas.
            </p>
            <section
              className="plantao-communication-review"
              aria-label="Comunicação com o paciente"
            >
              <h4>Comunicação com o paciente</h4>
              <CommunicationChecklist cues={communication} />
            </section>
            <details>
              <summary>Rever as pistas da entrevista</summary>
              <ul>
                {keyQuestions.map((item) => (
                  <li key={item.question}>
                    <strong>{item.question}</strong> {item.answer}
                  </li>
                ))}
              </ul>
            </details>
            <ol className="plantao-results">
              {decisions.map((item, index) => (
                <li key={item.title}>
                  <strong>{item.title}</strong>
                  <p>
                    Sua escolha:{' '}
                    {answers[index] === undefined
                      ? 'Sem resposta'
                      : item.options[answers[index]]}
                  </p>
                  <p>Resposta: {item.options[item.correct]}</p>
                  <p>{item.explanation}</p>
                </li>
              ))}
            </ol>
            {clinical && <ComplementaryExams scenario={scenario} />}
            <div className="training-actions">
              {onGenerate && (
                <button className="training-primary" onClick={onGenerate}>
                  Gerar outro caso clínico <ArrowRight size={16} />
                </button>
              )}
              {visual && (
                <button
                  className="training-secondary"
                  onClick={() => onVisual(visual)}
                >
                  Localizar achado no exame
                </button>
              )}
              {atlas && (
                <button
                  className="training-secondary"
                  onClick={() => onAtlas(atlas.id, atlas.name)}
                >
                  Rever no Atlas 3D
                </button>
              )}
              {scenario.id.split('~')[0] === 'biliary' && (
                <button className="training-secondary" onClick={onUltrasound}>
                  Praticar no simulador de USG
                </button>
              )}
              <button
                className="training-secondary"
                onClick={() => start(null)}
              >
                Refazer atendimento
              </button>
            </div>
            <p className="training-note">
              {scenario.credit} ·{' '}
              <a href={scenario.source} target="_blank" rel="noreferrer">
                Caso original
              </a>{' '}
              ·{' '}
              <a href={scenario.licence} target="_blank" rel="noreferrer">
                Licença
              </a>
              {reference && (
                <>
                  {' '}
                  ·{' '}
                  <a href={reference.url} target="_blank" rel="noreferrer">
                    {reference.label}
                  </a>
                </>
              )}
            </p>
          </>
        )}
      </div>
      <aside className="training-card plantao-chart">
        <h3>
          <ClipboardList size={18} /> Prontuário da simulação
        </h3>
        <p>
          <strong>{identity.name}</strong> · {scenario.patient}
          <br />«{scenario.complaint}»
        </p>
        {/* oxlint-disable-next-line jsx-a11y/media-has-caption -- The full utterance is displayed next to each play button. */}
        <audio
          ref={player}
          preload="none"
          onPlaying={() => setSpeaking(true)}
          onPause={() => setSpeaking(false)}
          onEnded={stopVoice}
        />
        <div className="plantao-voice-controls">
          {voiceButton('complaint', scenario.complaint, 'Ouvir queixa')}
          <label>
            <input
              type="checkbox"
              checked={autoVoice}
              onChange={(event) => {
                const enabled = event.target.checked;
                if (!enabled) stopVoice();
                onAutoVoiceChange(enabled);
              }}
            />
            Falas automáticas
          </label>
        </div>
        {voiceError && (
          <output className="training-note">
            Áudio indisponível. Toque em Ouvir para tentar novamente.
          </output>
        )}
        <small>
          {scenario.generated
            ? 'Variação de um caso da base clínica.'
            : 'História clínica adaptada para simulação.'}
        </small>
        {reviewing && step > 0 && (
          <p>
            <strong>Exame físico</strong>
            <br />
            {scenario.exam}
          </p>
        )}
        {mode && !reviewing && (
          <ol className="plantao-progress" aria-label="Etapas do atendimento">
            {stages.map((item, index) => (
              <li
                key={item}
                aria-current={step === index ? 'step' : undefined}
                className={index <= step ? 'reached' : ''}
              >
                {item}
              </li>
            ))}
          </ol>
        )}
        {mode && !reviewing && step > 0 && !finished && (
          <div className="plantao-chart-actions">
            <button
              type="button"
              className="training-secondary"
              onClick={() => setPanel('record')}
            >
              <ClipboardList size={15} /> Ficha do paciente
            </button>
            <button
              type="button"
              className="training-secondary"
              onClick={() =>
                openActions(
                  step === 1
                    ? 'examine'
                    : step === 2
                      ? 'investigate'
                      : 'manage',
                )
              }
            >
              <SlidersHorizontal size={15} /> Intervenções
            </button>
          </div>
        )}
        {mode && !reviewing && (
          <div className="plantao-console" ref={medicalConsole} tabIndex={-1}>
            <h3>
              <ListChecks size={17} /> Console médico
            </h3>
            {!results.length && (
              <p className="training-note">
                Os resultados das intervenções aparecem aqui.
              </p>
            )}
            {[...results].reverse().map((item, index) => (
              <details key={item} open={index === 0}>
                <summary>
                  {resultLabel[item] ?? item}
                  {item === 'imaging' ? ' · ' + scenario.modality : ''}
                </summary>
                {item === 'exam' && <p>{scenario.exam}</p>}
                {findings[item] && <p>{findings[item]}</p>}
                {item === 'vitals' && (
                  <PatientVitals scenario={scenario} compact />
                )}
                {item === 'imaging' && (
                  <>
                    <p>{scenario.report}</p>
                    <PlantaoFigure scenario={scenario} />
                  </>
                )}
                {item === 'plan' && (
                  <p className="plantao-entered-plan">{savedPlan}</p>
                )}
              </details>
            ))}
            {!finished && results.length > 0 && (
              <button
                className="training-secondary plantao-resume"
                type="button"
                onClick={() => visitStage.current?.focus()}
              >
                <ArrowLeft size={15} /> Voltar ao atendimento
              </button>
            )}
            {!finished && (
              <button
                className="plantao-end"
                type="button"
                onClick={() => setPanel('finish')}
              >
                Encerrar atendimento
              </button>
            )}
          </div>
        )}
        {turns.length > 0 && (
          <details>
            <summary>Histórico da conversa ({turns.length})</summary>
            <ol className="plantao-turn-list">
              {turns.map((turn, index) => (
                <li key={index}>
                  <strong>{turn.question}</strong>
                  <p>{turn.answer}</p>
                  {voiceButton(`turn-${index}`, turn.answer, 'Ouvir resposta')}
                </li>
              ))}
            </ol>
          </details>
        )}
      </aside>
      {panel === 'record' && (
        <EncounterDialog
          title="Ficha do paciente"
          onClose={() => setPanel(null)}
        >
          <div className="plantao-patient-record">
            <PatientPortrait scenario={scenario} speaking={speaking} />
            <strong>{identity.name}</strong>
            <p>
              {scenario.patient} · {scenario.discipline}
            </p>
          </div>
          <h4>Queixa principal</h4>
          <p>«{scenario.complaint}»</p>
          {voiceButton('complaint', scenario.complaint, 'Ouvir queixa')}
          <h4>Sinais vitais simulados</h4>
          <PatientVitals scenario={scenario} compact />
        </EncounterDialog>
      )}
      {panel === 'actions' && (
        <EncounterDialog title="Intervenções" onClose={() => setPanel(null)}>
          <div
            className="plantao-action-tabs training-tabs"
            aria-label="Tipos de intervenção"
          >
            {actionTabs.map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={id === actionTab}
                onClick={() => setActionTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {actionTab === 'examine' && (
            <div className="plantao-action-list">
              {['vitals', 'exam', ...Object.keys(findings)].map((result) => (
                <button
                  key={result}
                  type="button"
                  className="training-secondary"
                  onClick={() => collect(result)}
                >
                  <span>
                    <strong>{resultLabel[result] ?? result}</strong>
                    <small>
                      {result === 'vitals'
                        ? 'Revisar os dados de monitorização do caso.'
                        : 'Obter os achados do exame do caso.'}
                    </small>
                  </span>
                  <span>
                    {results.includes(result) ? 'Rever' : 'Solicitar'}
                  </span>
                </button>
              ))}
            </div>
          )}
          {actionTab === 'investigate' && (
            <div className="plantao-action-list">
              <button
                type="button"
                className="training-secondary"
                disabled={step < 2}
                onClick={() => collect('imaging')}
              >
                <span>
                  <strong>Exame disponível · {scenario.modality}</strong>
                  <small>
                    {step < 2
                      ? 'Disponível após a avaliação inicial.'
                      : 'Laudo e imagem disponíveis no console médico.'}
                  </small>
                </span>
                <span>
                  {results.includes('imaging') ? 'Rever' : 'Solicitar'}
                </span>
              </button>
            </div>
          )}
          {actionTab === 'manage' && (
            <form
              className="plantao-plan-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (!planDraft.trim()) return;
                setSavedPlan(planDraft.trim());
                collect('plan');
              }}
            >
              <label>
                Nota de conduta
                <textarea
                  rows={4}
                  maxLength={900}
                  value={planDraft}
                  onChange={(event) => setPlanDraft(event.target.value)}
                  placeholder="Registre seu plano para discutir na devolutiva."
                />
              </label>
              <small>
                A correção do manejo é feita na etapa de decisão clínica.
              </small>
              <button
                className="training-primary"
                type="submit"
                disabled={!planDraft.trim()}
              >
                Registrar no console
              </button>
            </form>
          )}
        </EncounterDialog>
      )}
      {panel === 'finish' && (
        <EncounterDialog
          title="Encerrar atendimento"
          onClose={() => setPanel(null)}
        >
          <p>
            Abra a devolutiva com as decisões já registradas. As etapas
            restantes ficam como sem resposta.
          </p>
          <div className="training-actions">
            <button
              type="button"
              className="training-secondary"
              onClick={() => setPanel(null)}
            >
              Continuar atendendo
            </button>
            <button type="button" className="training-primary" onClick={finish}>
              Ver devolutiva
            </button>
          </div>
        </EncounterDialog>
      )}
    </div>
  );
}

function CommunicationChecklist({ cues }: { cues: Communication }) {
  return (
    <ul>
      <li>
        {cues.introduced ? 'Registrada' : 'A desenvolver'} · Apresentação e
        papel no atendimento
      </li>
      <li>
        {cues.supported ? 'Registrado' : 'A desenvolver'} · Acolhimento ou
        explicação ao paciente
      </li>
    </ul>
  );
}

function ComplementaryExams({ scenario }: { scenario: PlantaoScenario }) {
  return (
    <details className="plantao-complementary">
      <summary>Consultar exames complementares</summary>
      <p>
        <strong>Laudo resumido</strong>
        <br />
        {scenario.report}
      </p>
      <PlantaoFigure scenario={scenario} />
    </details>
  );
}

function PlantaoFigure({ scenario }: { scenario: PlantaoScenario }) {
  return (
    <figure className="training-figure">
      {/* oxlint-disable-next-line next/no-img-element -- The original examination figure is served by Vite. */}
      <img
        loading="lazy"
        src={scenario.image}
        alt={`Imagem de ${scenario.modality} do caso em estudo`}
      />
      <figcaption>
        {scenario.credit} ·{' '}
        <a href={scenario.licence} target="_blank" rel="noreferrer">
          Licença
        </a>
      </figcaption>
    </figure>
  );
}
