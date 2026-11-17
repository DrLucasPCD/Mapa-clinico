import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  Activity,
  ArrowUpRight,
  Bone,
  BookOpen,
  Brain,
  Bookmark,
  ChevronRight,
  CircleDot,
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
  Stethoscope,
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
import './workspace.css';
import './study.css';
import StudyPanel from './StudyPanel';
import AnatomyDetails from './AnatomyDetails';
import { anatomyDisplayName } from './anatomy-details';
import StudyPaths from './StudyPaths';
import ImagingWorkbench from './ImagingWorkbench';
import UltrasoundSimulator from './UltrasoundSimulator';
import { ultrasoundZones, type UltrasoundCaseId, type UltrasoundZone } from './ultrasound-data';
import type { AtlasSlice } from './atlas-slice';
import { getDetailedCatalog, type DetailedCatalogEntry } from './detailed-catalog';
import { atlasSliceForSequence } from './image-integration';
import { heartOrgans } from './heart-model';
import type { ReviewDestination, VisualId } from './TrainingViews';
import type { LibraryCase } from './training-data';
import type { PlantaoReview } from './plantao-cases';
import type { PathStep } from './study-paths';
import './training.css';
import type { LabScale } from './lab3d-data';

const Atlas = lazy(() => import('./Atlas'));
const EcgLab = lazy(() => import('./EcgLab'));
const Lab3D = lazy(() => import('./Lab3D'));
const Plantao = lazy(() => import('./Plantao'));
const VisualTraining = lazy(() => import('./TrainingViews').then(module => ({ default: module.VisualTraining })));
const CaseLibrary = lazy(() => import('./TrainingViews').then(module => ({ default: module.CaseLibrary })));
const ReviewCenter = lazy(() => import('./TrainingViews').then(module => ({ default: module.ReviewCenter })));
const kneeOrgans = ['femur_r', 'tibia_r', 'patella_r'] as const;
type Workspace = 'case' | 'study' | 'imaging' | 'ultrasound' | 'paths' | 'plantao' | 'lab' | 'visual' | 'library' | 'review';
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
  // Open the interview directly without initializing a WebGL scene first.
  const [workspaceMode, setWorkspaceMode] = useState<Workspace>(() =>
    typeof window !== 'undefined' && window.location.hash === '#plantao' ? 'plantao' : 'imaging',
  );
  const [labMode, setLabMode] = useState<'ecg' | '3d'>('ecg');
  const [labScope, setLabScope] = useState<LabScale>('heart');
  const [caseView, setCaseView] = useState<'overview' | 'atlas' | 'case' | 'publications'>('case');
  const [pathEntry, setPathEntry] = useState<{ id: string; step: PathStep; question?: number }>();
  const [studyTopic, setStudyTopic] = useState<string>();
  const [openCaseQuestion, setOpenCaseQuestion] = useState(false);
  const [plantaoAtlas, setPlantaoAtlas] = useState(false);
  const [plantaoReview, setPlantaoReview] = useState<PlantaoReview>();
  const [visualTask, setVisualTask] = useState<VisualId | null>(null);
  const [visualSelection, setVisualSelection] = useState('');
  const [visualRevision, setVisualRevision] = useState(0);
  const [ultrasoundCase, setUltrasoundCase] = useState<UltrasoundCaseId>('148000');
  const [studyTab, setStudyTab] = useState<'topics' | 'vessels' | 'quiz'>('topics');
  const [modelVariant, setModelVariant] = useState<'male' | 'female'>('male');
  const [modelCatalog, setModelCatalog] = useState<DetailedCatalogEntry[]>([]);
  useEffect(() => { let active = true; setModelCatalog([]); getDetailedCatalog(modelVariant).then(items => { if (active) setModelCatalog(items); }).catch(console.error); return () => { active = false; }; }, [modelVariant]);
  const [slice, setSlice] = useState<AtlasSlice | null>(null);
  const [atlasPoint, setAtlasPoint] = useState<{ point: number[]; label: string; variant: 'male' | 'female' } | null>(null);
  const openStudy = (tab: typeof studyTab, topic?: string) => { setStudyTopic(topic); setStudyTab(tab); setWorkspaceMode('study'); setMobileNav(false); };
  const changeModel = (variant: typeof modelVariant) => { setModelVariant(variant); resetAtlas(); setSelected(''); setName(variant === 'female' ? 'Tronco feminino' : 'Corpo masculino'); };
  const [lessonTab, setLessonTab] = useState<'anatomia' | 'funcao' | 'clinica'>(
    'anatomia',
  );
  const [ankleInversion, setAnkleInversion] = useState(0);
  const [system, setSystem] = useState('all'),
    [period, setPeriod] = useState('2');
  const [selected, setSelected] = useState('heart'),
    [name, setName] = useState('Coração');
  const [isolatedId, setIsolatedId] = useState('');
  const isolate = Boolean(isolatedId);
  const [beating, setBeating] = useState(true);
  const [atlasMarkers, setAtlasMarkers] = useState(true);
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
    [caseId, setCaseId] = useState('87566');
  const [pathology, setPathology] = useState(''),
    [query, setQuery] = useState(''),
    [hidden, setHidden] = useState<string[]>([]);
  const [drawer, setDrawer] = useState<Drawer>(null),
    [mobileNav, setMobileNav] = useState(false),
    [saved, setSaved] = useState<string[]>([]);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawer(null);
        setMobileNav(false);
      }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);
  const n = Number(period),
    lesson = lessons.find((l) => selected.includes(l.id)),
    activeCase = cases.find((c) => c.id === caseId) ?? cases[0];
  const catalogStructure = modelCatalog.find(entry => entry.id === selected) ??
    modelCatalog.find(entry => entry.aliases.includes(selected));
  const showAtlasSlice = workspaceMode === 'imaging' ||
    (workspaceMode === 'case' && activeCase.acquisition?.kind === 'ordered-series');
  const sliceMatchesHeart = slice?.region === 'thorax' || slice?.region === 'body';
  const visibleSlice = showAtlasSlice && (isolatedId !== 'heart' || sliceMatchesHeart) ? slice : null;
  const atlasExercise = workspaceMode === 'visual' && visualTask === 'atlas-patella';
  const trainingWorkspace = ['plantao', 'lab', 'visual', 'library', 'review'].includes(workspaceMode);
  const showAtlas = !trainingWorkspace || atlasExercise || (workspaceMode === 'plantao' && plantaoAtlas);
  const syncSequenceSlice = useCallback((index: number, total: number) => {
    const next = atlasSliceForSequence(activeCase.acquisition, index, total);
    if (next) setSlice(next);
  }, [activeCase]);
  const searchResults = useMemo(
    () => searchAtlasStructures(query, system, 60, [
      { id: 'heart', name: 'Coração', system: 'cardiovascular', objectCount: heartOrgans.length },
      ...modelCatalog.map(entry => ({
        ...entry,
        name: anatomyDisplayName(entry.id, entry.name, entry.sourceId),
      })),
    ]),
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
    setName(anatomyDisplayName(id, title));
    setPathology('');
  };
  const focusStructure = (id: string, title: string) => {
    setWorkspaceMode(current => ['lab', 'library', 'review', 'visual'].includes(current) ? 'case' : current);
    setCaseView('atlas');
    if (workspaceMode === 'plantao') setPlantaoAtlas(true);
    if (id === 'heart') setModelVariant('male');
    choose(id, title);
    setSystem('all');
    setRegion('all');
    setLayoutMode('assembled');
    setCut(0);
    setIsolatedId(id);
    setHidden([]);
    setDrawer(null);
    setMobileNav(false);
  };
  const syncUltrasoundRegion = useCallback((zone: UltrasoundZone) => {
    const target = ultrasoundZones[zone];
    setSystem('all');
    setSelected(target.atlasId);
    setName(target.label);
    setRegion('all');
    setIsolatedId(target.atlasId);
    setPathology('');
    setHidden([]);
  }, []);
  const openPaths = (entry?: typeof pathEntry) => {
    setPathEntry(entry);
    setWorkspaceMode('paths');
    setMobileNav(false);
    setDrawer(null);
    requestAnimationFrame(() => document.getElementById('study-paths')?.scrollIntoView({ block: 'nearest' }));
  };
  const openUltrasound = (id: UltrasoundCaseId = '148000') => {
    setUltrasoundCase(id);
    setWorkspaceMode('ultrasound');
    setMobileNav(false);
    setSlice(null);
  };
  const focusPathStructure = (id: string, label: string, maleOnly?: boolean) => {
    if (maleOnly) setModelVariant('male');
    setExplode(0);
    setTransparency(0);
    setMotion(0);
    setAnkleMotion(0);
    setAnkleInversion(0);
    focusStructure(id, label);
    if (window.matchMedia('(max-width: 850px)').matches) {
      document.getElementById('atlas-panel')?.scrollIntoView({ block: 'start' });
    }
  };
  const resetAtlas = () => {
    setReset((v) => v + 1);
    setIsolatedId('');
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
  function openTraining(view: 'plantao' | 'lab' | 'visual' | 'library' | 'review', review?: PlantaoReview) {
    if (view === 'plantao') {
      setPlantaoAtlas(false);
      setPlantaoReview(review);
    }
    setWorkspaceMode(view);
    setMobileNav(false);
    setDrawer(null);
    window.scrollTo({ top: 0 });
  }
  function openImmersive(scope: LabScale = 'heart') {
    setLabScope(scope);
    openLab('3d');
  }
  function openLab(mode = labMode) {
    setLabMode(mode);
    openTraining('lab');
  }
  function openCase(id?: string, question = false) {
    if (id) setCaseId(id);
    setOpenCaseQuestion(question);
    setWorkspaceMode('case');
    setCaseView('case');
    setMobileNav(false);
  }
  function openAtlas(view: typeof caseView = 'atlas') {
    resetAtlas();
    openCase();
    setCaseView(view);
    if (view === 'publications') {
      requestAnimationFrame(() => document.querySelector('.publication-column')?.scrollIntoView({ behavior: 'smooth' }));
    } else {
      window.scrollTo({ top: 0 });
    }
  }
  function openImaging() {
    setWorkspaceMode('imaging');
    setMobileNav(false);
    resetAtlas();
  }
  function openNavDrawer(panel: Drawer) {
    setDrawer(panel);
    setMobileNav(false);
  }
  const navItem = (label: string, Icon: typeof Home, action: () => void, current = false, modifier = '') => (
    <button className={`nav-item ${modifier}`} aria-current={current ? 'page' : undefined} onClick={action}>
      <Icon /> {label}
    </button>
  );
  function chooseVisual(id: VisualId | null) {
    setVisualTask(id);
    setVisualSelection('');
    setVisualRevision(value => value + 1);
  }
  function openLibraryCase(item: LibraryCase) {
    if (item.destination === 'case') openCase(item.id);
    else if (item.destination === 'path') openPaths({ id: 'joelho', step: 'Caso' });
    else openUltrasound(item.id);
  }
  function openReview(destination: ReviewDestination) {
    switch (destination.kind) {
      case 'path': openPaths({ id: destination.id, step: 'Questões', question: destination.question }); break;
      case 'case': openCase(destination.id, true); break;
      case 'curriculum': openStudy('quiz', destination.id); break;
      case 'visual': chooseVisual(destination.id); openTraining('visual'); break;
      case 'plantao': openTraining('plantao', destination.review); break;
    }
  }
  const locate = () => {
    setRegion('all');
    setLayoutMode('assembled');
    setTransparency(0);
    setSystem(activeCase.system);
    setSelected(activeCase.region);
    setName(activeCase.region === 'cerebrum' ? 'Encéfalo' : 'Metacarpos');
    setIsolatedId(activeCase.region);
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
          aria-label={mobileNav ? 'Fechar navegação' : 'Abrir navegação'}
          aria-expanded={mobileNav}
          aria-controls="clinical-navigation"
          onClick={() => setMobileNav(!mobileNav)}
        >
          {mobileNav ? <X /> : <Menu />}
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
              {searchResults.length} {searchResults.length === 1 ? 'resultado' : 'resultados'}
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
        <nav id="clinical-navigation" aria-label="Navegação principal" className={`clinical-sidebar${mobileNav ? ' open' : ''}`}>
          {navItem('Visão geral', Home, () => openAtlas('overview'), workspaceMode === 'case' && caseView === 'overview', 'nav-overview')}
          {navItem('Minhas listas', Bookmark, () => openNavDrawer('lists'))}

          <h2 className="nav-heading"><Layers /> Explorar o corpo</h2>
          {navItem('Atlas 3D', Layers, () => openAtlas(), workspaceMode === 'case' && caseView === 'atlas')}
          <details className="nav-systems">
            <summary className="nav-item"><Heart /> Sistemas do corpo <ChevronRight className="nav-chevron" /></summary>
            <div>
              {systems.map(([id, label, Icon]) => (
                <button key={id} className="nav-item" aria-pressed={system === id} onClick={() => {
                  if (!showAtlas || atlasExercise) openAtlas();
                  setSystem(id);
                  setIsolatedId('');
                  setMobileNav(false);
                  document.getElementById('atlas-panel')?.scrollIntoView({ block: 'nearest' });
                }}><Icon /> {label}</button>
              ))}
            </div>
          </details>
          {navItem('Imagens (TC, RM, RX)', ScanLine, openImaging, workspaceMode === 'imaging')}
          {navItem('Simulador de USG', Activity, () => openUltrasound(), workspaceMode === 'ultrasound')}
          {navItem('Artérias e territórios', Activity, () => openStudy('vessels'), workspaceMode === 'study' && studyTab === 'vessels')}

          <h2 className="nav-heading"><Stethoscope /> Casos clínicos</h2>
          {navItem('Biblioteca de casos', Library, () => openTraining('library'), workspaceMode === 'library')}
          {navItem('Caso em estudo', Focus, () => openCase(), workspaceMode === 'case' && caseView === 'case')}
          {navItem('Modo Plantão', Stethoscope, () => openTraining('plantao'), workspaceMode === 'plantao')}
          {navItem('Percursos de estudo', BookOpen, () => openPaths(), workspaceMode === 'paths')}

          <h2 className="nav-heading"><Activity /> Laboratórios</h2>
          {navItem('Laboratório integrado', Activity, () => openLab(), workspaceMode === 'lab')}
          {navItem('Treino visual', Focus, () => openTraining('visual'), workspaceMode === 'visual')}

          <h2 className="nav-heading"><BookOpen /> Minha aprendizagem</h2>
          {navItem('Minha revisão', ListChecks, () => openTraining('review'), workspaceMode === 'review')}
          {navItem('Mapas mentais', Brain, () => openNavDrawer('maps'))}
          {navItem('Publicações', Newspaper, () => openAtlas('publications'), workspaceMode === 'case' && caseView === 'publications')}
          {navItem('Protocolos e diretrizes', Library, () => openNavDrawer('protocols'))}
          {navItem('Simulados e questões', ListChecks, () => openStudy('quiz'), workspaceMode === 'study' && studyTab === 'quiz')}
          {navItem('Roteiro da faculdade', BookOpen, () => openStudy('topics'), workspaceMode === 'study' && studyTab === 'topics')}
        </nav>
        <main className={`dashboard-stage workspace-${workspaceMode}${trainingWorkspace ? ' workspace-training' : ''}${showAtlas && trainingWorkspace ? ' training-with-atlas' : ''}`}>
          {showAtlas && (atlasExercise ? (
            <section className="atlas-column training-atlas" id="atlas-panel" aria-label="Modelo do joelho sem rótulos">
              <Suspense fallback={<p className="atlas-loading">Preparando joelho 3D…</p>}>
                <Atlas key="training-knee" modelVariant="male" organs={kneeOrgans} selected={visualSelection}
                  system="all" isolate={false} explode={0} cut={0} plane="axial" beating={false} motion={0}
                  pathology="" hidden={[]} reset={visualRevision} onSelect={setVisualSelection} />
              </Suspense>
              <div className="atlas-help"><Move3D /> Arraste para girar · clique para selecionar</div>
            </section>
          ) : <section className="atlas-column" id="atlas-panel">
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
              {(selected === 'heart' || selected === 'cerebrum') && <button className="atlas-lab-link"
                aria-label="Explorar no Laboratório 3D" onClick={() => openImmersive(selected === 'heart' ? 'heart' : 'brain')}><Layers size={14}/> Lab 3D</button>}
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
                  setIsolatedId('');
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
                slice={visibleSlice}
                system={system}
                selected={selected}
                isolate={isolate}
                isolateSelection={isolatedId}
                markers={atlasMarkers}
                onDetails={(id, label) => { choose(id, label); setLessonTab('anatomia'); setDrawer('lesson'); }}
                explode={explode}
                cut={cut}
                plane={plane}
                beating={beating}
                motion={motion}
                pathology={pathology}
                hidden={hidden}
                reset={reset}
                onSelect={choose}
                onLandmark={workspaceMode === 'imaging' ? setAtlasPoint : undefined}
                transparency={transparency}
                layoutMode={layoutMode}
                region={region}
                ankleMotion={ankleMotion}
                ankleInversion={ankleInversion}
              />
            </Suspense>
            <div className="atlas-float-tools">
              <button type="button" className={atlasMarkers ? 'active' : ''} aria-pressed={atlasMarkers}
                onClick={() => setAtlasMarkers(value => !value)}>
                <CircleDot />
                <span>Marcadores</span>
              </button>
              {selected && <button type="button" onClick={() => { setLessonTab('anatomia'); setDrawer('lesson'); }}>
                <BookOpen />
                <span>Ficha</span>
              </button>}
              <button
                className={isolate ? 'active' : ''}
                onClick={() => setIsolatedId(isolate ? '' : selected)}
              >
                <Focus />
                <span>Isolar</span>
              </button>
              <button
                onClick={() => {
                  setHidden([...hidden, selected]);
                  setIsolatedId('');
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
                      setIsolatedId('');
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
            {workspaceMode === 'paths' && <a className="path-atlas-return" href="#study-paths">Voltar ao percurso</a>}
          </section>)}
          <section className="case-column">
            {workspaceMode !== 'lab' && <nav className="workspace-tabs" aria-label="Área de estudo">
              <button className={workspaceMode === 'paths' ? 'active' : ''} onClick={() => openPaths()}>Percursos</button>
              <button className={workspaceMode === 'case' ? 'active' : ''} onClick={() => openCase()}>Casos</button>
              <button className={workspaceMode === 'study' ? 'active' : ''} onClick={() => setWorkspaceMode('study')}>Estudar</button>
              <button className={workspaceMode === 'imaging' ? 'active' : ''} onClick={openImaging}>TC / RM</button>
              <button className={workspaceMode === 'ultrasound' ? 'active' : ''} onClick={() => openUltrasound()}>USG</button>
              <button className={workspaceMode === 'plantao' ? 'active' : ''} onClick={() => openTraining('plantao')}>Plantão</button>
              <button onClick={() => openLab('ecg')}>ECG</button>
            </nav>}
            {workspaceMode === 'lab' ? <section className="integrated-lab" aria-labelledby="integrated-lab-title">
              <header className="integrated-lab-header">
                <span className="training-icon"><Activity size={23} /></span>
                <h1 id="integrated-lab-title">Laboratório integrado</h1>
                <nav aria-label="Ferramentas do laboratório">
                  <button type="button" aria-pressed={labMode === 'ecg'} onClick={() => setLabMode('ecg')}><Activity size={16} /> ECG e circulação</button>
                  <button type="button" aria-pressed={labMode === '3d'} onClick={() => setLabMode('3d')}><Layers size={16} /> Anatomia 3D</button>
                </nav>
              </header>
              <Suspense fallback={<p className="training-screen" role="status">Carregando laboratório…</p>}>
                {labMode === 'ecg' ? <EcgLab onAnatomy={() => openImmersive('heart')} />
                : <Lab3D scope={labScope} setScope={setLabScope} period={n} onImaging={openImaging} onEcg={() => openLab('ecg')}
                    onStroke={() => openCase('2604')}
                    onAtlas={scope => focusPathStructure(scope === 'heart' ? 'heart' : 'cerebrum', scope === 'heart' ? 'Coração' : 'Encéfalo', true)} />}
              </Suspense>
            </section>
            : workspaceMode === 'plantao' ? <Suspense fallback={<p className="training-screen">Carregando plantão…</p>}>
              <Plantao key={plantaoReview ? plantaoReview.caseId + '/' + (plantaoReview.clinical ? 'clinical/' : '') + plantaoReview.decision : 'full'} review={plantaoReview}
                onAtlas={(id, label) => {
                  focusPathStructure(id, label, true);
                  requestAnimationFrame(() => document.getElementById('atlas-panel')?.scrollIntoView({ block: 'nearest' }));
                }}
                onCloseAtlas={() => setPlantaoAtlas(false)}
                onUltrasound={() => openUltrasound('27525')}
                onVisual={id => { chooseVisual(id); openTraining('visual'); }} />
            </Suspense>
            : workspaceMode === 'visual' || workspaceMode === 'library' || workspaceMode === 'review' ? (
              <Suspense fallback={<p className="training-screen">Carregando área de estudo…</p>}>
                {workspaceMode === 'visual' ? <VisualTraining taskId={visualTask} setTaskId={chooseVisual}
                    atlasSelection={visualSelection} selectAtlas={setVisualSelection} atlasRevision={visualRevision} />
                  : workspaceMode === 'library' ? <CaseLibrary onOpen={openLibraryCase} />
                  : <ReviewCenter onOpen={openReview} />}
              </Suspense>
            )
            : workspaceMode === 'paths' ? (
              <StudyPaths period={n} entry={pathEntry} modelVariant={modelVariant} onLocate={focusPathStructure}
                onOpenBiliary={() => openUltrasound('27525')}
                onOpenStroke={() => openCase('2604')} />
            ) : workspaceMode === 'study' ? <StudyPanel key={studyTopic ?? 'browse'} initialTopic={studyTopic} modelVariant={modelVariant} period={n} onLocate={focusStructure} initialTab={studyTab} /> : workspaceMode === 'imaging' ? <ImagingWorkbench onSlice={setSlice} casePreview={activeCase} period={n} onLocateCase={locate} onSelectCase={setCaseId} onFocusStructure={(id, label) => { if (modelVariant === 'female') setModelVariant('male'); focusStructure(id, label); }} onPreviewModality={modality => { const match = cases.find(item => item.modality === modality); if (match) setCaseId(match.id); }} dicomFiles={activeCase.acquisition?.kind === 'dicom-series' ? activeCase.acquisition.files : undefined} atlasPoint={atlasPoint} modelVariant={modelVariant} /> : workspaceMode === 'ultrasound' ? <UltrasoundSimulator key={ultrasoundCase} initialCaseId={ultrasoundCase} onSelectRegion={syncUltrasoundRegion} /> : <>
            <div className="case-switcher">
              <Select
                value={caseId}
                onValueChange={(v) => openCase(v || cases[0].id)}
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
              key={caseId + String(openCaseQuestion)}
              item={activeCase}
              period={n}
              openQuestion={openCaseQuestion}
              onOpenDicom={openImaging}
              onLocate={locate}
              caseIndex={cases.indexOf(activeCase)}
              caseCount={cases.length}
              onPreviousCase={() =>
                openCase(
                  cases[
                    (cases.indexOf(activeCase) + cases.length - 1) %
                      cases.length
                  ].id,
                )
              }
              onNextCase={() =>
                openCase(
                  cases[(cases.indexOf(activeCase) + 1) % cases.length].id,
                )
              }
              onSequenceSlice={syncSequenceSlice}
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
                <AnatomyDetails
                  key={selected + ':' + lessonTab}
                  id={selected}
                  name={name}
                  metadata={catalogStructure}
                  initial={lessonTab}
                  period={n}
                  showTitle={false}
                />
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
                  openCase(id);
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
