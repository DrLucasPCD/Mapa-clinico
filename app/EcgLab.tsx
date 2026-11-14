import { lazy, memo, Suspense, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Activity, ArrowRight, ArrowUpRight, BookOpen, ChevronRight, ClipboardList, Focus, Heart, Home, Maximize2, Minimize2, Pause, Play, RotateCcw, Settings2, Target } from 'lucide-react';
import { activationTimes, axisClass, calculateAxis, chestLeads, ecgActivation, ecgBeats, ecgLeads, ecgPatterns, electricalVector, frontalLeads, patternIds, posteriorLeads, projectLead, rightLeads, type LeadId, type PatternId } from './ecg-model';
import EcgConduction from './EcgConduction';
import { conductionSteps } from './ecg-conduction';
import EcgPlacement from './EcgPlacement';
import './ecg-dashboard.css';

const EcgHeart = lazy(() => import('./EcgHeart'));
const groups = {
  '12 derivações': [...frontalLeads, ...chestLeads],
  Frontais: frontalLeads,
  Precordiais: chestLeads,
  Direitas: rightLeads,
  Posteriores: posteriorLeads,
};
const allLeads = [...frontalLeads, ...chestLeads, ...rightLeads, ...posteriorLeads];

const EcgTrace = memo(function EcgTrace({ values, lead, speed, gain, cursor, duration, onSeek, large = false }: {
  values: number[]; lead: LeadId; speed: number; gain: number; cursor?: number; duration: number; onSeek?: (time: number) => void; large?: boolean;
}) {
  const id = useId();
  const svg = useRef<SVGSVGElement>(null);
  const [aspect, setAspect] = useState<number>();
  const scale = 4;
  const width = duration * speed * scale;
  const height = large ? Math.round(width * (aspect ?? .55)) : 200;
  const middle = height / 2;
  const pointY = (value: number) => middle - value * gain * scale;
  const path = useMemo(() => values.map((value, index) => {
    const x = width * index / (values.length - 1);
    return `${index ? 'L' : 'M'}${x.toFixed(1)} ${(middle - value * gain * scale).toFixed(1)}`;
  }).join(' '), [values, width, middle, gain]);
  const cursorX = cursor === undefined ? null : cursor / duration * width;
  const cursorValue = cursor === undefined ? null : values[Math.min(values.length - 1, Math.round(cursor / duration * (values.length - 1)))];
  useEffect(() => {
    const parent = svg.current?.parentElement;
    if (!large || !parent) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setAspect(height / width);
    });
    observer.observe(parent);
    return () => observer.disconnect();
  }, [large]);
  return (
    <svg ref={svg} className={onSeek ? 'ecg-trace seek' : 'ecg-trace'} viewBox={`0 0 ${width} ${height}`} role="img"
      aria-label={`Traçado simulado da derivação ${lead}, ${duration} segundos`}
      onClick={onSeek ? event => {
        const bounds = event.currentTarget.getBoundingClientRect();
        onSeek(Math.max(0, Math.min(duration, (event.clientX - bounds.left) / bounds.width * duration)));
      } : undefined}>
      <defs>
        <pattern id={`${id}-minor`} width={scale} height={scale} patternUnits="userSpaceOnUse">
          <path d={`M ${scale} 0 H 0 V ${scale}`} fill="none" stroke="#f5d9dc" strokeWidth=".55" />
        </pattern>
        <pattern id={`${id}-major`} width={scale * 5} height={scale * 5} patternUnits="userSpaceOnUse">
          <rect width={scale * 5} height={scale * 5} fill={`url(#${id}-minor)`} />
          <path d={`M ${scale * 5} 0 H 0 V ${scale * 5}`} fill="none" stroke="#edb1b9" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={width} height={height} fill="#fff9fa" />
      <rect width={width} height={height} fill={`url(#${id}-major)`} />
      <path d={path} fill="none" stroke="#182126" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      {cursorX !== null && cursorValue !== null && <>
        <line x1={cursorX} y1="0" x2={cursorX} y2={height} stroke="#00848e" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <circle cx={cursorX} cy={pointY(cursorValue)} r="5" fill="#00848e" />
      </>}
    </svg>
  );
});

const reading = [
  ['Calibração', 'Confira velocidade e ganho. A 25 mm/s, cada quadrado de 1 mm equivale a 40 ms. A 10 mm/mV, 1 mm equivale a 0,1 mV.'],
  ['Frequência e ritmo', 'Compare os intervalos RR. Procure ondas P e observe se cada P tem relação constante com um QRS. Em ritmo regular, divida 300 pelo número de quadrados grandes entre dois R.'],
  ['Eixo frontal', 'Compare as deflexões líquidas do QRS em I e aVF. Se I for positivo e aVF negativo, II ajuda a distinguir um eixo limítrofe de um desvio para a esquerda.'],
  ['Intervalos e QRS', 'Meça PR, duração do QRS e QT. Compare a morfologia dos complexos entre derivações e interprete o QT em relação à frequência.'],
  ['ST e onda T', 'Compare o ponto J, o segmento ST e a onda T em derivações vizinhas. Relacione os achados com o contexto clínico.'],
];

export default function EcgLab({ onAnatomy, onHome }: { onAnatomy: () => void; onHome: () => void }) {
  const [pattern, setPattern] = useState<PatternId>('sinus');
  const [bpm, setBpm] = useState<number>(ecgPatterns.sinus.bpm);
  const [frequencyDraft, setFrequencyDraft] = useState<string | null>(null);
  const [axis, setAxis] = useState<number>(ecgPatterns.sinus.axis);
  const [group, setGroup] = useState<keyof typeof groups>('12 derivações');
  const [lead, setLead] = useState<LeadId>('II');
  const [speed, setSpeed] = useState(25);
  const [gain, setGain] = useState(10);
  const [cursor, setCursor] = useState(.8);
  const [playing, setPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [expanded, setExpanded] = useState<'heart' | 'trace' | null>(null);
  const [answer, setAnswer] = useState<number | null>(null);
  const [tab, setTab] = useState<'sim' | 'axis' | 'reading' | 'placement' | 'case' | 'quiz'>('sim');
  const [showConduction, setShowConduction] = useState(true);
  const [placementLead, setPlacementLead] = useState<LeadId>();
  const [leadView, setLeadView] = useState<'group' | 'single' | 'all' | 'none'>('group');
  const [axisI, setAxisI] = useState('5');
  const [axisAvf, setAxisAvf] = useState('7');
  const duration = speed === 25 ? 6 : 3;
  const beats = useMemo(() => ecgBeats(pattern, bpm, duration), [pattern, bpm, duration]);
  const signals = useMemo(() => {
    const vectors = Array.from({ length: duration * 250 + 1 }, (_, index) => electricalVector(index / 250, beats, pattern, axis));
    const leads = new Set([...groups[group], ...frontalLeads, lead]);
    return Object.fromEntries([...leads].map(item => [item, vectors.map(vector => projectLead(vector, item))])) as Partial<Record<LeadId, number[]>>;
  }, [duration, beats, pattern, axis, group, lead]);
  const time = Math.min(cursor, duration);
  const vector = electricalVector(time, beats, pattern, axis);
  const voltage = projectLead(vector, lead);
  const phase = ecgActivation(time, beats, pattern);
  const stageTimes = useMemo(() => activationTimes(duration, beats, pattern), [duration, beats, pattern]);
  const visibleLeads = leadView === 'all' ? allLeads : leadView === 'group' ? groups[group] : leadView === 'none' ? [] : [lead];
  const showPath = showConduction && pattern !== 'vt';
  const angle = axisI.trim() && axisAvf.trim() ? calculateAxis(Number(axisI), Number(axisAvf)) : null;

  useEffect(() => {
    if (!playing || tab !== 'sim') return;
    let frame = 0;
    let previous = 0;
    const move = (timestamp: number) => {
      if (previous) {
        const delta = Math.min(.05, (timestamp - previous) / 1000) * playbackSpeed;
        setCursor(value => (value + delta) % duration);
      }
      previous = timestamp;
      frame = requestAnimationFrame(move);
    };
    frame = requestAnimationFrame(move);
    return () => cancelAnimationFrame(frame);
  }, [playing, playbackSpeed, duration, tab]);

  useEffect(() => {
    if (!expanded) return;
    function close(event: KeyboardEvent) {
      if (event.key === 'Escape') setExpanded(null);
    }
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [expanded]);

  function openTab(next: typeof tab) {
    setPlaying(false);
    setExpanded(null);
    setTab(next);
  }

  function setFrequency(value: number) {
    if (Number.isFinite(value)) setBpm(Math.round(Math.max(35, Math.min(180, value))));
  }

  function openPlacement(fromLead = false) {
    setPlacementLead(fromLead ? lead : undefined);
    openTab('placement');
  }

  function choosePattern(next: PatternId) {
    setFrequencyDraft(null);
    setPattern(next);
    setBpm(ecgPatterns[next].bpm);
    setAxis(ecgPatterns[next].axis);
    setCursor(.25);
  }

  function chooseGroup(next: keyof typeof groups) {
    setGroup(next);
    if (!groups[next].some(item => item === lead)) setLead(groups[next][0]);
  }

  function seek(next: number) {
    setPlaying(false);
    setCursor(next);
  }

  function seekStage(index: number) {
    const options = stageTimes[index];
    if (options?.length) {
      seek(options.reduce((nearest, candidate) =>
        Math.abs(candidate - time) < Math.abs(nearest - time) ? candidate : nearest));
    }
  }

  const visibleAxis = [Math.cos(axis * Math.PI / 180) * 66, Math.sin(axis * Math.PI / 180) * 66];
  const frontalVector = [visibleAxis[0] / 66, visibleAxis[1] / 66, 0] as const;
  function dragAxis(event: React.PointerEvent<SVGSVGElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left - bounds.width / 2;
    const y = event.clientY - bounds.top - bounds.height / 2;
    if (Math.hypot(x, y) > 4) setAxis(Math.round(Math.atan2(y, x) * 180 / Math.PI));
  }

  return (
    <section id="ecg-lab" className="training-screen ecg-lab" aria-labelledby="ecg-title">
      <nav className="ecg-breadcrumb" aria-label="Localização no aplicativo">
        <button onClick={onHome} aria-label="Início"><Home size={16} /></button><ChevronRight size={14} />
        <span>Laboratórios</span><ChevronRight size={14} /><strong>ECG</strong>
      </nav>
      <header className="training-header ecg-dashboard-header">
        <span className="training-icon"><Activity size={28} /></span>
        <div><h2 id="ecg-title">Laboratório de ECG</h2><p>Da anatomia ao diagnóstico, em um só lugar.</p></div>
      </header>
      <nav className="ecg-learning-path" aria-label="Percurso no laboratório">
        <button onClick={onAnatomy}><Heart size={20} /> Anatomia</button>
        <ArrowRight size={17} aria-hidden="true" />
        <button aria-current={tab === 'reading' ? 'page' : undefined} onClick={() => openTab('reading')}><Activity size={20} /> Fisiologia</button>
        <ArrowRight size={17} aria-hidden="true" />
        <button aria-current={tab === 'sim' ? 'page' : undefined} onClick={() => openTab('sim')}><Activity size={20} /> ECG</button>
        <ArrowRight size={17} aria-hidden="true" />
        <button aria-current={tab === 'case' ? 'page' : undefined} onClick={() => openTab('case')}><ClipboardList size={20} /> Caso clínico</button>
      </nav>
      {tab === 'sim' && <>
        <div className="ecg-summary-row">
          <section className="ecg-surface ecg-vitals" aria-label="Resumo do ECG simulado">
            <label className="ecg-vital"><Activity /><span>Ritmo<select aria-label="Padrão" value={pattern} onChange={event => choosePattern(event.target.value as PatternId)}>
              {patternIds.map(id => <option key={id} value={id}>{ecgPatterns[id].name}</option>)}
            </select></span></label>
            <div className="ecg-vital"><Heart /><span>FC<strong>{bpm} bpm{pattern === 'af' ? ' (alvo)' : ''}</strong></span></div>
            <button className="ecg-vital" onClick={() => openTab('axis')} title="Abrir calculadora do eixo"><ArrowUpRight /><span>Eixo<strong>{axis > 0 ? '+' : ''}{axis}°</strong></span></button>
          </section>
          <section className="ecg-surface ecg-rate-card" aria-label="Controles do simulador">
            <button className="ecg-round-play" aria-label={playing ? 'Pausar ECG' : 'Reproduzir ECG'} onClick={() => setPlaying(value => !value)}>
              {playing ? <Pause size={19} /> : <Play size={19} />}
            </button>
            <div className="ecg-rate-range">
              <label htmlFor="ecg-heart-rate">Frequência (bpm)</label>
              <input id="ecg-heart-rate" type="range" min="35" max="180" step="1" value={bpm} disabled={pattern === 'flutter'} onChange={event => setFrequency(event.target.valueAsNumber)} />
              <div><span>35</span><span>180</span></div>
            </div>
            <input className="ecg-rate-number" aria-label="Frequência em bpm" type="number" min="35" max="180" value={frequencyDraft ?? bpm} disabled={pattern === 'flutter'}
              onChange={event => setFrequencyDraft(event.target.value)} onBlur={event => {
                if (event.target.value !== '') setFrequency(event.target.valueAsNumber);
                setFrequencyDraft(null);
              }}
              onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} />
            <details className="ecg-settings-menu">
              <summary aria-label="Configurações do ECG" title="Configurações"><Settings2 size={18} /></summary>
              <div className="ecg-settings">
                <label>Eixo QRS <input type="range" min="-180" max="180" value={axis} onChange={event => setAxis(Number(event.target.value))} /><output>{axis}°</output></label>
                <label>Velocidade <select value={speed} onChange={event => { setSpeed(Number(event.target.value)); setCursor(0); }}>
                  <option value={25}>25 mm/s</option><option value={50}>50 mm/s</option>
                </select></label>
                <label>Ganho <select value={gain} onChange={event => setGain(Number(event.target.value))}>
                  <option value={5}>5 mm/mV</option><option value={10}>10 mm/mV</option><option value={20}>20 mm/mV</option>
                </select></label>
                <button className="training-secondary" onClick={() => openPlacement()}>Posicionar eletrodos</button>
              </div>
            </details>
          </section>
        </div>
        <div className={`ecg-workbench ${expanded ? 'expanded-' + expanded : ''}`}>
          <div className="ecg-model ecg-surface">
            <div className="ecg-model-toolbar">
              <div className="ecg-model-filters" aria-label="Visualização do coração">
                <button aria-pressed={showConduction} onClick={() => setShowConduction(true)}>Coração 3D</button>
                <button aria-pressed={!showConduction} onClick={() => {
                  setShowConduction(false);
                  if (leadView === 'none') setLeadView('group');
                }}>Vetores</button>
              </div>
              <button className="ecg-icon-control" aria-label={expanded === 'heart' ? 'Reduzir coração 3D' : 'Ampliar coração 3D'}
                onClick={() => setExpanded(value => value === 'heart' ? null : 'heart')}>{expanded === 'heart' ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button>
            </div>
            <Suspense fallback={<p className="ecg-loading">Preparando coração 3D…</p>}>
              <EcgHeart vector={vector} lead={lead} visibleLeads={visibleLeads} phase={phase.region}
                stage={phase.stage} showConduction={showPath} onSelectLead={setLead} />
            </Suspense>
            <div className="ecg-model-bottom">
              <label><span className="sr-only">Mostrar derivações</span><select aria-label="Mostrar derivações" value={leadView}
                onChange={event => {
                  const value = event.target.value as typeof leadView;
                  setLeadView(value);
                  if (value === 'group' && !groups[group].some(id => id === lead)) setLead(groups[group][0]);
                }}>
                <option value="group">Mostrar derivações</option>
                <option value="single">Somente a selecionada</option>
                <option value="all">Todas (17)</option>
                <option value="none">Sem eixos</option>
              </select></label>
              {showPath && <small><i /> Ativação sincronizada</small>}
            </div>
          </div>
          <section className="ecg-strip ecg-surface" aria-label="Traçado principal">
            <header><strong>Derivação {lead}</strong><span>{speed} mm/s · {gain} mm/mV</span></header>
            <div className="ecg-paper"><EcgTrace values={signals[lead]!} lead={lead} speed={speed} gain={gain} duration={duration} cursor={time} onSeek={seek} large /></div>
            <div className="ecg-playback">
              <button className="ecg-icon-control" aria-label={playing ? 'Pausar traçado' : 'Reproduzir traçado'} onClick={() => setPlaying(value => !value)}>
                {playing ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <output>{time.toFixed(2)} / {duration} s</output>
              <input aria-label="Instante do traçado" type="range" min="0" max={duration} step=".004" value={time} onChange={event => seek(Number(event.target.value))} />
              <select aria-label="Velocidade de reprodução" value={playbackSpeed} onChange={event => setPlaybackSpeed(Number(event.target.value))}>
                <option value={.25}>¼×</option><option value={.5}>½×</option><option value={1}>1×</option><option value={2}>2×</option>
              </select>
              <button className="ecg-icon-control" aria-label="Voltar ao início do traçado" onClick={() => seek(0)}><RotateCcw size={16} /></button>
              <button className="ecg-icon-control" aria-label={expanded === 'trace' ? 'Reduzir traçado' : 'Ampliar traçado'}
                onClick={() => setExpanded(value => value === 'trace' ? null : 'trace')}>{expanded === 'trace' ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button>
            </div>
          </section>
          <aside className="ecg-explainer ecg-surface" aria-labelledby="ecg-explainer-title">
            <header><BookOpen size={21} /><h3 id="ecg-explainer-title">Entenda o que está vendo</h3></header>
            <div className="ecg-explainer-body">
              <h4>Derivação {lead}</h4>
              <p>{ecgLeads[lead].placement}</p>
              <p>{ecgPatterns[pattern].description}</p>
              <div className="ecg-current-phase">
                <strong>{phase.name} · {phase.detail}</strong>
                {showPath && phase.stage && <span>{conductionSteps[phase.stage.index].label}</span>}
                <span>{voltage.toFixed(2)} mV em {lead}</span>
              </div>
              <div className="ecg-related-actions">
                <button onClick={onAnatomy}><Heart size={17} /> Anatomia relacionada <ChevronRight size={16} /></button>
                <button onClick={() => openPlacement(true)}><Focus size={17} /> Posicionar eletrodos <ChevronRight size={16} /></button>
                <button onClick={() => openTab('case')}><ClipboardList size={17} /> Caso clínico <ChevronRight size={16} /></button>
                <a href="https://pubmed.ncbi.nlm.nih.gov/?term=10.1161%2FCIRCULATIONAHA.106.180200" target="_blank" rel="noreferrer"><BookOpen size={17} /> Evidências (PubMed) <ArrowUpRight size={16} /></a>
                <button className="ecg-quiz-action" onClick={() => { setAnswer(null); openTab('quiz'); }}><Target size={17} /> Testar conhecimento <ChevronRight size={16} /></button>
              </div>
            </div>
          </aside>
        </div>
        <section className="ecg-surface ecg-lead-board" aria-label="Painel de derivações">
          <div className="training-tabs ecg-groups" aria-label="Grupos de derivações">
            {(Object.keys(groups) as (keyof typeof groups)[]).map(item => <button key={item} aria-pressed={group === item} onClick={() => chooseGroup(item)}>{item}</button>)}
          </div>
          <div className="ecg-lead-grid" style={{ '--lead-count': groups[group].length } as React.CSSProperties} aria-label="Selecionar derivação">
            {groups[group].map(item => <button key={item} aria-pressed={lead === item} onClick={() => setLead(item)}>
              <strong>{item}</strong><EcgTrace values={signals[item]!} lead={item} speed={speed} gain={gain} duration={duration} />
            </button>)}
          </div>
        </section>
        {showPath && <EcgConduction stage={phase.stage} available={conductionSteps.map((_, i) => Boolean(stageTimes[i]?.length))} onSeek={seekStage} />}
        {showConduction && pattern === 'vt' && <p className="training-note">Na taquicardia ventricular, a ativação parte dos ventrículos. O modelo destaca a atividade ventricular durante o QRS e a onda T.</p>}
        {showPath && (pattern === 'af' || pattern === 'flutter') && <p className="training-note">Neste padrão, o coração 3D mostra o percurso da condução que leva aos batimentos ventriculares.</p>}
      </>}
      {tab === 'case' && <article className="training-card ecg-study-card">
        <h3>Palpitações e pulso irregular</h3>
        <p>No cenário simulado, a pessoa refere palpitações e o traçado mostra intervalos RR irregulares, sem ondas P distintas.</p>
        <details><summary>Ver interpretação</summary><p>O exemplo ilustra fibrilação atrial. No simulador, compare os intervalos RR e procure uma onda P antes de cada QRS em DII.</p></details>
        <button className="training-primary" onClick={() => { choosePattern('af'); setGroup('12 derivações'); setLead('II'); openTab('sim'); }}>Abrir traçado do caso <ArrowRight size={16} /></button>
      </article>}
      {tab === 'quiz' && <section className="training-card ecg-study-card">
        <h3>Da condução ao traçado</h3>
        <p>Qual parte do ECG representa a despolarização dos ventrículos?</p>
        <div className="training-tabs" aria-label="Alternativas">
          {['Onda P', 'Complexo QRS', 'Onda T'].map((item, index) => <button key={item} aria-pressed={answer === index} onClick={() => setAnswer(index)}>{item}</button>)}
        </div>
        {answer !== null && <p role="status" className="training-feedback">{answer === 1 ? 'Correto. ' : ''}O QRS registra a despolarização ventricular. A onda P registra a despolarização atrial e a onda T, a repolarização ventricular.</p>}
        <button className="training-secondary" onClick={() => openTab('sim')}>Voltar ao ECG</button>
      </section>}
      {tab !== 'sim' && <div className="training-tabs ecg-study-links" aria-label="Ferramentas do ECG">
        <button onClick={() => openTab('sim')}>Simulador 3D</button>
        <button aria-pressed={tab === 'placement'} onClick={() => openPlacement()}>Posicionar eletrodos</button>
        <button aria-pressed={tab === 'axis'} onClick={() => openTab('axis')}>Eixo cardíaco</button>
        <button aria-pressed={tab === 'reading'} onClick={() => openTab('reading')}>Guia de leitura</button>
      </div>}
      {tab === 'placement' && <EcgPlacement key={placementLead ?? 'default'} initialLead={placementLead} />}
      {tab === 'axis' && <div className="ecg-axis training-card">
        <h3>Explore o eixo frontal</h3>
        <p>Arraste o vetor no diagrama ou ajuste o ângulo. Compare as seis derivações enquanto o eixo muda.</p>
        <div className="ecg-axis-lab">
          <svg viewBox="-103 -103 206 206" role="img" aria-label={`Diagrama hexaxial, vetor a ${axis} graus`}
            onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); dragAxis(event); }}
            onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) dragAxis(event); }}>
            <circle cx="0" cy="0" r="69" fill="#edf7f8" stroke="#adcbd2" />
            {frontalLeads.map(item => {
              const [x, y] = ecgLeads[item].axis;
              return <g key={item}><line x1={-x * 69} y1={-y * 69} x2={x * 69} y2={y * 69} stroke="#97b8c1" /><text x={x * 83} y={y * 83 + 4} textAnchor="middle">{item}</text></g>;
            })}
            <line x1="0" y1="0" x2={visibleAxis[0]} y2={visibleAxis[1]} stroke="#00828c" strokeWidth="4" />
            <circle cx={visibleAxis[0]} cy={visibleAxis[1]} r="6" fill="#00828c" />
          </svg>
          <div className="ecg-axis-traces">{frontalLeads.map(item => <figure key={item}>
            <figcaption><strong>{item}</strong> <span>Projeção {projectLead(frontalVector, item).toFixed(2)}</span></figcaption>
            <EcgTrace values={signals[item]!} lead={item} speed={speed} gain={gain} duration={duration} />
          </figure>)}</div>
        </div>
        <label className="ecg-axis-range">Ângulo do vetor <input type="range" min="-180" max="180" value={axis} onChange={event => setAxis(Number(event.target.value))} /><output>{axis}° · {axisClass(axis)}</output></label>
        <div>
          <h3>Estime o eixo do QRS</h3>
          <p>Some as deflexões positivas e negativas do QRS em cada derivação. Informe as duas medidas na mesma unidade.</p>
          <div className="ecg-axis-inputs">
            <label>QRS líquido em I <input type="number" step=".1" value={axisI} onChange={event => setAxisI(event.target.value)} /></label>
            <label>QRS líquido em aVF <input type="number" step=".1" value={axisAvf} onChange={event => setAxisAvf(event.target.value)} /></label>
          </div>
          <p role="status"><strong>{angle === null ? 'Informe duas medidas com pelo menos uma deflexão diferente de zero.' : `${angle}° · ${axisClass(angle)}`}</strong></p>
          {angle !== null && <button className="training-primary" onClick={() => setAxis(angle)}>Aplicar ao vetor</button>}
        </div>
      </div>}
      {tab === 'reading' && <div className="training-card ecg-reading">
        <h3>Fisiologia e roteiro de leitura</h3><p>Acompanhe no simulador a onda P, a condução atrioventricular, o QRS e a onda T.</p>
        {reading.map(([title, detail]) => <details key={title}><summary>{title}</summary><p>{detail}</p></details>)}
      </div>}
      <footer className="training-note">Traçados sintéticos e projeções simplificadas para estudo. Coração do Atlas do Mapa Clínico. <a href="https://doi.org/10.1161/CIRCULATIONAHA.106.180200" target="_blank" rel="noreferrer">Padronização do ECG</a> · <a href="https://doi.org/10.1161/CIR.0000000000001193" target="_blank" rel="noreferrer">Fibrilação atrial</a> · <a href="https://www.escardio.org/guidelines/clinical-practice-guidelines/all-esc-practice-guidelines/acute-coronary-syndromes/" target="_blank" rel="noreferrer">Derivações adicionais</a></footer>
    </section>
  );
}
