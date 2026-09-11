import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  Activity,
  ArrowUpRight,
  Bone,
  BookOpen,
  Brain,
  Bookmark,
  ChevronRight,
  CircleHelp,
  Focus,
  Grid3X3,
  Heart,
  Home,
  Layers,
  Library,
  ListChecks,
  Menu,
  Move3D,
  Newspaper,
  RotateCcw,
  Search,
  ScanLine,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cases, lessonFor, lessons } from './content';
import {
  ATLAS_MESH_COUNT,
  ATLAS_STRUCTURE_COUNT,
  searchAtlasStructures,
} from './catalog';
import CaseStudy from './CaseStudy';
import Discoveries from './Discoveries';
import Install from './Install';
import { registerStudyTool, type Context } from './webmcp';
import './dashboard.css';
import './study.css';
import StudyPanel from './StudyPanel';
import ImagingWorkbench from './ImagingWorkbench';
import type { AtlasSlice } from './atlas-slice';
import { getDetailedCatalog, type DetailedCatalogEntry } from './detailed-catalog';

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
  ['reproductive', 'Reprodutor', Activity],
  ['endocrine', 'Endócrino', Activity],
  ['lymphatic', 'Linfático', Layers],
  ['integumentary', 'Tegumentar', Layers],
] as const;
type Drawer =
  | 'lesson'
  | 'structures'
  | 'maps'
  | 'protocols'
  | 'questions'
  | 'lists'
  | null;

export default function App() {
  const [workspaceMode, setWorkspaceMode] = useState<'case' | 'study' | 'imaging'>('case');
  const [studyTab, setStudyTab] = useState<'topics' | 'vessels' | 'quiz'>('topics');
  const [modelVariant, setModelVariant] = useState<'male' | 'female'>('male');
  const [modelCatalog, setModelCatalog] = useState<DetailedCatalogEntry[]>([]);
  useEffect(() => { let active = true; setModelCatalog([]); getDetailedCatalog(modelVariant).then(items => { if (active) setModelCatalog(items); }).catch(console.error); return () => { active = false; }; }, [modelVariant]);
  const [slice, setSlice] = useState<AtlasSlice | null>(null);
  const openStudy = (tab: typeof studyTab) => { setStudyTab(tab); setWorkspaceMode('study'); setMobileNav(false); };
  const changeModel = (variant: typeof modelVariant) => { setModelVariant(variant); resetAtlas(); setSelected(''); setName(variant === 'female' ? 'Tronco feminino' : 'Corpo masculino'); };
  const [lessonTab, setLessonTab] = useState<'anatomia' | 'funcao' | 'clinica'>(
    'anatomia',
  );
  const [ankleInversion, setAnkleInversion] = useState(0);
  const [system, setSystem] = useState('all'),
    [period, setPeriod] = useState('2');
  const [selected, setSelected] = useState('heart'),
    [name, setName] = useState('Coração');
  const [isolate, setIsolate] = useState(false),
    [beating, setBeating] = useState(true);
  const [explode, setExplode] = useState(0),
    [cut, setCut] = useState(0),
    [transparency, setTransparency] = useState(0);
  const [plane, setPlane] = useState('sagital'),
    [motion, setMotion] = useState(0),
    [ankleMotion, setAnkleMotion] = useState(0);
  const [layoutMode, setLayoutMode] = useState<'assembled' | 'layers' | 'grid'>(
    'assembled',
  );
  const [region, setRegion] = useState<'all' | 'arm' | 'ankle'>('all');
  const [reset, setReset] = useState(0),
    [caseId, setCaseId] = useState('2604');
  const [pathology, setPathology] = useState(''),
    [query, setQuery] = useState(''),
    [hidden, setHidden] = useState<string[]>([]);
  const [drawer, setDrawer] = useState<Drawer>(null),
    [mobileNav, setMobileNav] = useState(false),
    [saved, setSaved] = useState<string[]>([]);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawer(null);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);
  const n = Number(period),
    lesson = lessons.find((l) => selected.includes(l.id)),
    activeCase = cases.find((c) => c.id === caseId) ?? cases[0];
  const searchResults = useMemo(
    () => searchAtlasStructures(query, system, 60, modelCatalog),
    [query, system, modelCatalog],
  );

  useEffect(() => {
    try {
      const p = localStorage.getItem('mapa-period'),
        s = localStorage.getItem('mapa-saved');
      if (p && Number(p) >= 1 && Number(p) <= 12) setPeriod(p);
      if (s && Array.isArray(JSON.parse(s))) setSaved(JSON.parse(s));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('mapa-period', period);
      localStorage.setItem('mapa-saved', JSON.stringify(saved));
    } catch {}
  }, [period, saved]);
  const choose = (id: string, title: string) => {
    setSelected(id);
    setName(title);
    setPathology('');
  };
  const focusStructure = (id: string, title: string) => {
    choose(id, title);
    setSystem('all');
    setRegion('all');
    setLayoutMode('assembled');
    setCut(0);
    setIsolate(true);
    setHidden([]);
    setDrawer(null);
    setMobileNav(false);
  };
  const resetAtlas = () => {
    setReset((v) => v + 1);
    setIsolate(false);
    setCut(0);
    setExplode(0);
    setTransparency(0);
    setMotion(0);
    setAnkleMotion(0);
    setAnkleInversion(0);
    setLayoutMode('assembled');
    setRegion('all');
    setPathology('');
    setHidden([]);
    setSystem('all');
  };
  const locate = () => {
    setRegion('all');
    setLayoutMode('assembled');
    setTransparency(0);
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  useEffect(
    () =>
      registerStudyTool(
        (document as Document & { modelContext?: Context }).modelContext,
        (id, p) =>
          flushSync(() => {
            const item = lessons.find((l) => l.id === id)!;
            focusStructure(id, item.name);
            setPeriod(String(p));
          }),
        lessons.map((l) => l.id),
      ),
    [],
  );

  return (
    <div className="clinical-dashboard" id="top">
      <header className="clinical-topbar">
        <button
          className="mobile-menu"
          aria-label="Abrir navegação"
          onClick={() => setMobileNav(!mobileNav)}
        >
          <Menu />
        </button>
        <a className="clinical-brand" href="#top">
          <span>
            <Activity />
          </span>
          <strong>
            Mapa Clínico<small>Do corpo à clínica</small>
          </strong>
        </a>
        <div className="search-wrap">
          <label className="global-search">
            <Search />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query && setDrawer('structures')}
              aria-label="Buscar no catálogo"
              placeholder="Buscar estruturas do atlas…"
            />
          </label>
          {query && (
            <button onClick={() => setDrawer('structures')}>
              {searchResults.length} resultados
            </button>
          )}
        </div>
        <button className="saved-button" onClick={() => setDrawer('lists')}>
          <BookOpen /> Minhas listas <span>{saved.length || ''}</span>
        </button>
        <button
          className="icon-button"
          title="Itens salvos"
          onClick={() => setDrawer('lists')}
        >
          <Bookmark />
        </button>
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
        <div className="profile">
          <span>LA</span>
          <strong>
            Lucas Albuquerque<small>@DrLucasPCD</small>
          </strong>
        </div>
      </header>
      <div className="clinical-body">
        <aside className={'clinical-sidebar ' + (mobileNav ? 'open' : '')}>
          <button
            className="nav-item active"
            onClick={() => {
              resetAtlas();
              setWorkspaceMode('case');
              setMobileNav(false);
            }}
          >
            <Home /> Início
          </button>
          <p>EXPLORAR</p>
          <button className="nav-item selected" onClick={resetAtlas}>
            <Layers /> Corpo integrado
          </button>
          <button
            className="nav-item"
            onClick={() => {
              setRegion('all');
              setLayoutMode('assembled');
            }}
          >
            <Layers /> Atlas 3D
          </button>
          <button
            className="nav-item"
            onClick={() => { setWorkspaceMode('case'); setMobileNav(false); }}
          >
            <Focus /> Casos clínicos
          </button>
          <button
            className="nav-item"
            onClick={() => { setWorkspaceMode('imaging'); setMobileNav(false); resetAtlas(); }}
          >
            <ScanLine /> Imagens (TC, RM, RX)
          </button>
          <button
            className="nav-item"
            onClick={() =>
              document
                .querySelector('.publication-column')
                ?.scrollIntoView({ behavior: 'smooth' })
            }
          >
            <Newspaper /> Publicações
          </button>
          <button className="nav-item" onClick={() => setDrawer('maps')}>
            <Brain /> Mapas mentais
          </button>
          <button className="nav-item" onClick={() => setDrawer('protocols')}>
            <Library /> Protocolos e diretrizes
          </button>
          <button className="nav-item" onClick={() => openStudy('quiz')}>
            <ListChecks /> Simulados e questões
          </button>
          <button className="nav-item" onClick={() => openStudy('topics')}><BookOpen /> Roteiro da faculdade</button>
          <button className="nav-item" onClick={() => openStudy('vessels')}><Activity /> Artérias e territórios</button>
          <div className="side-rule" />
          <p>SISTEMAS</p>
          {systems.slice(1).map(([id, label, Icon]) => (
            <button
              key={id}
              className={
                'nav-item system-link ' + (system === id ? 'selected' : '')
              }
              onClick={() => {
                setSystem(id);
                setIsolate(false);
              }}
            >
              <Icon />
              {label}
            </button>
          ))}
          <button
            className="connect-card"
            onClick={() => setDrawer('structures')}
          >
            <Brain />
            <span>
              <strong>Conectar conhecimentos</strong>
              <small>Do corpo à clínica</small>
            </span>
          </button>
        </aside>
        <main className="dashboard-stage">
          <section className="atlas-column">
            <div className="column-tabs">
              <button className="active" onClick={() => setDrawer(null)}>
                Atlas 3D
              </button>
              {(
                [
                  ['anatomia', 'Anatomia'],
                  ['funcao', 'Função'],
                  ['clinica', 'Clínica'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => {
                    setLessonTab(id);
                    setDrawer('lesson');
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="atlas-search-row">
              <label>
                <Search />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setDrawer('structures');
                  }}
                  aria-label="Buscar estrutura no modelo"
                  placeholder="Buscar estrutura + Enter…"
                />
              </label>
              <button className={'body-option ' + (modelVariant === 'male' ? 'active' : '')} aria-label="Modelo masculino" onClick={() => changeModel('male')}>♂</button>
              <button className={'body-option ' + (modelVariant === 'female' ? 'active' : '')} aria-label="Modelo feminino: tronco" onClick={() => changeModel('female')}>♀</button>
            </div>
            <div className="atlas-system-select">
              <span>Sistema</span>
              <Select
                value={system}
                onValueChange={(v) => {
                  setSystem(v || 'all');
                  setIsolate(false);
                }}
              >
                <SelectTrigger>
                  <SelectValue>
                    {systems.find((s) => s[0] === system)?.[1]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {systems.map(([id, label]) => (
                    <SelectItem value={id} key={id}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Suspense
              fallback={
                <div className="atlas-loading">Preparando visualização 3D…</div>
              }
            >
              <Atlas
                modelVariant={modelVariant}
                slice={workspaceMode === 'imaging' ? slice : null}
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
                transparency={transparency}
                layoutMode={layoutMode}
                region={region}
                ankleMotion={ankleMotion}
                ankleInversion={ankleInversion}
              />
            </Suspense>
            <div className="atlas-float-tools">
              <button
                className={isolate ? 'active' : ''}
                onClick={() => setIsolate(!isolate)}
              >
                <Focus />
                <span>Isolar</span>
              </button>
              <button
                onClick={() => {
                  setHidden([...hidden, selected]);
                  setIsolate(false);
                }}
              >
                <Activity />
                <span>Ocultar</span>
              </button>
              <button
                className={beating ? 'active' : ''}
                onClick={() => setBeating(!beating)}
              >
                <Heart />
                <span>Movimento</span>
              </button>
              <button onClick={resetAtlas}>
                <RotateCcw />
                <span>Resetar</span>
              </button>
            </div>
            <div className="atlas-help">
              <Move3D /> Arraste para girar
              <br />
              <span>Role para ampliar · Clique para selecionar</span>
            </div>
            <details className="dissection-panel">
              <summary>
                <SlidersHorizontal /> Dissecação e movimentos
              </summary>
              <div>
                <label>
                  Região
                  <Select
                    value={region}
                    onValueChange={(v) => {
                      setRegion((v || 'all') as typeof region);
                      setIsolate(false);
                      setSystem('all');
                      setHidden([]);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue>
                        {
                          {
                            all: 'Corpo inteiro',
                            arm: 'Braço',
                            ankle: 'Tornozelo',
                          }[region]
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Corpo inteiro</SelectItem>
                      <SelectItem value="arm">Braço</SelectItem>
                      <SelectItem value="ankle">Tornozelo</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
                <label>
                  Organização
                  <div className="layout-buttons">
                    <button
                      className={layoutMode === 'assembled' ? 'active' : ''}
                      onClick={() => setLayoutMode('assembled')}
                    >
                      Corpo
                    </button>
                    <button
                      className={layoutMode === 'layers' ? 'active' : ''}
                      onClick={() => setLayoutMode('layers')}
                    >
                      Camadas
                    </button>
                    <button
                      className={layoutMode === 'grid' ? 'active' : ''}
                      onClick={() => setLayoutMode('grid')}
                    >
                      <Grid3X3 />
                      Grade
                    </button>
                  </div>
                </label>
                <label>
                  Transparência {transparency}%
                  <Slider
                    value={[transparency]}
                    onValueChange={(v) =>
                      setTransparency(Array.isArray(v) ? v[0] : v)
                    }
                  />
                </label>
                {region === 'ankle' && (
                  <label>
                    Movimento do tornozelo {ankleMotion}°
                    <Slider
                      min={-35}
                      max={45}
                      value={[ankleMotion]}
                      onValueChange={(v) =>
                        setAnkleMotion(Array.isArray(v) ? v[0] : v)
                      }
                    />
                  </label>
                )}
                {region === 'ankle' && (
                  <label>
                    Inversão / eversão {ankleInversion}°
                    <Slider
                      min={-20}
                      max={20}
                      value={[ankleInversion]}
                      onValueChange={(v) =>
                        setAnkleInversion(Array.isArray(v) ? v[0] : v)
                      }
                    />
                  </label>
                )}
                {region === 'arm' && (
                  <label>
                    Flexão do cotovelo esquerdo {motion}°
                    <Slider
                      min={0}
                      max={120}
                      value={[motion]}
                      onValueChange={(v) =>
                        setMotion(Array.isArray(v) ? v[0] : v)
                      }
                    />
                  </label>
                )}
                <label>
                  Afastamento {explode}%
                  <Slider
                    value={[explode]}
                    onValueChange={(v) =>
                      setExplode(Array.isArray(v) ? v[0] : v)
                    }
                  />
                </label>
                <label>
                  Plano de corte
                  <select
                    aria-label="Plano de corte"
                    value={plane}
                    onChange={(e) => setPlane(e.target.value)}
                  >
                    <option value="sagital">Sagital</option>
                    <option value="coronal">Coronal</option>
                    <option value="axial">Axial</option>
                  </select>
                </label>
                <label>
                  Corte anatômico {cut}%
                  <Slider
                    value={[cut]}
                    onValueChange={(v) => setCut(Array.isArray(v) ? v[0] : v)}
                  />
                </label>
                <small>
                  Movimentos geométricos aproximados; não simulam tensão ou
                  deformação dos tecidos.
                </small>
              </div>
            </details>
            <div className="atlas-selection" aria-live="polite">{name}<small>{modelVariant === 'female' ? 'Modelo feminino real · tronco e pelve' : 'Modelo masculino detalhado'}</small></div>
            <div className="model-switch">
              <button className={modelVariant === 'male' ? 'active' : ''} onClick={() => changeModel('male')}>Masculino</button>
              <button className={modelVariant === 'female' ? 'active' : ''} onClick={() => changeModel('female')}>Feminino · tronco</button>
            </div>
          </section>
          <section className="case-column">
            <nav className="workspace-tabs" aria-label="Área de estudo">
              <button className={workspaceMode === 'case' ? 'active' : ''} onClick={() => setWorkspaceMode('case')}>Casos</button>
              <button className={workspaceMode === 'study' ? 'active' : ''} onClick={() => setWorkspaceMode('study')}>Estudar</button>
              <button className={workspaceMode === 'imaging' ? 'active' : ''} onClick={() => { setWorkspaceMode('imaging'); resetAtlas(); }}>TC / RM</button>
            </nav>
            {workspaceMode === 'study' ? <StudyPanel modelVariant={modelVariant} period={n} onLocate={focusStructure} initialTab={studyTab} /> : workspaceMode === 'imaging' ? <ImagingWorkbench onSlice={setSlice} dicomFiles={activeCase.acquisition?.kind === 'dicom-series' ? activeCase.acquisition.files : undefined} /> : <>
            <div className="case-switcher">
              <Select
                value={caseId}
                onValueChange={(v) => setCaseId(v || cases[0].id)}
              >
                <SelectTrigger>
                  <SelectValue>{activeCase.title}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {cases.map((c) => (
                    <SelectItem value={c.id} key={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <CaseStudy
              key={caseId}
              item={activeCase}
              period={n}
              onOpenDicom={() => { setWorkspaceMode('imaging'); resetAtlas(); }}
              onLocate={locate}
              caseIndex={cases.indexOf(activeCase)}
              caseCount={cases.length}
              onPreviousCase={() =>
                setCaseId(
                  cases[
                    (cases.indexOf(activeCase) + cases.length - 1) %
                      cases.length
                  ].id,
                )
              }
              onNextCase={() =>
                setCaseId(
                  cases[(cases.indexOf(activeCase) + 1) % cases.length].id,
                )
              }
            />
            </>}
          </section>
          <section className="publication-column">
            <Discoveries />
          </section>
        </main>
      </div>
      <section className="clinical-bottom">
        <div>
          <BookOpen />
          <span>
            <strong>Uma estrutura. Muitos caminhos.</strong>
            <small>Integre anatomia, imagem, casos e evidências.</small>
          </span>
        </div>
        <div>
          <Layers />
          <span>
            <strong>{modelCatalog.length.toLocaleString('pt-BR')}</strong>
            <small>Estruturas catalogadas</small>
          </span>
        </div>
        <div>
          <ScanLine />
          <span>
            <strong>{modelCatalog.reduce((sum, item) => sum + item.objectCount, 0).toLocaleString('pt-BR')}</strong>
            <small>Objetos anatômicos 3D</small>
          </span>
        </div>
        <div>
          <Newspaper />
          <span>
            <strong>PubMed</strong>
            <small>Publicações atualizadas</small>
          </span>
        </div>
        <b>
          Conhecimento aplicado
          <br />
          para um cuidado melhor.
        </b>
      </section>
      {drawer && (
        <div className="drawer-backdrop" onClick={() => setDrawer(null)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Painel de estudo"
            className="feature-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              aria-label="Fechar painel"
              className="drawer-close"
              onClick={() => setDrawer(null)}
            >
              <X />
            </button>
            {drawer === 'lesson' ? (
              <>
                <h2>{name}</h2>
                {lesson ? (
                  <>
                    <small>
                      {lesson.latin} · {period}º período
                    </small>
                    <div className="lesson-content">
                      <p>{lesson[lessonTab]}</p>
                      <p>
                        {
                          lesson.levels[
                            n <= 2 ? 0 : n <= 4 ? 1 : n <= 8 ? 2 : 3
                          ]
                        }
                      </p>
                      {lesson.origin && (
                        <dl>
                          <dt>Origem</dt>
                          <dd>{lesson.origin}</dd>
                          <dt>Inserção</dt>
                          <dd>{lesson.insertion}</dd>
                          <dt>Ação</dt>
                          <dd>{lesson.action}</dd>
                        </dl>
                      )}
                      <h3>Ponte com a radiologia</h3>
                      <p>{lesson.bridge}</p>
                      {lesson.audio && (
                        <>
                          <small>Ouvir introdução · Voz Faber</small>
                          <audio
                            controls
                            src={'/audio/' + lesson.audio + '.wav'}
                          />
                        </>
                      )}
                      <a href={lesson.source} target="_blank" rel="noreferrer">
                        Referência de estudo ↗
                      </a>
                    </div>
                  </>
                ) : (
                  <p>
                    Estrutura disponível no modelo 3D. Ainda não há uma ficha
                    didática revisada para esta estrutura.
                  </p>
                )}
              </>
            ) : (
              <DrawerContent
                drawer={drawer}
                results={searchResults}
                saved={saved}
                setSaved={setSaved}
                focus={focusStructure}
                currentName={name}
                currentLesson={lesson}
                selectCase={(id) => {
                  setCaseId(id);
                  setWorkspaceMode('case');
                  setDrawer(null);
                  setTimeout(
                    () =>
                      document
                        .querySelector('.case-column')
                        ?.scrollIntoView({ behavior: 'smooth' }),
                    10,
                  );
                }}
              />
            )}
          </section>
        </div>
      )}
      <footer className="atlas-credits">Atlas: <a href="/models/detailed/LICENSE" target="_blank" rel="noreferrer">Z-Anatomy / BodyParts3D · CC BY-SA 4.0; feminino NIH HRA · CC BY 4.0</a> · Visualização e organização adaptadas · Ensino não comercial</footer>
      <Install />
    </div>
  );
}

function DrawerContent({
  drawer,
  results,
  saved,
  setSaved,
  focus,
  selectCase,
  currentName,
  currentLesson,
}: {
  currentName: string;
  currentLesson?: (typeof lessons)[number];
  drawer: Drawer;
  results: ReturnType<typeof searchAtlasStructures>;
  saved: string[];
  setSaved: (v: string[]) => void;
  focus: (id: string, name: string) => void;
  selectCase: (id: string) => void;
}) {
  if (drawer === 'questions')
    return (
      <>
        <h2>Simulados e questões</h2>
        <p>Escolha um caso e responda antes de revelar os achados.</p>
        <div className="drawer-grid">
          {cases.map((item) => (
            <button key={item.id} onClick={() => selectCase(item.id)}>
              <CircleHelp />
              {item.title}
              <ChevronRight />
            </button>
          ))}
        </div>
      </>
    );
  if (drawer === 'protocols')
    return (
      <>
        <h2>Protocolos e referências</h2>
        <p>Fontes educacionais revisadas por estrutura.</p>
        <div className="drawer-grid">
          {lessons.map((item) => (
            <a
              key={item.id}
              href={item.source}
              target="_blank"
              rel="noreferrer"
            >
              {item.name}
              <ArrowUpRight />
            </a>
          ))}
        </div>
      </>
    );
  if (drawer === 'maps')
    return (
      <>
        <h2>Mapa de conexões</h2>
        <p>Conecte anatomia, função, clínica e radiologia.</p>
        <div className="connection-map">
          <strong>{currentName}</strong>
          {currentLesson && (
            <>
              {[
                ['Anatomia', currentLesson.anatomia],
                ['Função', currentLesson.funcao],
                ['Clínica', currentLesson.clinica],
                ['Radiologia', currentLesson.bridge],
              ].map(([title, text]) => (
                <article key={title}>
                  <b>{title}</b>
                  <p>{text}</p>
                </article>
              ))}
            </>
          )}
        </div>
        <div className="drawer-grid">
          {lessons.map((item) => (
            <button key={item.id} onClick={() => focus(item.id, item.name)}>
              <Brain />
              {item.name}
              <ChevronRight />
            </button>
          ))}
        </div>
      </>
    );
  if (drawer === 'lists')
    return (
      <>
        <h2>Minhas listas</h2>
        <p>Estruturas salvas neste navegador.</p>
        <div className="drawer-grid">
          {lessons.map((item) => {
            const picked = saved.includes(item.id);
            return (
              <button
                className={picked ? 'saved' : ''}
                key={item.id}
                onClick={() =>
                  setSaved(
                    picked
                      ? saved.filter((id) => id !== item.id)
                      : [...saved, item.id],
                  )
                }
              >
                <Bookmark />
                {item.name}
                <span>{picked ? 'Salvo' : 'Salvar'}</span>
              </button>
            );
          })}
        </div>
      </>
    );
  return (
    <>
      <h2>Estruturas do atlas</h2>
      <p>
        {results.length
          ? 'Selecione uma estrutura no catálogo.'
          : 'Nenhum resultado. Tente outro termo.'}{' '}
        O acervo atual contém apenas o modelo masculino; as variantes feminina e
        pediátrica ainda estão indisponíveis.
      </p>
      <div className="drawer-grid">
        {results.map((item) => (
          <button key={item.id} onClick={() => focus(item.id, item.name)}>
            {item.name}
            <small>
              {item.system} · {item.objectCount} objeto(s)
            </small>
            <ChevronRight />
          </button>
        ))}
      </div>
    </>
  );
}
