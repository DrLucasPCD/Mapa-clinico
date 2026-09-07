import { useState, useEffect, lazy, Suspense } from 'react';
import {
  Activity,
  Layers,
  Brain,
  Heart,
  Bone,
  ArrowUpRight,
  RotateCcw,
  ScanLine,
  Volume2,
  ChevronRight,
  BookOpen,
  Microscope,
  Move3D,
  Focus,
  Search,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { lessons, lessonFor, cases } from './content';
import CaseStudy from './CaseStudy';
import Discoveries from './Discoveries';
import Install from './Install';
import { flushSync } from 'react-dom';
import { registerStudyTool, type Context } from './webmcp';
const Atlas = lazy(() => import('./Atlas'));
const systems = [
  ['all', 'Corpo integrado', Layers],
  ['skeletal', 'Esquelético', Bone],
  ['muscular', 'Muscular', Activity],
  ['cardiovascular', 'Cardiovascular', Heart],
  ['nervous', 'Nervoso', Brain],
  ['respiratory', 'Respiratório', Activity],
  ['digestive', 'Digestório', Layers],
  ['urinary', 'Urinário', Layers],
] as const;
export default function App() {
  const [system, setSystem] = useState('all'),
    [period, setPeriod] = useState('2'),
    [selected, setSelected] = useState('heart'),
    [name, setName] = useState('Coração'),
    [tab, setTab] = useState('anatomia'),
    [isolate, setIsolate] = useState(false),
    [explode, setExplode] = useState(0),
    [cut, setCut] = useState(0),
    [plane, setPlane] = useState('sagital'),
    [motion, setMotion] = useState(0),
    [beating, setBeating] = useState(true),
    [reset, setReset] = useState(0),
    [view, setView] = useState('atlas'),
    [caseId, setCaseId] = useState('2604'),
    [pathology, setPathology] = useState(''),
    [query, setQuery] = useState(''),
    [hidden, setHidden] = useState<string[]>([]);
  const n = Number(period);
  const lesson = lessonFor(selected),
    level = n <= 2 ? 0 : n <= 4 ? 1 : n <= 8 ? 2 : 3;
  const activeCase = cases.find((c) => c.id === caseId)!;
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mapa-period');
      if (saved && Number(saved) >= 1 && Number(saved) <= 12) setPeriod(saved);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('mapa-period', period);
    } catch {}
  }, [period]);
  const choose = (id: string, title: string) => {
    setSelected(id);
    setName(title);
    setPathology('');
  };
  const locate = () => {
    setSystem(activeCase.system);
    setSelected(activeCase.region);
    setName(activeCase.region === 'cerebrum' ? 'Encéfalo' : 'Metacarpos');
    setIsolate(true);
    setPathology(
      activeCase.id === '2604'
        ? 'cerebrum@right'
        : activeCase.id === '87566'
          ? 'cerebrum@left'
          : activeCase.region,
    );
    setHidden([]);
    setCut(0);
    setExplode(0);
    setView('atlas');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  useEffect(
    () =>
      registerStudyTool(
        (document as Document & { modelContext?: Context }).modelContext,
        (id, p) =>
          flushSync(() => {
            const l = lessons.find((l) => l.id === id)!;
            setSelected(id);
            setName(l.name);
            setPeriod(String(p));
            setSystem('all');
            setIsolate(true);
            setHidden([]);
            setCut(0);
            setExplode(0);
            setPathology('');
            setView('atlas');
          }),
        lessons.map((l) => l.id),
      ),
    [],
  );
  return (
    <div className="app-shell">
      <header className="masthead">
        <a className="brand" href="/">
          <span className="brand-mark">
            <Activity />
          </span>
          <span>
            Mapa Clínico<small>DO CORPO À CLÍNICA</small>
          </span>
        </a>
        <div className="header-note">
          ANATOMIA <span>×</span> RADIOLOGIA <span>×</span> CLÍNICA
        </div>
        <div className="period">
          <span>Meu período</span>
          <Select value={period} onValueChange={(v) => setPeriod(v || '2')}>
            <SelectTrigger aria-label="Período da faculdade">
              <SelectValue>{period}º período</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i} value={String(i + 1)}>
                  {i + 1}º período
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>
      <div className="workspace">
        <aside className="systems">
          <div className="eyebrow">EXPLORAR SISTEMAS</div>
          {systems.map(([id, label, Icon]) => (
            <button
              key={id}
              className={'system ' + (system === id ? 'active' : '')}
              onClick={() => {
                setSystem(id);
                setIsolate(false);
              }}
            >
              <Icon size={18} />
              <span>{label}</span>
              <ChevronRight size={14} />
            </button>
          ))}
          <div className="sidebar-divider" />
          <div className="eyebrow">ESTRUTURAS EM FOCO</div>
          <label className="structure-search">
            <Search size={15} />
            <input
              placeholder="Buscar estrutura…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Buscar estrutura"
            />
          </label>
          {lessons
            .filter((l) =>
              l.name
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .includes(
                  query
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, ''),
                ),
            )
            .map((l) => (
              <button
                className="structure-link"
                key={l.id}
                onClick={() => {
                  choose(l.id, l.name);
                  setSystem('all');
                  setIsolate(true);
                  setHidden([]);
                  setView('atlas');
                }}
              >
                {l.name}
                <ArrowUpRight size={14} />
              </button>
            ))}
          <div className="study-note">
            <BookOpen size={20} />
            <strong>Aprender por conexões</strong>
            <p>Da forma à função. Da imagem ao raciocínio clínico.</p>
            <span>
              {n <= 2
                ? 'Ciclo básico'
                : n <= 4
                  ? 'Integração morfofuncional'
                  : n <= 8
                    ? 'Ciclo clínico'
                    : 'Internato'}
            </span>
          </div>
        </aside>
        <main className="main">
          <div className="page-heading">
            <div>
              <div className="eyebrow teal">
                ATLAS INTERATIVO / VISÃO INTEGRADA
              </div>
              <h1>O corpo conta uma história.</h1>
              <p>Explore as estruturas. Conecte os conhecimentos.</p>
            </div>
            <span className="version">
              ATLAS 01 <i />
            </span>
          </div>
          <Tabs value={view} onValueChange={(v) => setView(String(v))}>
            <TabsList className="main-tabs">
              <TabsTrigger value="atlas">
                <Layers size={16} />
                Atlas 3D
              </TabsTrigger>
              <TabsTrigger value="casos">
                <ScanLine size={16} />
                Casos e imagens
              </TabsTrigger>
              <TabsTrigger value="novidades">
                <BookOpen size={16} />
                Novas publicações
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {view === 'casos' && (
            <>
              <div className="case-picker">
                {cases.map((c) => (
                  <button
                    key={c.id}
                    className={caseId === c.id ? 'active' : ''}
                    onClick={() => setCaseId(c.id)}
                  >
                    <span>{c.modality}</span>
                    {c.title}
                    <ArrowUpRight size={17} />
                  </button>
                ))}
              </div>
              <CaseStudy
                key={caseId}
                item={activeCase}
                period={n}
                onLocate={locate}
              />
            </>
          )}
          {view === 'novidades' && <Discoveries />}
          <div
            className="study-grid"
            style={{ display: view === 'atlas' ? undefined : 'none' }}
          >
            <section className="viewer">
              <div className="viewer-header">
                <span>
                  <i className="live-dot" /> Anatomia humana 3D
                </span>
                <span>MODELO MASCULINO</span>
              </div>
              <Suspense
                fallback={
                  <div className="atlas-status">Preparando visualização…</div>
                }
              >
                <Atlas
                  system={system}
                  selected={selected}
                  isolate={isolate}
                  explode={explode}
                  cut={cut}
                  plane={plane}
                  beating={beating}
                  motion={motion}
                  pathology={pathology}
                  hidden={hidden}
                  reset={reset}
                  onSelect={choose}
                />
              </Suspense>
              <div className="orientation">
                S<span>ANTERIOR</span>I
              </div>
              <div className="viewer-tools">
                <button
                  onClick={() => {
                    setReset((x) => x + 1);
                    setIsolate(false);
                    setCut(0);
                    setExplode(0);
                    setMotion(0);
                    setPathology('');
                    setHidden([]);
                  }}
                  title="Restaurar visão"
                  aria-label="Restaurar visão"
                >
                  <RotateCcw size={19} />
                </button>
                <button
                  className={isolate ? 'selected' : ''}
                  onClick={() => setIsolate(!isolate)}
                  title="Isolar estrutura"
                  aria-label="Isolar estrutura"
                >
                  <Focus size={19} />
                </button>
                <button
                  onClick={() => setBeating(!beating)}
                  className={beating ? 'selected' : ''}
                  title="Animar coração"
                  aria-label="Animar coração"
                >
                  <Heart size={19} />
                </button>
              </div>
              <div className="viewer-caption">
                <Move3D size={16} /> Arraste para girar · Role para ampliar ·
                Toque para selecionar
              </div>
              <div className="viewer-controls">
                <div>
                  <label>
                    Dissecação por afastamento <span>{explode}%</span>
                  </label>
                  <Slider
                    aria-label="Afastamento das estruturas"
                    value={[explode]}
                    onValueChange={(v) =>
                      setExplode(Array.isArray(v) ? v[0] : v)
                    }
                  />
                </div>
                <div>
                  <label>
                    Corte anatômico <span>{cut}%</span>
                  </label>
                  <Slider
                    aria-label="Profundidade do corte"
                    value={[cut]}
                    onValueChange={(v) => setCut(Array.isArray(v) ? v[0] : v)}
                  />
                </div>
                <Select
                  value={plane}
                  onValueChange={(v) => setPlane(v || 'sagital')}
                >
                  <SelectTrigger aria-label="Plano anatômico">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['sagital', 'coronal', 'axial'].map((x) => (
                      <SelectItem value={x} key={x}>
                        {x}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </section>
            <section className="inspector">
              <div className="eyebrow">ESTRUTURA SELECIONADA</div>
              <div className="structure-title">
                <h2>{name}</h2>
                <Heart size={22} />
              </div>
              <p className="latin">
                {lesson?.latin || 'Nomenclatura original do atlas'}
              </p>
              <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
                <TabsList className="detail-tabs">
                  <TabsTrigger value="anatomia">Anatomia</TabsTrigger>
                  <TabsTrigger value="funcao">Função</TabsTrigger>
                  <TabsTrigger value="clinica">Clínica</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="level-badge">
                NÍVEL{' '}
                {n <= 2
                  ? 'FUNDAMENTOS'
                  : n <= 4
                    ? 'INTEGRAÇÃO'
                    : n <= 8
                      ? 'RACIOCÍNIO CLÍNICO'
                      : 'PRÁTICA SUPERVISIONADA'}
              </div>
              {lesson ? (
                <>
                  <h3>
                    {tab === 'anatomia'
                      ? 'A estrutura por trás da função'
                      : tab === 'funcao'
                        ? 'Entenda a função'
                        : 'Conecte com o exame clínico'}
                  </h3>
                  <p>{lesson[tab as 'anatomia' | 'funcao' | 'clinica']}</p>
                  <p className="level-content">{lesson.levels[level]}</p>
                  {lesson.origin && (
                    <dl className="muscle-facts">
                      <dt>Origem</dt>
                      <dd>{lesson.origin}</dd>
                      <dt>Inserção</dt>
                      <dd>{lesson.insertion}</dd>
                      <dt>Ação</dt>
                      <dd>{lesson.action}</dd>
                    </dl>
                  )}
                  <div className="connection">
                    <span>
                      <ScanLine size={17} /> PONTE COM A RADIOLOGIA
                    </span>
                    <p>{lesson.bridge}</p>
                  </div>
                  {lesson.audio && (
                    <div className="audio-card">
                      <Volume2 size={18} />
                      <span>
                        Ouvir introdução
                        <small>Voz Faber · Português brasileiro</small>
                      </span>
                      <audio
                        key={lesson.audio}
                        controls
                        preload="none"
                        src={'/audio/' + lesson.audio + '.wav'}
                      />
                    </div>
                  )}
                  <a
                    className="source-link"
                    href={lesson.source}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Referência de estudo <ArrowUpRight size={13} />
                  </a>
                </>
              ) : (
                <>
                  <h3>Estrutura do atlas</h3>
                  <p>
                    Nome original: {name}. Selecione um dos módulos de estudo
                    para uma explicação integrada. Esta estrutura ainda não
                    possui uma ficha didática específica.
                  </p>
                </>
              )}
              <div className="selection-actions">
                <button
                  className="secondary-button"
                  onClick={() => setIsolate(!isolate)}
                >
                  {isolate ? 'Mostrar contexto' : 'Isolar estrutura'}
                </button>
                <button
                  className="secondary-button"
                  onClick={() => {
                    setHidden([...hidden, selected]);
                    setIsolate(false);
                  }}
                >
                  Ocultar estrutura
                </button>
              </div>
              {pathology && (
                <p className="pathology-note">
                  Destaque anatômico ilustrativo: {activeCase.regionLabel}
                </p>
              )}
              <button className="primary" onClick={() => setView('casos')}>
                Estudar casos e imagens <ArrowUpRight size={17} />
              </button>
            </section>
          </div>
          {view === 'atlas' && (
            <>
              <section className="motion-panel">
                <div>
                  <span className="eyebrow teal">LABORATÓRIO DE MOVIMENTO</span>
                  <h3>Flexão do cotovelo esquerdo</h3>
                  <p>
                    Modelo cinemático simplificado dos ossos do antebraço e da
                    mão. Não simula ligamentos nem deformação muscular.
                  </p>
                </div>
                <div>
                  <button
                    className="secondary-button"
                    onClick={() => {
                      setSystem('skeletal');
                      setIsolate(false);
                      setHidden([]);
                      setMotion(motion === 0 ? 90 : 0);
                    }}
                  >
                    {motion === 0 ? 'Demonstrar flexão' : 'Voltar à extensão'}
                  </button>
                  <label>
                    Ângulo: {motion}°
                    <Slider
                      aria-label="Flexão do cotovelo esquerdo"
                      min={0}
                      max={120}
                      value={[motion]}
                      onValueChange={(v) => {
                        setSystem('skeletal');
                        setIsolate(false);
                        setMotion(Array.isArray(v) ? v[0] : v);
                      }}
                    />
                  </label>
                </div>
              </section>
              <div className="lower-heading">
                <div>
                  <span className="eyebrow teal">DO ATLAS À PRÁTICA</span>
                  <h2>Uma estrutura. Diferentes perspectivas.</h2>
                </div>
                <Microscope size={24} />
              </div>
              <div className="perspectives">
                {[
                  [
                    '01',
                    'Anatomia em camadas',
                    'Revele estruturas profundas com os controles de dissecação.',
                  ],
                  [
                    '02',
                    'Imagem e orientação',
                    'Relacione os planos sagital, coronal e axial com os exames.',
                  ],
                  [
                    '03',
                    'Raciocínio progressivo',
                    'A profundidade da explicação acompanha o seu período.',
                  ],
                ].map(([k, t, d]) => (
                  <article key={k}>
                    <span>{k}</span>
                    <h3>{t}</h3>
                    <p>{d}</p>
                  </article>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
      <Install />
      <footer>
        Mapa Clínico · Ensino não comercial · Não é ferramenta de diagnóstico{' '}
        <a
          href="https://github.com/vixotic/Vanatome/blob/main/ASSET-LICENSE.md"
          target="_blank"
          rel="noreferrer"
        >
          Atlas: Vanatome / Z-Anatomy · CC BY-SA 4.0
        </a>
      </footer>
    </div>
  );
}
