import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import {
  Activity,
  ArrowRight,
  Atom,
  Brain,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Crosshair,
  Eye,
  Heart,
  Layers,
  Maximize,
  Pause,
  Play,
  RotateCcw,
  ScanLine,
  Search,
} from 'lucide-react';
import Lab3dScene, { type LabPart } from './Lab3dScene';
import {
  axisLabels,
  coronaryStages,
  labLayers,
  neuronLayers,
  type LabAxis,
  type LabCamera,
  type LabScale,
  type LabView,
} from './lab3d-data';
import { moleculeCid, moleculeOptions, type Molecule } from './lab3d-geometry';
import { ecgBeats, electricalVector, projectLead } from './ecg-model';
import './lab3d.css';

const scales = [
  ['heart', 'Coração', Heart],
  ['brain', 'Encéfalo', Brain],
  ['neuron', 'Neurônio', Activity],
  ['molecule', 'Molécula', Atom],
] as const;
const viewLabels = {
  natural: 'Anatômico',
  colored: 'Por camadas',
  ghost: 'Translúcido',
};
const cameraViews = {
  oblique: 'Oblíqua',
  frontal: 'Frontal',
  lateral: 'Lateral',
  superior: 'Superior',
};
const formatSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
type Destination = {
  onImaging: () => void;
  onEcg: () => void;
  onStroke: () => void;
  onAtlas: (scope: 'heart' | 'brain') => void;
};

function HeartTrace({ bpm, time }: { bpm: number; time: RefObject<number> }) {
  const head = useRef<SVGLineElement>(null);
  const length = (60 / bpm) * Math.max(3, Math.round(bpm / 15));
  const values = useMemo(() => {
    const cycle = 60 / bpm;
    const beats = ecgBeats('sinus', bpm, length + cycle);
    const points = Array.from({ length: 481 }, (_, i) =>
      projectLead(
        electricalVector((i * length) / 480, beats, 'sinus', 55),
        'II',
      ),
    );
    return points
      .map(
        (y, i) =>
          (i ? 'L' : 'M') +
          ((i / 480) * 290).toFixed(1) +
          ',' +
          (26 - y * 19).toFixed(1),
      )
      .join(' ');
  }, [bpm, length]);
  useEffect(() => {
    let frame = 0;
    const draw = () => {
      const x = ((time.current % length) / length) * 290;
      head.current?.setAttribute('transform', 'translate(' + x + ' 0)');
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [time, length]);
  return (
    <div className="lab3d-trace">
      <span>
        <Activity size={14} /> ECG sintético · DII
      </span>
      <svg
        viewBox="0 0 290 47"
        role="img"
        aria-label="ECG de ritmo sinusal sincronizado com o batimento do modelo"
      >
        <path
          d="M0 14 H290 M0 26 H290 M0 38 H290"
          stroke="#24495f"
          fill="none"
        />
        <path d={values} stroke="#5af0ad" strokeWidth="1.5" fill="none" />
        <line ref={head} x1="0" x2="0" y1="5" y2="43" stroke="#88e9ff" />
      </svg>
    </div>
  );
}
const descriptions = {
  heart: [
    'Coração em movimento',
    'Disseque o coração, observe o fluxo e acompanhe uma intervenção coronária simulada.',
  ],
  brain: [
    'Encéfalo por camadas',
    'Separe os lobos e revele os ventrículos, os núcleos profundos, o tronco e o cerebelo.',
  ],
  neuron: [
    'Do encéfalo ao neurônio',
    'Veja um modelo esquemático de neurônio multipolar e acompanhe o impulso ao longo do axônio.',
  ],
  molecule: [
    'Escala molecular',
    'Explore conformações 3D de neurotransmissores do PubChem e identifique átomos e ligações.',
  ],
} as const;

export default function Lab3D({
  initialScope = 'heart',
  onImaging,
  onEcg,
  onStroke,
  onAtlas,
}: Destination & { initialScope?: LabScale }) {
  const [scope, setScope] = useState<LabScale>(initialScope);
  const [molecule, setMolecule] = useState<Molecule>('dopamina');
  const [view, setView] = useState<LabView>(
    initialScope === 'heart' ? 'ghost' : 'natural',
  );
  const [layers, setLayers] = useState(() =>
    labLayers[initialScope].map((x) => x.id),
  );
  const [spread, setSpread] = useState(0);
  const [cut, setCut] = useState(0);
  const [axis, setAxis] = useState<LabAxis>('coronal');
  const [camera, setCamera] = useState<LabCamera>('oblique');
  const [cameraReset, setCameraReset] = useState(0);
  const [close, setClose] = useState(false);
  const [pointCloud, setPointCloud] = useState(false);
  const [hydrogen, setHydrogen] = useState(true);
  const [flow, setFlow] = useState(true);
  const [bpm, setBpm] = useState(72);
  const [playing, setPlaying] = useState(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [selected, setSelected] = useState('');
  const [focus, setFocus] = useState(0);
  const [parts, setParts] = useState<LabPart[]>([]);
  const [query, setQuery] = useState('');
  const time = useRef(0);
  const subset = useMemo(
    () =>
      parts.filter(
        (p) =>
          formatSearch(p.name + ' ' + p.id).includes(formatSearch(query)) &&
          (scope === 'molecule'
            ? hydrogen || p.layer !== 'H'
            : layers.includes(p.layer)),
      ),
    [parts, query, scope, hydrogen, layers],
  );
  const selectedPart = parts.find((p) => p.id === selected);
  const macro = scope === 'heart' || scope === 'brain';
  const moving = scope === 'heart' || scope === 'neuron';

  function resetModel(next = scope) {
    setView(next === 'heart' ? 'ghost' : 'natural');
    setLayers(labLayers[next].map((x) => x.id));
    setSpread(0);
    setCut(0);
    setAxis('coronal');
    setCamera('oblique');
    setCameraReset((x) => x + 1);
    setClose(false);
    setPointCloud(false);
    setStage(0);
    setProgress(0);
    setHydrogen(true);
    setFlow(true);
    setSelected('');
    setFocus(0);
    setQuery('');
  }
  function switchScope(next: LabScale) {
    if (next === scope) return;
    resetModel(next);
    setScope(next);
  }
  function setCoronaryStep(step: number) {
    setStage(step);
    setProgress(0);
    setSpread(0);
    setCut(0);
    setClose(step > 0);
    setView('ghost');
    setSelected('');
    setFocus(0);
    setLayers(labLayers.heart.map((x) => x.id));
    setCameraReset((x) => x + 1);
  }
  function showDeep() {
    setQuery('');
    setView('ghost');
    setPointCloud(false);
    setLayers(['deep', 'ventricles', 'cerebellum', 'brainstem']);
    setSelected('thalamus-left');
    setFocus((n) => n + 1);
    setCut(0);
    setSpread(0);
  }
  function toggleLayer(id: string) {
    if (selectedPart?.layer === id) setSelected('');
    setFocus(0);
    setLayers((before) =>
      before.includes(id) ? before.filter((x) => x !== id) : [...before, id],
    );
  }

  const simulation = (
    <section className="lab3d-activity" aria-label="Simulação coronária">
      <div className="lab3d-activity-title">
        <CircleDot size={21} />
        <div>
          <small>SIMULAÇÃO ANATÔMICA</small>
          <h2>Da placa ao stent</h2>
        </div>
      </div>
      <div className="lab3d-steps" aria-label="Etapas da simulação coronária">
        {coronaryStages.map((item, i) => (
          <button
            key={item.title}
            aria-pressed={i === stage}
            onClick={() => setCoronaryStep(i)}
          >
            <span>{i + 1}</span>
            {item.title}
          </button>
        ))}
      </div>
      <div className="lab3d-step-body">
        <div>
          <strong>{coronaryStages[stage].title}</strong>
          <p>{coronaryStages[stage].text}</p>
        </div>
        {(stage === 2 || stage === 3) && (
          <label>
            {stage === 2 ? 'Avanço do fio-guia' : 'Expansão do balão'}{' '}
            <strong>{Math.round(progress * 100)}%</strong>
            <input
              type="range"
              min="0"
              max="1"
              step=".01"
              value={progress}
              onChange={(e) => setProgress(e.target.valueAsNumber)}
            />
          </label>
        )}
        <div className="lab3d-step-actions">
          {stage > 0 && (
            <button
              onClick={() => {
                setClose((x) => !x);
                setCameraReset((x) => x + 1);
              }}
            >
              <Crosshair size={15} />
              {close ? 'Vista geral' : 'Ver lesão'}
            </button>
          )}
          <button
            aria-label="Etapa anterior"
            disabled={stage === 0}
            onClick={() => setCoronaryStep(stage - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            aria-label="Próxima etapa"
            disabled={stage === 4}
            onClick={() => setCoronaryStep(stage + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <p className="lab3d-caption">
        A placa, o fluxo e os dispositivos são ilustrativos. A cena não mede
        estenose nem orienta procedimentos.
      </p>
    </section>
  );

  return (
    <section className="training-screen lab3d" aria-labelledby="lab3d-title">
      <header className="lab3d-header">
        <span className="lab3d-mark">
          <Layers size={29} />
        </span>
        <div>
          <small>LABORATÓRIOS / ANATOMIA IMERSIVA</small>
          <h1 id="lab3d-title">Laboratório 3D</h1>
          <p>Do órgão à molécula: explore, disseque e acompanhe a função.</p>
        </div>
        <button className="lab3d-imaging-link" onClick={onImaging}>
          <ScanLine size={16} /> Abrir TC / RM <ArrowRight size={14} />
        </button>
      </header>
      <nav aria-label="Escalas anatômicas" className="lab3d-scales">
        {scales.map(([id, label, Icon], i) => (
          <button
            key={id}
            aria-pressed={scope === id}
            onClick={() => switchScope(id)}
          >
            <small>0{i + 1}</small>
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>
      <div className="lab3d-bench">
        <section className="lab3d-model" aria-label={descriptions[scope][0]}>
          <div className="lab3d-model-head">
            <div>
              <small>
                {macro
                  ? 'ANATOMIA DE REFERÊNCIA'
                  : scope === 'neuron'
                    ? 'MODELO DIDÁTICO'
                    : 'CONFORMAÇÃO 3D · PUBCHEM'}
              </small>
              <h2>{descriptions[scope][0]}</h2>
            </div>
            <button
              aria-label="Restaurar modelo"
              title="Restaurar modelo"
              onClick={() => resetModel()}
            >
              <RotateCcw size={17} />
            </button>
          </div>
          <div className="lab3d-stage">
            <Lab3dScene
              scope={scope}
              molecule={molecule}
              view={view}
              layers={layers}
              spread={spread}
              cut={cut}
              axis={axis}
              selected={selected}
              focus={focus}
              camera={camera}
              cameraReset={cameraReset}
              lookAtLesion={close}
              pointCloud={pointCloud}
              showHydrogen={hydrogen}
              showFlow={flow}
              stage={stage}
              progress={progress}
              playing={playing}
              bpm={bpm}
              time={time}
              onSelect={(id) => {
                setFocus(0);
                setSelected(id);
              }}
              onParts={setParts}
            />
            {macro && (
              <div
                className="lab3d-render-modes"
                aria-label="Acabamento do modelo"
              >
                {(Object.keys(viewLabels) as LabView[]).map((id) => (
                  <button
                    key={id}
                    aria-pressed={view === id && !pointCloud}
                    onClick={() => {
                      setView(id);
                      setPointCloud(false);
                    }}
                  >
                    {viewLabels[id]}
                  </button>
                ))}
                {scope === 'brain' && (
                  <button
                    aria-pressed={pointCloud}
                    onClick={() => setPointCloud((x) => !x)}
                  >
                    Pontos
                  </button>
                )}
              </div>
            )}
            {scope === 'heart' && <HeartTrace bpm={bpm} time={time} />}
            <div className="lab3d-orbit-help">
              Arraste para girar · Role para aproximar
            </div>
          </div>
          <div className="lab3d-camera" aria-label="Vistas do modelo">
            {(Object.keys(cameraViews) as LabCamera[]).map((id) => (
              <button
                key={id}
                aria-pressed={camera === id && !close}
                onClick={() => {
                  setCamera(id);
                  setCameraReset((n) => n + 1);
                  setClose(false);
                }}
              >
                {cameraViews[id]}
              </button>
            ))}
          </div>
        </section>
        <aside
          className="lab3d-inspector"
          aria-label="Controles do laboratório"
        >
          <p>{descriptions[scope][1]}</p>
          {moving && (
            <div className="lab3d-movement">
              <button
                aria-label={playing ? 'Pausar animação' : 'Reproduzir animação'}
                onClick={() => setPlaying((x) => !x)}
              >
                {playing ? <Pause size={17} /> : <Play size={17} />}
              </button>
              {scope === 'heart' ? (
                <label>
                  Frequência <strong>{bpm} bpm</strong>
                  <input
                    type="range"
                    aria-label="Frequência do coração"
                    min="45"
                    max="150"
                    value={bpm}
                    onChange={(e) => setBpm(e.target.valueAsNumber)}
                  />
                </label>
              ) : (
                <span>
                  {playing
                    ? 'Impulso axonal em movimento'
                    : 'Impulso axonal pausado'}
                </span>
              )}
            </div>
          )}
          {scope === 'heart' && simulation}
          {scope === 'heart' && (
            <label className="lab3d-check">
              <input
                type="checkbox"
                checked={flow}
                onChange={(e) => setFlow(e.target.checked)}
              />{' '}
              Mostrar partículas de fluxo
            </label>
          )}
          {macro && (
            <div className="lab3d-cut">
              <label>
                Separar estruturas <strong>{Math.round(spread * 100)}%</strong>
                <input
                  type="range"
                  aria-label="Separar estruturas"
                  min="0"
                  max="1"
                  step=".01"
                  value={spread}
                  onChange={(e) => {
                    setClose(false);
                    setSpread(e.target.valueAsNumber);
                  }}
                />
              </label>
              <label>
                Plano de corte{' '}
                <select
                  value={axis}
                  onChange={(e) => setAxis(e.target.value as LabAxis)}
                >
                  {(Object.keys(axisLabels) as LabAxis[]).map((id) => (
                    <option key={id} value={id}>
                      {axisLabels[id]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Posição do corte <strong>{Math.round(cut * 100)}%</strong>
                <input
                  type="range"
                  aria-label="Posição do corte"
                  min="0"
                  max="1"
                  step=".01"
                  value={cut}
                  onChange={(e) => setCut(e.target.valueAsNumber)}
                />
              </label>
            </div>
          )}
          {scope === 'molecule' && (
            <>
              <label className="lab3d-molecule-picker">
                Neurotransmissor
                <select
                  value={molecule}
                  onChange={(e) => {
                    setSelected('');
                    setFocus(0);
                    setMolecule(e.target.value as Molecule);
                  }}
                >
                  {(Object.keys(moleculeOptions) as Molecule[]).map((id) => (
                    <option value={id} key={id}>
                      {moleculeOptions[id]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="lab3d-check">
                <input
                  type="checkbox"
                  checked={hydrogen}
                  onChange={(e) => {
                    setHydrogen(e.target.checked);
                    setSelected('');
                  }}
                />{' '}
                Mostrar hidrogênios
              </label>
              <p className="lab3d-atom-key">
                <span>C · Carbono</span>
                <span>H · Hidrogênio</span>
                <span>N · Nitrogênio</span>
                <span>O · Oxigênio</span>
              </p>
            </>
          )}
          {scope !== 'molecule' && (
            <div className="lab3d-layerlist">
              <h3>
                <Layers size={15} /> Camadas
              </h3>
              {(scope === 'neuron' ? neuronLayers : labLayers[scope]).map(
                (layer) => (
                  <button
                    key={layer.id}
                    aria-pressed={layers.includes(layer.id)}
                    onClick={() => toggleLayer(layer.id)}
                  >
                    <i style={{ background: layer.color }} />
                    {layer.label}
                    <Eye size={14} />
                  </button>
                ),
              )}
              {scope === 'brain' && (
                <button className="lab3d-deep" onClick={showDeep}>
                  <Crosshair size={14} /> Revelar estruturas profundas
                </button>
              )}
            </div>
          )}
          <div className="lab3d-parts">
            <label className="lab3d-search">
              <Search size={14} />
              <input
                placeholder="Buscar no modelo…"
                aria-label="Buscar estrutura na cena"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            {selectedPart && (
              <div className="lab3d-selected">
                <strong>{selectedPart.name}</strong>
                <button
                  aria-label="Aproximar estrutura selecionada"
                  onClick={() => {
                    setClose(false);
                    setFocus((x) => x + 1);
                  }}
                >
                  <Maximize size={14} />
                </button>
              </div>
            )}
            <ul aria-label="Estruturas visíveis">
              {subset.map((part) => (
                <li key={part.id}>
                  <button
                    aria-pressed={selected === part.id}
                    onClick={() => {
                      setFocus(0);
                      setSelected(part.id);
                    }}
                  >
                    {part.name}
                  </button>
                </li>
              ))}
            </ul>
            {parts.length > 0 && !subset.length && (
              <p>Nenhuma estrutura visível para esta busca.</p>
            )}
          </div>
        </aside>
      </div>
      <footer className="lab3d-resources">
        {scope === 'heart' && (
          <>
            <button onClick={onEcg}>
              <Activity size={16} /> Laboratório de ECG <ArrowRight size={14} />
            </button>
            <button onClick={() => onAtlas('heart')}>
              <Heart size={16} /> Coração no Atlas
            </button>
            <a
              href="https://pmc.ncbi.nlm.nih.gov/articles/PMC11096616/"
              target="_blank"
              rel="noreferrer"
            >
              Referência · circulação coronária ↗
            </a>
          </>
        )}
        {scope === 'brain' && (
          <>
            <button onClick={onStroke}>
              <ScanLine size={16} /> Caso · Artéria cerebral média
            </button>
            <button onClick={() => onAtlas('brain')}>
              <Brain size={16} /> Encéfalo no Atlas
            </button>
            <a
              href="https://www.ninds.nih.gov/health-information/public-education/brain-basics"
              target="_blank"
              rel="noreferrer"
            >
              NINDS · Brain Basics ↗
            </a>
          </>
        )}
        {scope === 'neuron' && (
          <>
            <button onClick={() => switchScope('brain')}>
              <Brain size={16} /> Voltar ao encéfalo
            </button>
            <button onClick={() => switchScope('molecule')}>
              <Atom size={16} /> Explorar neurotransmissores
            </button>
            <a
              href="https://www.ninds.nih.gov/health-information/public-education/brain-basics"
              target="_blank"
              rel="noreferrer"
            >
              NINDS · O neurônio ↗
            </a>
          </>
        )}
        {scope === 'molecule' && (
          <>
            <button onClick={() => switchScope('neuron')}>
              <Activity size={16} /> Voltar ao neurônio
            </button>
            <a
              href={
                'https://pubchem.ncbi.nlm.nih.gov/compound/' +
                moleculeCid(molecule)
              }
              target="_blank"
              rel="noreferrer"
            >
              PubChem · CID {moleculeCid(molecule)} ↗
            </a>
          </>
        )}
      </footer>
      <p className="lab3d-caption">
        {scope === 'brain' && pointCloud
          ? 'Pontos amostrados da superfície das malhas do Atlas.'
          : macro
            ? 'Modelo genérico de referência: Z-Anatomy / BodyParts3D.'
            : 'A mudança de escala é didática. Os tamanhos entre cenas não são comparáveis.'}{' '}
        <a href="/models/detailed/LICENSE" target="_blank" rel="noreferrer">
          Créditos e licenças
        </a>
      </p>
    </section>
  );
}
