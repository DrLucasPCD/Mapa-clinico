import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { groupDicomSeries, parseDicomFiles, sliceFraction, type DicomSeries, type Plane, type Region } from './dicom';
import type { ClinicalCase } from './content';
import { atlasSliceForSequence } from './image-integration';
import './study.css';
import { validateCtSegmentation } from './ct-segmentation';
import { pixelCenter, sliceFrame } from './patient-geometry';
import LandmarkPanel from './LandmarkPanel';
import type { OverlayClip, OverlaySystem } from './registered-overlay';

type SliceLocation = { plane: Plane; fraction: number; region: Region } | null;
type AtlasPoint = {point:number[]; label:string; variant:'male'|'female'};
type Props = { atlasPoint?: AtlasPoint | null; modelVariant?: 'male'|'female'; dicomFiles?: string[]; casePreview?: ClinicalCase; onPreviewModality?: (modality: 'TC'|'RM'|'RX') => void; onSlice: (location: SliceLocation) => void };
const PatientSlices = lazy(() => import('./PatientSlices'));
const TriPlanarViewer = lazy(() => import('./TriPlanarViewer'));
const MAX_DICOM_BYTES = 500 * 1024 * 1024;

function intensityRange(series: DicomSeries) {
  let low = Infinity, high = -Infinity;
  for (const slice of series.slices) for (const raw of slice.pixels) {
    const value = raw * slice.slope + slice.intercept;
    if (value < low) low = value;
    if (value > high) high = value;
  }
  return [low, high] as const;
}

export default function ImagingWorkbench({ onSlice, dicomFiles, casePreview, onPreviewModality, atlasPoint, modelVariant = 'male' }: Props) {
  const [series, setSeries] = useState<DicomSeries[]>([]);
  const [seriesIndex, setSeriesIndex] = useState(0);
  const [sliceIndex, setSliceIndex] = useState(0);
  const [region, setRegion] = useState<Region>('body');
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [center, setCenter] = useState<number | null>(null);
  const [width, setWidth] = useState<number | null>(null);
  const [threshold, setThreshold] = useState(300);
  const [surface, setSurface] = useState<{positions:Float32Array;indices:Uint32Array}|null>(null);
  const [segmenting, setSegmenting] = useState(false);
  const [segmentationError, setSegmentationError] = useState('');
  const [targetPixel, setTargetPixel] = useState<{slice:typeof selected; row:number;col:number}|null>(null);
  const [targetPoint, setTargetPoint] = useState<number[]|null>(null);
  const [mprPoint, setMprPoint] = useState<number[]|null>(null);
  const [registration, setRegistration] = useState<{matrix:number[];modelVariant:'male'|'female'}|null>(null);
  const [overlaySystems, setOverlaySystems] = useState<OverlaySystem[]>(['nervous', 'cardiovascular']);
  const [overlayClip, setOverlayClip] = useState<OverlayClip>('volume');
  const [previewIndex, setPreviewIndex] = useState(0);
  const previewHost = useRef<HTMLDivElement>(null);
  const worker = useRef<Worker|null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const loadRevision = useRef(0);
  const automaticLoad = useRef<AbortController | null>(null);
  const current = series[seriesIndex];
  const selected = current?.slices[sliceIndex];
  const eligibility = useMemo(() => current ? validateCtSegmentation(current) : {eligible:false}, [current]);
  useEffect(() => {
    worker.current?.terminate(); worker.current = null;
    const middle = current ? pixelCenter(current.slices[Math.floor(current.slices.length / 2)], Math.floor(current.rows / 2), Math.floor(current.columns / 2)) ?? null : null;
    setSurface(null); setSegmenting(false); setSegmentationError(''); setTargetPoint(null); setTargetPixel(null); setMprPoint(middle); setRegistration(null);
    return () => { worker.current?.terminate(); worker.current = null; };
  }, [current]);
  useEffect(() => { setRegistration(null); }, [modelVariant]);
  const generateSurface = () => {
    if (!current || !eligibility.eligible) return;
    worker.current?.terminate();
    const task = new Worker(new URL('./ct-segmentation.worker.ts', import.meta.url), {type:'module'});
    worker.current = task; setSegmenting(true); setSegmentationError(''); setSurface(null);
    task.onmessage = event => {
      if (worker.current !== task) return;
      if (event.data.error) setSegmentationError(event.data.error);
      else if (!event.data.surface.indices.length) setSegmentationError('Nenhuma estrutura acima deste limiar. Reduza o valor e tente novamente.');
      else setSurface(event.data.surface);
      setSegmenting(false); task.terminate(); worker.current = null;
    };
    task.onerror = () => { setSegmentationError('O processamento local falhou.'); setSegmenting(false); task.terminate(); worker.current = null; };
    task.postMessage({series:current, threshold});
  };
  const range = useMemo(() => current ? intensityRange(current) : [0, 1] as const, [current]);
  const defaultWindow = useMemo(() => {
    if (!current) return { center: 0, width: 1 };
    const slice = current.slices[0];
    return { center: slice.windowCenter ?? (range[0] + range[1]) / 2, width: slice.windowWidth ?? Math.max(1, range[1] - range[0]) };
  }, [current, range]);
  const wc = center ?? defaultWindow.center;
  const ww = Math.max(1, width ?? defaultWindow.width);

  useEffect(() => {
    setSliceIndex(Math.floor((current?.slices.length ?? 1) / 2));
    setCenter(null);
    setWidth(null);
  }, [seriesIndex, current?.id]);
  useEffect(() => {
    const fraction = current && selected ? sliceFraction(current.slices, selected) : undefined;
    if (!selected || !current?.plane || fraction === undefined) {
      onSlice(atlasSliceForSequence(casePreview?.acquisition, previewIndex, casePreview?.images.length ?? 0));
      return;
    }
    onSlice({ plane: current.plane, fraction, region });
  }, [casePreview, current, onSlice, previewIndex, region, selected, sliceIndex]);
  useEffect(() => { setPreviewIndex(0); }, [casePreview?.id]);
  useEffect(() => {
    const target = previewHost.current;
    if (!target || current || !casePreview?.images.length) return;
    let distance = 0;
    const navigate = (event: WheelEvent) => {
      event.preventDefault(); event.stopPropagation(); distance += event.deltaY || event.deltaX;
      if (Math.abs(distance) < 24) return;
      const direction = distance > 0 ? 1 : -1; distance = 0;
      setPreviewIndex(value => Math.max(0, Math.min(casePreview.images.length - 1, value + direction)));
    };
    target.addEventListener('wheel', navigate, {passive:false});
    return () => target.removeEventListener('wheel', navigate);
  }, [casePreview, current]);
  useEffect(() => {
    const target = canvas.current;
    if (!target || !selected) return;
    target.width = selected.columns;
    target.height = selected.rows;
    const context = target.getContext('2d');
    if (!context) return;
    const image = context.createImageData(selected.columns, selected.rows);
    const lower = wc - ww / 2;
    for (let i = 0; i < selected.pixels.length; i++) {
      let gray = Math.round(((selected.pixels[i] * selected.slope + selected.intercept - lower) / ww) * 255);
      gray = Math.max(0, Math.min(255, gray));
      if (selected.invert) gray = 255 - gray;
      image.data[i * 4] = image.data[i * 4 + 1] = image.data[i * 4 + 2] = gray;
      image.data[i * 4 + 3] = 255;
    }
    context.putImageData(image, 0, 0);
    if (targetPixel?.slice === selected) {
      context.strokeStyle = '#00ffff'; context.lineWidth = Math.max(0.2, selected.columns / 250);
      const {row, col} = targetPixel, arm = Math.max(1, selected.columns / 35);
      context.beginPath(); context.moveTo(col + .5 - arm, row + .5); context.lineTo(col + .5 + arm, row + .5);
      context.moveTo(col + .5, row + .5 - arm); context.lineTo(col + .5, row + .5 + arm); context.stroke();
    }
  }, [selected, wc, ww, targetPixel]);
  useEffect(() => {
    const target = canvas.current;
    if (!target || !current) return;
    const navigate = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const delta = event.deltaY || event.deltaX;
      if (!delta) return;
      setSliceIndex((value) =>
        Math.max(
          0,
          Math.min(current.slices.length - 1, value + (delta > 0 ? 1 : -1)),
        ),
      );
    };
    target.addEventListener('wheel', navigate, { passive: false });
    return () => target.removeEventListener('wheel', navigate);
  }, [current]);

  const openFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    automaticLoad.current?.abort();
    automaticLoad.current = null;
    const revision = ++loadRevision.current;
    setLoading(true);
    try {
      const result = await parseDicomFiles(Array.from(fileList));
      if (revision !== loadRevision.current) return;
      setSeries(result.series);
      setSeriesIndex(0);
      setErrors(result.errors);
    } catch (error) {
      if (revision === loadRevision.current)
        setErrors([error instanceof Error ? error.message : 'Falha ao carregar os arquivos.']);
    } finally { if (revision === loadRevision.current) setLoading(false); }
  };
  useEffect(() => {
    const revision = ++loadRevision.current;
    automaticLoad.current?.abort();
    automaticLoad.current = null;
    if (!dicomFiles?.length) { setLoading(false); return; }
    const controller = new AbortController();
    automaticLoad.current = controller;
    let active = true;
    setLoading(true); setErrors([]); setSeries([]); setSliceIndex(0);
    void (async () => {
      try {
        if (dicomFiles.length > 400 || !dicomFiles.every(path => /^\/radiology\/[a-zA-Z0-9/_-]+\.dcm$/.test(path))) throw new Error('Lista de arquivos DICOM inválida.');
        const files: File[] = []; let total = 0;
        for (const path of dicomFiles) {
          const response = await fetch(path, { signal: controller.signal });
          if (!response.ok) throw new Error('Não foi possível carregar a série deste caso.');
          const declared = Number(response.headers.get('content-length'));
          if (Number.isFinite(declared) && declared > MAX_DICOM_BYTES - total) throw new Error('A série excede o limite de 500 MB.');
          if (!response.body) {
            const bytes = await response.arrayBuffer(); total += bytes.byteLength;
            if (total > MAX_DICOM_BYTES) throw new Error('A série excede o limite de 500 MB.');
            files.push(new File([bytes], path.split('/').pop()!, {type:'application/dicom'}));
            continue;
          }
          const reader = response.body.getReader(); const chunks: Uint8Array<ArrayBuffer>[] = [];
          while (true) { const {done, value} = await reader.read(); if (done) break; total += value.byteLength; if (total > MAX_DICOM_BYTES) { await reader.cancel(); throw new Error('A série excede o limite de 500 MB.'); } chunks.push(value as Uint8Array<ArrayBuffer>); }
          files.push(new File(chunks, path.split('/').pop()!, {type:'application/dicom'}));
        }
        const result = await parseDicomFiles(files);
        if (active && revision === loadRevision.current) { setSeries(result.series); setSeriesIndex(0); setErrors(result.errors); }
      } catch (error) { if (active && revision === loadRevision.current && !(error instanceof DOMException && error.name === 'AbortError')) setErrors([error instanceof Error ? error.message : 'Falha ao carregar a série.']); }
      finally { if (active && revision === loadRevision.current) setLoading(false); }
    })();
    return () => {
      active = false;
      controller.abort();
      if (automaticLoad.current === controller) automaticLoad.current = null;
    };
  }, [dicomFiles]);
  const clear = () => {
    ++loadRevision.current;
    automaticLoad.current?.abort();
    automaticLoad.current = null;
    setLoading(false); setSeries([]); setSeriesIndex(0); setSliceIndex(0);
    setErrors([]); setCenter(null); setWidth(null);
  };
  const move = (delta: number) => setSliceIndex((value) => Math.max(0, Math.min((current?.slices.length ?? 1) - 1, value + delta)));
  const toggleOverlay = (system: OverlaySystem) => setOverlaySystems((currentSystems) =>
    currentSystems.includes(system)
      ? currentSystems.filter((item) => item !== system)
      : [...currentSystems, system],
  );

  return <section className="imaging-workbench" aria-label="Leitor local de DICOM">
    <header><small>DO CORPO À IMAGEM</small><h2>Atlas e imagens integrados</h2><p>Explore o caso e a anatomia lado a lado. Importe uma série DICOM completa para liberar as reconstruções axial, coronal e sagital.</p></header>
    <div className="image-tools">
      <label>Selecionar série<input aria-label="Selecionar arquivos DICOM" type="file" accept=".dcm,application/dicom" multiple onChange={(event) => void openFiles(event.target.files)} /></label>
      {loading && <span>Processando localmente…</span>}
      {current && <button onClick={clear}>Limpar imagens</button>}
      {current && <><button onClick={() => move(-1)} disabled={sliceIndex === 0}>← Corte anterior</button><button onClick={() => move(1)} disabled={sliceIndex === current.slices.length - 1}>Próximo corte →</button></>}
    </div>
    {errors.length > 0 && <div className="error" role="alert">{errors.map((error) => <div key={error}>{error}</div>)}</div>}
    {!current && casePreview && <section className="case-imaging-preview" aria-label="Imagens do caso selecionado">
      <nav className="modality-tabs" aria-label="Modalidades">{(['TC','RM','RX'] as const).map(modality => <button key={modality} className={casePreview.modality === modality ? 'active' : ''} onClick={() => onPreviewModality?.(modality)}>{modality}</button>)}<button disabled>USG</button><button disabled>PET</button></nav>
      <div className="preview-title"><div><small>CASO REAL · RADIOPAEDIA</small><h3>{casePreview.title}</h3></div><span>{previewIndex + 1} / {casePreview.images.length}</span></div>
      <div className="preview-stage" ref={previewHost}>
        <img src={casePreview.images[previewIndex]?.src} alt={`${casePreview.images[previewIndex]?.label}. Caso ${casePreview.id}, ${casePreview.author}, Radiopaedia.org.`} />
        <span className="preview-plane">{casePreview.images[previewIndex]?.label}</span>
        <span className="preview-orientation top">A</span><span className="preview-orientation bottom">P</span><span className="preview-orientation left">R</span><span className="preview-orientation right">L</span>
      </div>
      <div className="preview-filmstrip">{casePreview.images.map((image, index) => <button key={image.src} className={index === previewIndex ? 'active' : ''} onClick={() => setPreviewIndex(index)} aria-label={`Abrir ${image.label}`}><img src={image.src} alt="" /><span>{index + 1}</span></button>)}</div>
      <div className="preview-notice"><strong>{casePreview.acquisition?.kind === 'ordered-series' ? 'Pilha navegável sincronizada ao Atlas' : 'Imagem clínica de referência'}</strong><p>{casePreview.acquisition?.kind === 'ordered-series' ? 'Role sobre a imagem para percorrer os cortes. O plano do Atlas acompanha a posição relativa desta pilha renderizada.' : 'Esta seleção não contém geometria suficiente para reconstrução multiplanar.'}</p><a href={casePreview.source} target="_blank" rel="noreferrer">Abrir caso original ↗</a></div>
    </section>}
    {!current && !casePreview && <p className="plane-status">Selecione todos os arquivos de uma aquisição para agrupá-los por série e ordená-los pela posição física quando disponível.</p>}
    {current && <>
      {series.length > 1 && <label> Série <select aria-label="Selecionar série DICOM" value={seriesIndex} onChange={(event) => setSeriesIndex(Number(event.target.value))}>{series.map((item, index) => <option value={index} key={item.id}>{item.modality} · série {index + 1} · {item.slices.length} cortes</option>)}</select></label>}
      <details className="source-image-panel"><summary>Imagem adquirida · selecionar marco para alinhamento</summary><div className="series-image">
        <canvas className="dicom-canvas" ref={canvas} onClick={event => {
          if (!selected || !sliceFrame(selected)) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          const col = Math.max(0, Math.min(selected.columns-1, Math.floor((event.clientX-bounds.left)/bounds.width*selected.columns)));
          const row = Math.max(0, Math.min(selected.rows-1, Math.floor((event.clientY-bounds.top)/bounds.height*selected.rows)));
          setTargetPixel({slice:selected, row, col});
          const point = pixelCenter(selected, row, col) ?? null;
          setTargetPoint(point); setMprPoint(point);
        }} aria-label={`Imagem ${current.modality}, corte ${sliceIndex + 1} de ${current.slices.length}`} />
      </div></details>
      <div className="slice-controls">
        <label>Corte {sliceIndex + 1} de {current.slices.length}<input aria-label="Selecionar corte" type="range" min="0" max={Math.max(0, current.slices.length - 1)} value={sliceIndex} onChange={(event) => setSliceIndex(Number(event.target.value))} /></label>
        <label>Centro da janela {Math.round(wc)}<input aria-label="Centro da janela" type="range" min={Math.floor(range[0])} max={Math.ceil(range[1])} value={wc} onChange={(event) => setCenter(Number(event.target.value))} /></label>
        <label>Largura da janela {Math.round(ww)}<input aria-label="Largura da janela" type="range" min="1" max={Math.max(1, Math.ceil(range[1] - range[0]))} value={ww} onChange={(event) => setWidth(Number(event.target.value))} /></label>
      </div>
      <Suspense fallback={<p className="plane-status">Preparando reconstruções…</p>}>
        <TriPlanarViewer series={current} slice={sliceIndex} windowCenter={wc} windowWidth={ww} onSlice={setSliceIndex} onPatientPoint={point => { setTargetPoint(point); setMprPoint(point); }} spatialView={<Suspense fallback={<p>Preparando volume…</p>}><PatientSlices series={current} index={sliceIndex} windowCenter={wc} windowWidth={ww} onIndex={setSliceIndex} surface={surface ?? undefined} registration={registration} cursorPoint={mprPoint} overlaySystems={overlaySystems} overlayClip={overlayClip} /></Suspense>} />
      </Suspense>
      <section className="overlay-panel" aria-label="Sobreposição anatômica registrada">
        <h3>Sobreposição neurovascular 3D</h3>
        <p>Escolha as estruturas do atlas que aparecerão no espaço do exame após o ajuste por marcos.</p>
        <div className="overlay-systems">
          {([['nervous', 'Encéfalo e nervos'], ['cardiovascular', 'Artérias e vasos'], ['skeletal', 'Esqueleto']] as const).map(([system, label]) => <button key={system} aria-pressed={overlaySystems.includes(system)} className={overlaySystems.includes(system) ? `active ${system}` : ''} onClick={() => toggleOverlay(system)}>{label}</button>)}
        </div>
        <label>Recorte anatômico<select aria-label="Plano de recorte da sobreposição" value={overlayClip} onChange={(event) => setOverlayClip(event.target.value as OverlayClip)}><option value="volume">Volume completo</option><option value="axial">Lâmina axial</option><option value="coronal">Lâmina coronal</option><option value="sagital">Lâmina sagital</option></select></label>
        {!registration && <p className="plane-status">Adicione três ou mais pares de marcos abaixo e faça o ajuste para posicionar a anatomia no exame.</p>}
        {registration && <p className="plane-status">Sobreposição ativa. Mova a mira nas reconstruções para deslocar o recorte selecionado.</p>}
      </section>
      <details className="advanced-imaging"><summary>Superfície de alta densidade · ajustes</summary><div className="segmentation-panel">
        <h3>Superfície 3D da TC</h3>
        <p>Separa voxels de alta densidade, como osso. Contraste e outros materiais também podem aparecer. A superfície acompanha as coordenadas dos cortes; não identifica órgãos automaticamente.</p>
        <label>Limiar de densidade (HU) <input aria-label="Limiar de densidade" type="number" min="-1000" max="3000" value={threshold} onChange={event => setThreshold(Number(event.target.value))} /></label>
        <div className="image-tools"><button disabled={!eligibility.eligible || segmenting || !Number.isFinite(threshold)} onClick={generateSurface}>{segmenting ? 'Gerando superfície…' : 'Gerar superfície 3D'}</button>
        {segmenting && <button onClick={() => {worker.current?.terminate();worker.current=null;setSegmenting(false);}}>Cancelar</button>}
        {surface && <button onClick={() => setSurface(null)}>Ocultar superfície</button>}</div>
        {!eligibility.eligible && <p>{eligibility.reason}</p>}
        {segmentationError && <p role="alert">{segmentationError}</p>}
        {surface && <p>Superfície gerada · {(surface.indices.length/3).toLocaleString('pt-BR')} triângulos. Amostragem limitada a 128 voxels por eixo; detalhes pequenos podem se fundir ou aumentar.</p>}
      </div></details>
      <LandmarkPanel series={current} atlasPoint={atlasPoint} targetPoint={targetPoint} modelVariant={modelVariant} onRegistration={setRegistration} />
      <label>Região de referência no atlas<select aria-label="Selecionar região no atlas" value={region} onChange={(event) => setRegion(event.target.value as Region)}><option value="head">Cabeça</option><option value="thorax">Tórax</option><option value="abdomen">Abdome</option><option value="body">Corpo</option></select></label>
      <p className="plane-status">Plano adquirido: {current.plane ?? 'não determinável'}. O atlas lateral usa uma referência anatômica genérica. O ajuste manual, quando aplicado, aparece apenas no visor espacial dos cortes e tem precisão limitada aos pontos escolhidos. As reconstruções ortogonais usam os voxels da série carregada.</p>
    </>}
  </section>;
}

export { groupDicomSeries };
