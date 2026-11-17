import { useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Atom,
  Brain,
  BookOpen,
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
import HeartCyclePanel from './HeartCyclePanel';
import { cycleComparison } from './heart-cycle';
import { ecgLeads, type LeadId } from './ecg-model';
import { defaultHeartFlow } from './heart-coronary-flow';
import HeartFlowControls from './HeartFlowControls';
import AnatomyDetails from './AnatomyDetails';
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
const defaultLayers = (scope: LabScale) =>
  labLayers[scope].map(({ id }) => id).filter(id => id !== 'cranial');
type Destination = {
  onImaging: () => void;
  onEcg: () => void;
  onStroke: () => void;
  onAtlas: (scope: 'heart' | 'brain') => void;
};

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
  scope,
  setScope,
  onImaging,
  onEcg,
  onStroke,
  onAtlas,
  period,
}: Destination & { scope: LabScale; setScope: (value: LabScale) => void; period?: number }) {
  const [molecule, setMolecule] = useState<Molecule>('dopamina');
  const [view, setView] = useState<LabView>(
    scope === 'heart' ? 'ghost' : 'natural',
  );
  const [layers, setLayers] = useState(() => defaultLayers(scope));
  const [spread, setSpread] = useState(0);
  const [cut, setCut] = useState(0);
  const [axis, setAxis] = useState<LabAxis>('coronal');
  const [camera, setCamera] = useState<LabCamera>('oblique');
  const [cameraReset, setCameraReset] = useState(0);
  const [close, setClose] = useState(false);
  const [pointCloud, setPointCloud] = useState(false);
  const [hydrogen, setHydrogen] = useState(true);
  const [flow, setFlow] = useState(defaultHeartFlow);
  const [branch, setBranch] = useState('all');
  const [lead, setLead] = useState<LeadId>('II');
  const [conduction, setConduction] = useState(false);
  const [leadAxes, setLeadAxes] = useState(false);
  const [bpm, setBpm] = useState(75);
  const [lockedCamera,setLockedCamera] = useState(false);
  const [vectors,setVectors] = useState(false);
  const [chamberView,setChamberView] = useState<'all'|'atria'|'ventricles'>('all');
  const [playing, setPlaying] = useState(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [selected, setSelected] = useState('');
  const [markers, setMarkers] = useState(true);
  const [focus, setFocus] = useState(0);
  const [parts, setParts] = useState<LabPart[]>([]);
  const [query, setQuery] = useState('');
  const time = useRef(0);
  const profile = useRef<HTMLDivElement>(null);
  const subset = useMemo(
    () =>
      parts.filter(
        (p) =>
          formatSearch(p.name + ' ' + p.id).includes(formatSearch(query)) &&
          (scope === 'molecule'
            ? hydrogen || p.layer !== 'H'
            : layers.includes(p.layer)) &&
          (scope !== 'heart' || chamberView === 'all' ||
            (chamberView === 'atria' ? p.id.endsWith('-atrium') : ['left-ventricle','right-ventricle'].includes(p.id))),
      ),
    [parts, query, scope, hydrogen, layers, chamberView],
  );
  const selectedPart = parts.find((p) => p.id === selected);
  const macro = scope === 'heart' || scope === 'brain';
  const moving = scope === 'heart' || scope === 'neuron';

  function openProfile() {
    profile.current?.focus();
  }

  function seekHeart(seconds:number) {
    setPlaying(false);
    time.current=seconds;
  }

  function compareHeart(systole:boolean) {
    setLockedCamera(true);
    seekHeart(cycleComparison(bpm,systole));
  }

  function resetModel(next = scope) {
    time.current=0;
    setLockedCamera(false);
    setVectors(false);
    setChamberView('all');
    setView(next === 'heart' ? 'ghost' : 'natural');
    setLayers(defaultLayers(next));
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
    setFlow(defaultHeartFlow);
    setBranch('all');
    setLead('II');
    setConduction(false);
    setLeadAxes(false);
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
    setLockedCamera(false);
    setChamberView('all');
    setStage(step);
    setFlow(value => ({ ...value, arteries: true }));
    setBranch('anterior-interventricular-artery');
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
          <h2 id="lab3d-title">Anatomia 3D</h2>
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
              markers={macro ? markers : undefined}
              onDetails={macro ? openProfile : undefined}
              focus={focus}
              camera={camera}
              cameraReset={cameraReset}
              lookAtLesion={close}
              pointCloud={pointCloud}
              showHydrogen={hydrogen}
              flow={flow}
              coronaryBranch={branch}
              electrical={scope === 'heart' ? {
                lead, visibleLeads: leadAxes ? [lead] : [], showConduction: conduction, onSelectLead: setLead,
              } : undefined}
              stage={stage}
              progress={progress}
              playing={playing}
              bpm={bpm}
              time={time}
              lockedCamera={lockedCamera}
              vectors={vectors}
              chamberView={chamberView}
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
            {scope==='heart' && <div className="heart-phase-shortcuts" aria-label="Comparar sístole e diástole">
              <button onClick={()=>compareHeart(false)}>Diástole</button>
              <button onClick={()=>compareHeart(true)}>Sístole</button>
            </div>}
            <div className="lab3d-orbit-help">
              {lockedCamera ? 'Câmera fixa' : 'Arraste para girar · Role para aproximar'}
            </div>
          </div>
          <div className="lab3d-camera" aria-label="Vistas do modelo">
            {(Object.keys(cameraViews) as LabCamera[]).map((id) => (
              <button
                key={id}
                aria-pressed={camera === id && !close}
                onClick={() => {
                  setLockedCamera(false);
                  setCamera(id);
                  setCameraReset((n) => n + 1);
                  setClose(false);
                }}
              >
                {cameraViews[id]}
              </button>
            ))}
            {scope==='heart' && <button aria-pressed={lockedCamera} onClick={()=>setLockedCamera(value=>!value)}>Câmera fixa</button>}
            {macro && <button type="button" aria-pressed={markers} onClick={() => setMarkers(value => !value)}>
              <CircleDot size={14} /> Marcadores
            </button>}
          </div>
          {scope==='heart' && <HeartCyclePanel bpm={bpm} time={time} lead={lead} onSeek={seekHeart}/>}
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
          {scope === 'heart' && <div className="heart-motion-controls">
            <label>Isolar câmaras
              <select value={chamberView} onChange={event=>setChamberView(event.target.value as typeof chamberView)}>
                <option value="all">Coração completo</option><option value="atria">Átrios</option><option value="ventricles">Ventrículos</option>
              </select>
            </label>
            <label className="lab3d-check"><input type="checkbox" checked={vectors} onChange={event=>setVectors(event.target.checked)}/>
              Vetores da contração do VE
            </label>
          </div>}
          {scope === 'heart' && (
            <>
              <fieldset className="heart-flow-controls">
                <legend>ECG e condução elétrica</legend>
                <label className="heart-flow-branch">
                  Derivação do traçado
                  <select value={lead} onChange={event => setLead(event.target.value as LeadId)}>
                    {Object.keys(ecgLeads).map(id => <option key={id} value={id}>{id}</option>)}
                  </select>
                </label>
                <label className="heart-flow-option">
                  <input type="checkbox" checked={conduction} onChange={event => setConduction(event.target.checked)} />
                  Condução elétrica no coração
                </label>
                <label className="heart-flow-option">
                  <input type="checkbox" checked={leadAxes} onChange={event => setLeadAxes(event.target.checked)} />
                  Eixo da derivação no coração
                </label>
              </fieldset>
              <HeartFlowControls flow={flow} setFlow={setFlow} branch={branch} setBranch={setBranch} />
              {simulation}
            </>
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
                {macro && <button type="button" aria-label="Abrir ficha anatômica" onClick={openProfile}>
                  <BookOpen size={14} />
                </button>}
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
      {macro && <div className="lab3d-anatomy-profile" tabIndex={-1} ref={profile}>
        <AnatomyDetails
          key={selectedPart?.id ?? scope}
          id={selectedPart?.id ?? (scope === 'heart' ? 'heart' : 'cerebrum')}
          name={selectedPart?.name ?? (scope === 'heart' ? 'Coração' : 'Encéfalo')}
          metadata={selectedPart?.metadata}
          period={period}
        />
      </div>}
      <footer className="lab3d-resources">
        {scope === 'heart' && (
          <>
            <button onClick={onEcg}>
              <Activity size={16} /> ECG e circulação <ArrowRight size={14} />
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
