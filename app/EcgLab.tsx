import { lazy, memo, Suspense, useEffect, useId, useMemo, useState } from 'react';
import { Activity, Pause, Play, RotateCcw } from 'lucide-react';
import { activationTimes, axisClass, calculateAxis, chestLeads, ecgActivation, ecgBeats, ecgLeads, ecgPatterns, electricalVector, frontalLeads, patternIds, posteriorLeads, projectLead, rightLeads, type LeadId, type PatternId } from './ecg-model';
import EcgConduction from './EcgConduction';
import { conductionSteps } from './ecg-conduction';
import EcgPlacement from './EcgPlacement';

const EcgHeart = lazy(() => import('./EcgHeart'));
const groups = {
  '12 derivações': ['I', 'aVR', 'V1', 'V4', 'II', 'aVL', 'V2', 'V5', 'III', 'aVF', 'V3', 'V6'] as LeadId[],
  Frontais: frontalLeads,
  Precordiais: chestLeads,
  Direitas: rightLeads,
  Posteriores: posteriorLeads,
};
const allLeads = [...frontalLeads, ...chestLeads, ...rightLeads, ...posteriorLeads];

const EcgTrace = memo(function EcgTrace({ values, lead, speed, gain, cursor, duration, onSeek }: {
  values: number[]; lead: LeadId; speed: number; gain: number; cursor?: number; duration: number; onSeek?: (time: number) => void;
}) {
  const id = useId();
  const scale = 4;
  const width = duration * speed * scale;
  const height = 200;
  const middle = height / 2;
  const pointY = (value: number) => middle - value * gain * scale;
  const path = useMemo(() => values.map((value, index) => {
    const x = width * index / (values.length - 1);
    return `${index ? 'L' : 'M'}${x.toFixed(1)} ${(middle - value * gain * scale).toFixed(1)}`;
  }).join(' '), [values, width, middle, gain]);
  const cursorX = cursor === undefined ? null : cursor / duration * width;
  const cursorValue = cursor === undefined ? null : values[Math.min(values.length - 1, Math.round(cursor / duration * (values.length - 1)))];
  return (
    <svg className={onSeek ? 'ecg-trace seek' : 'ecg-trace'} viewBox={`0 0 ${width} ${height}`} role="img"
      aria-label={`Traçado simulado da derivação ${lead}, ${duration} segundos`}
      onClick={onSeek ? event => {
        const bounds = event.currentTarget.getBoundingClientRect();
        onSeek(Math.max(0, Math.min(duration, (event.clientX - bounds.left) / bounds.width * duration)));
      } : undefined}>
      <defs>
        <pattern id={`${id}-minor`} width={scale} height={scale} patternUnits="userSpaceOnUse">
          <path d={`M ${scale} 0 H 0 V ${scale}`} fill="none" stroke="#f0d9d7" strokeWidth=".55" />
        </pattern>
        <pattern id={`${id}-major`} width={scale * 5} height={scale * 5} patternUnits="userSpaceOnUse">
          <rect width={scale * 5} height={scale * 5} fill={`url(#${id}-minor)`} />
          <path d={`M ${scale * 5} 0 H 0 V ${scale * 5}`} fill="none" stroke="#ddaaa8" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={width} height={height} fill="#fff9f7" />
      <rect width={width} height={height} fill={`url(#${id}-major)`} />
      <path d={path} fill="none" stroke="#132e3a" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
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

export default function EcgLab() {
  const [pattern, setPattern] = useState<PatternId>('sinus');
  const [bpm, setBpm] = useState<number>(ecgPatterns.sinus.bpm);
  const [axis, setAxis] = useState<number>(ecgPatterns.sinus.axis);
  const [group, setGroup] = useState<keyof typeof groups>('12 derivações');
  const [lead, setLead] = useState<LeadId>('II');
  const [speed, setSpeed] = useState(25);
  const [gain, setGain] = useState(10);
  const [cursor, setCursor] = useState(.8);
  const [playing, setPlaying] = useState(false);
  const [slow, setSlow] = useState(false);
  const [tab, setTab] = useState<'sim' | 'axis' | 'reading' | 'placement'>('sim');
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
        const delta = Math.min(.05, (timestamp - previous) / 1000) * (slow ? .25 : 1);
        setCursor(value => (value + delta) % duration);
      }
      previous = timestamp;
      frame = requestAnimationFrame(move);
    };
    frame = requestAnimationFrame(move);
    return () => cancelAnimationFrame(frame);
  }, [playing, slow, duration, tab]);

  function choosePattern(next: PatternId) {
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
      <header className="training-header">
        <span className="training-icon"><Activity size={23} /></span>
        <div><h2 id="ecg-title">Laboratório de ECG</h2><p>Veja como o vetor elétrico muda o traçado de cada derivação.</p></div>
      </header>
      <nav className="training-tabs" aria-label="Áreas do laboratório de ECG">
        <button aria-pressed={tab === 'sim'} onClick={() => setTab('sim')}>Simulador 3D</button>
        <button aria-pressed={tab === 'placement'} onClick={() => { setPlacementLead(undefined); setTab('placement'); }}>Posicionar eletrodos</button>
        <button aria-pressed={tab === 'axis'} onClick={() => setTab('axis')}>Eixo cardíaco</button>
        <button aria-pressed={tab === 'reading'} onClick={() => setTab('reading')}>Guia de leitura</button>
      </nav>
      {tab === 'sim' && <>
        <div className="ecg-settings">
          <label>Padrão <select value={pattern} onChange={event => choosePattern(event.target.value as PatternId)}>
            {patternIds.map(id => <option key={id} value={id}>{ecgPatterns[id].name}</option>)}
          </select></label>
          <label>Frequência <input type="range" min="35" max="180" step="1" value={bpm} disabled={pattern === 'flutter'} onChange={event => setBpm(Number(event.target.value))} />
            <output>{bpm} bpm {pattern === 'af' && '(alvo)'}</output></label>
          <label>Eixo QRS <input type="range" min="-180" max="180" step="1" value={axis} onChange={event => setAxis(Number(event.target.value))} /><output>{axis}°</output></label>
          <label>Velocidade <select value={speed} onChange={event => { setSpeed(Number(event.target.value)); setCursor(0); }}>
            <option value={25}>25 mm/s</option><option value={50}>50 mm/s</option>
          </select></label>
          <label>Ganho <select value={gain} onChange={event => setGain(Number(event.target.value))}>
            <option value={5}>5 mm/mV</option><option value={10}>10 mm/mV</option><option value={20}>20 mm/mV</option>
          </select></label>
        </div>
        <p className="training-note">{ecgPatterns[pattern].description} Frequência e eixo podem ser ajustados para explorar a morfologia.</p>
        <div className="training-tabs ecg-groups" aria-label="Grupos de derivações">
          {(Object.keys(groups) as (keyof typeof groups)[]).map(item => <button key={item} aria-pressed={group === item} onClick={() => chooseGroup(item)}>{item}</button>)}
        </div>
        <div className="ecg-pair">
          <div className="ecg-model">
            <header><strong>Coração 3D</strong><span>{visibleLeads.length <= 1 ? `Derivação ${lead}` : `${visibleLeads.length} derivações no modelo`}</span></header>
            <div className="ecg-model-filters" aria-label="Derivações no coração 3D">
              <button aria-pressed={leadView === 'single'} onClick={() => setLeadView('single')}>Selecionada</button>
              <button aria-pressed={leadView === 'group'} onClick={() => {
                setLeadView('group');
                if (!groups[group].some(id => id === lead)) setLead(groups[group][0]);
              }}>Grupo atual</button>
              <button aria-pressed={leadView === 'all'} onClick={() => setLeadView('all')}>Todas (17)</button>
              <button aria-pressed={leadView === 'none'} onClick={() => setLeadView('none')}>Sem eixos</button>
            </div>
            <div className="ecg-model-filters">
              <button aria-pressed={showConduction} onClick={() => setShowConduction(value => !value)}>Condução elétrica</button>
            </div>
            <Suspense fallback={<p>Preparando coração 3D…</p>}>
              <EcgHeart vector={vector} lead={lead} visibleLeads={visibleLeads} phase={phase.region}
                stage={phase.stage} showConduction={showPath} onSelectLead={setLead} />
            </Suspense>
            {visibleLeads.length > 0 && <div className="ecg-legend ecg-lead-legend">
              <span><i /> Vetor elétrico</span><span><i /> Derivação selecionada</span>
              <span><i /> Frontais</span><span><i /> V1–V6</span><span><i /> Direitas</span><span><i /> Posteriores</span>
            </div>}
            {showPath && <div className="ecg-legend ecg-path-legend"><span><i /> Frente de ativação</span><span><i /> Percurso ativado</span></div>}
          </div>
          <div className="ecg-strip">
            <header><strong>Derivação {lead}</strong><span>{speed} mm/s · {gain} mm/mV</span></header>
            <EcgTrace values={signals[lead]!} lead={lead} speed={speed} gain={gain} duration={duration} cursor={time} onSeek={seek} />
            <div className="ecg-playback">
              <button className="training-primary" aria-label={playing ? 'Pausar traçado' : 'Reproduzir traçado'} onClick={() => setPlaying(value => !value)}>{playing ? <Pause size={17} /> : <Play size={17} />}{playing ? 'Pausar' : 'Reproduzir'}</button>
              <button aria-label="Voltar ao início do traçado" onClick={() => seek(0)}><RotateCcw size={17} /></button>
              <label><input type="checkbox" checked={slow} onChange={event => setSlow(event.target.checked)} /> ¼×</label>
              <input aria-label="Instante do traçado" type="range" min="0" max={duration} step=".004" value={time} onChange={event => seek(Number(event.target.value))} />
              <output>{time.toFixed(2)} s</output>
            </div>
            <p className="ecg-phase"><strong>{phase.name} · {phase.detail}</strong>
              {showPath && phase.stage && <span>{conductionSteps[phase.stage.index].label}</span>}
              <span>{lead}: {voltage > .025 ? 'deflexão positiva' : voltage < -.025 ? 'deflexão negativa' : 'próximo à linha de base'} ({voltage.toFixed(2)} mV)</span>
            </p>
            <p className="ecg-placement">{ecgLeads[lead].placement}</p>
            <button className="training-secondary ecg-placement-link" onClick={() => {
              setPlacementLead(lead);
              setTab('placement');
              requestAnimationFrame(() => document.getElementById('ecg-placement-guide')?.scrollIntoView({ block: 'start' }));
            }}>Ver {ecgLeads[lead].plane === 'horizontal' ? lead + ' no paciente' : 'eletrodos no paciente'}</button>
          </div>
        </div>
        {showPath && <EcgConduction stage={phase.stage} available={conductionSteps.map((_, i) => Boolean(stageTimes[i]?.length))} onSeek={seekStage} />}
        {showConduction && pattern === 'vt' && <p className="training-note">Na taquicardia ventricular, a ativação parte dos ventrículos. O modelo destaca a atividade ventricular durante o QRS e a onda T.</p>}
        {showPath && (pattern === 'af' || pattern === 'flutter') && <p className="training-note">Neste padrão, o coração 3D mostra o percurso da condução que leva aos batimentos ventriculares.</p>}
        <div className="ecg-lead-grid" aria-label="Selecionar derivação">
          {groups[group].map(item => <button key={item} aria-pressed={lead === item} onClick={() => setLead(item)}>
            <strong>{item}</strong><EcgTrace values={signals[item]!} lead={item} speed={speed} gain={gain} duration={duration} />
          </button>)}
        </div>
      </>}
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
        <h3>Roteiro de leitura</h3>
        {reading.map(([title, detail]) => <details key={title}><summary>{title}</summary><p>{detail}</p></details>)}
      </div>}
      <footer className="training-note">Traçados sintéticos e projeções simplificadas para estudo. Coração do Atlas do Mapa Clínico. <a href="https://doi.org/10.1161/CIRCULATIONAHA.106.180200" target="_blank" rel="noreferrer">Padronização do ECG</a> · <a href="https://doi.org/10.1161/CIR.0000000000001193" target="_blank" rel="noreferrer">Fibrilação atrial</a> · <a href="https://www.escardio.org/guidelines/clinical-practice-guidelines/all-esc-practice-guidelines/acute-coronary-syndromes/" target="_blank" rel="noreferrer">Derivações adicionais</a></footer>
    </section>
  );
}
