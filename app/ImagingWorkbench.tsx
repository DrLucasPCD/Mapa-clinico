import { useEffect, useMemo, useRef, useState } from 'react';
import { groupDicomSeries, parseDicomFiles, sliceFraction, type DicomSeries, type Plane, type Region } from './dicom';
import './study.css';

type SliceLocation = { plane: Plane; fraction: number; region: Region } | null;
type Props = { onSlice: (location: SliceLocation) => void };

function intensityRange(series: DicomSeries) {
  let low = Infinity, high = -Infinity;
  for (const slice of series.slices) for (const raw of slice.pixels) {
    const value = raw * slice.slope + slice.intercept;
    if (value < low) low = value;
    if (value > high) high = value;
  }
  return [low, high] as const;
}

export default function ImagingWorkbench({ onSlice }: Props) {
  const [series, setSeries] = useState<DicomSeries[]>([]);
  const [seriesIndex, setSeriesIndex] = useState(0);
  const [sliceIndex, setSliceIndex] = useState(0);
  const [region, setRegion] = useState<Region>('body');
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [center, setCenter] = useState<number | null>(null);
  const [width, setWidth] = useState<number | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const current = series[seriesIndex];
  const selected = current?.slices[sliceIndex];
  const range = useMemo(() => current ? intensityRange(current) : [0, 1] as const, [current]);
  const defaultWindow = useMemo(() => {
    if (!current) return { center: 0, width: 1 };
    const slice = current.slices[0];
    return { center: slice.windowCenter ?? (range[0] + range[1]) / 2, width: slice.windowWidth ?? Math.max(1, range[1] - range[0]) };
  }, [current, range]);
  const wc = center ?? defaultWindow.center;
  const ww = Math.max(1, width ?? defaultWindow.width);

  useEffect(() => {
    setSliceIndex(0);
    setCenter(null);
    setWidth(null);
  }, [seriesIndex, current?.id]);
  useEffect(() => {
    const fraction = current && selected ? sliceFraction(current.slices, selected) : undefined;
    if (!selected || !current?.plane || fraction === undefined) { onSlice(null); return; }
    onSlice({ plane: current.plane, fraction, region });
  }, [current, onSlice, region, selected, sliceIndex]);
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
  }, [selected, wc, ww]);

  const openFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setLoading(true);
    try {
      const result = await parseDicomFiles(Array.from(fileList));
      setSeries(result.series);
      setSeriesIndex(0);
      setErrors(result.errors);
    } finally { setLoading(false); }
  };
  const clear = () => { setSeries([]); setSeriesIndex(0); setSliceIndex(0); setErrors([]); setCenter(null); setWidth(null); };
  const move = (delta: number) => setSliceIndex((value) => Math.max(0, Math.min((current?.slices.length ?? 1) - 1, value + delta)));

  return <section className="imaging-workbench" aria-label="Leitor local de DICOM">
    <header><small>IMAGENS LOCAIS · CT E RM</small><h2>Leitor de séries DICOM</h2><p>Os arquivos são lidos somente neste dispositivo e não são enviados. Este leitor aceita imagens monocromáticas, sem compressão e de um quadro.</p></header>
    <div className="image-tools">
      <label>Selecionar série<input aria-label="Selecionar arquivos DICOM" type="file" accept=".dcm,application/dicom" multiple onChange={(event) => void openFiles(event.target.files)} /></label>
      {loading && <span>Processando localmente…</span>}
      {current && <button onClick={clear}>Limpar imagens</button>}
      {current && <><button onClick={() => move(-1)} disabled={sliceIndex === 0}>← Corte anterior</button><button onClick={() => move(1)} disabled={sliceIndex === current.slices.length - 1}>Próximo corte →</button></>}
    </div>
    {errors.length > 0 && <div className="error" role="alert">{errors.map((error) => <div key={error}>{error}</div>)}</div>}
    {!current && <p className="plane-status">Selecione todos os arquivos de uma aquisição para agrupá-los por série e ordená-los pela posição física quando disponível.</p>}
    {current && <>
      {series.length > 1 && <label> Série <select aria-label="Selecionar série DICOM" value={seriesIndex} onChange={(event) => setSeriesIndex(Number(event.target.value))}>{series.map((item, index) => <option value={index} key={item.id}>{item.modality} · série {index + 1} · {item.slices.length} cortes</option>)}</select></label>}
      <div className="series-image" onWheel={(event) => { event.preventDefault(); move(event.deltaY > 0 ? 1 : -1); }}>
        <canvas className="dicom-canvas" ref={canvas} aria-label={`Imagem ${current.modality}, corte ${sliceIndex + 1} de ${current.slices.length}`} />
      </div>
      <div className="slice-controls">
        <label>Corte {sliceIndex + 1} de {current.slices.length}<input aria-label="Selecionar corte" type="range" min="0" max={Math.max(0, current.slices.length - 1)} value={sliceIndex} onChange={(event) => setSliceIndex(Number(event.target.value))} /></label>
        <label>Centro da janela {Math.round(wc)}<input aria-label="Centro da janela" type="range" min={Math.floor(range[0])} max={Math.ceil(range[1])} value={wc} onChange={(event) => setCenter(Number(event.target.value))} /></label>
        <label>Largura da janela {Math.round(ww)}<input aria-label="Largura da janela" type="range" min="1" max={Math.max(1, Math.ceil(range[1] - range[0]))} value={ww} onChange={(event) => setWidth(Number(event.target.value))} /></label>
      </div>
      <label>Região de referência no atlas<select aria-label="Selecionar região no atlas" value={region} onChange={(event) => setRegion(event.target.value as Region)}><option value="head">Cabeça</option><option value="thorax">Tórax</option><option value="abdomen">Abdome</option><option value="body">Corpo</option></select></label>
      <p className="plane-status">Plano adquirido: {current.plane ?? 'não determinável'}. O atlas usa uma referência anatômica genérica; não há registro nem sobreposição com a imagem do paciente. Não são gerados planos reconstruídos.</p>
    </>}
  </section>;
}

export { groupDicomSeries };
