import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import type { DicomSeries } from './dicom';
import { pixelCenter } from './patient-geometry';
import { cursorFromView, mprGeometry, viewDimensions, viewVoxel, type MprCursor, type MprView } from './mpr';

type Props = {
  spatialView?: ReactNode;
  series: DicomSeries;
  slice: number;
  windowCenter: number;
  windowWidth: number;
  onSlice: (index: number) => void;
  onPatientPoint: (point: number[]) => void;
};

const views: MprView[] = ['source', 'row', 'column'];
type MeasurePoint = { view: MprView; index: number; x: number; y: number; patient: number[] };

export default function TriPlanarViewer({ series, slice, windowCenter, windowWidth, onSlice, onPatientPoint, spatialView }: Props) {
  const geometry = useMemo(() => mprGeometry(series), [series]);
  const [cursor, setCursor] = useState<MprCursor>({ column: Math.floor(series.columns / 2), row: Math.floor(series.rows / 2), slice });
  const [measureMode, setMeasureMode] = useState(false);
  const [measureStart, setMeasureStart] = useState<MeasurePoint | null>(null);
  const [measureEnd, setMeasureEnd] = useState<MeasurePoint | null>(null);
  const canvases = useRef<Record<MprView, HTMLCanvasElement | null>>({ source: null, row: null, column: null });
  useEffect(() => { setCursor({ column: Math.floor(series.columns / 2), row: Math.floor(series.rows / 2), slice }); setMeasureStart(null); setMeasureEnd(null); }, [series]);
  useEffect(() => setCursor(current => current.slice === slice ? current : { ...current, slice }), [slice]);

  useEffect(() => {
    if (!geometry) return;
    for (const view of views) {
      const canvas = canvases.current[view];
      if (!canvas) continue;
      const size = viewDimensions(series, view);
      canvas.width = size.width; canvas.height = size.height;
      const context = canvas.getContext('2d');
      if (!context) continue;
      const image = context.createImageData(size.width, size.height);
      const low = windowCenter - windowWidth / 2;
      for (let y = 0; y < size.height; y++) for (let x = 0; x < size.width; x++) {
        const value = viewVoxel(series, view, cursor, x, y);
        let gray = Math.max(0, Math.min(255, Math.round((value - low) / windowWidth * 255)));
        if (series.slices[0].invert) gray = 255 - gray;
        const offset = (y * size.width + x) * 4;
        image.data[offset] = image.data[offset + 1] = image.data[offset + 2] = gray; image.data[offset + 3] = 255;
      }
      context.putImageData(image, 0, 0);
      const cross = view === 'source' ? [cursor.column, cursor.row] : view === 'row' ? [cursor.column, cursor.slice] : [cursor.row, cursor.slice];
      context.strokeStyle = '#19f4f4'; context.lineWidth = Math.max(.5, size.width / 450);
      context.beginPath(); context.moveTo(cross[0] + .5, 0); context.lineTo(cross[0] + .5, size.height);
      context.moveTo(0, cross[1] + .5); context.lineTo(size.width, cross[1] + .5); context.stroke();
      if (measureStart?.view === view) {
        const startX = measureStart.x * size.width, startY = measureStart.y * size.height;
        context.fillStyle = '#ffe06d'; context.strokeStyle = '#ffe06d'; context.lineWidth = Math.max(1, size.width / 300);
        context.beginPath(); context.arc(startX, startY, Math.max(2, size.width / 130), 0, 2 * Math.PI); context.fill();
        if (measureEnd?.view === view) {
          const endX = measureEnd.x * size.width, endY = measureEnd.y * size.height;
          context.beginPath(); context.moveTo(startX, startY); context.lineTo(endX, endY); context.stroke();
          context.beginPath(); context.arc(endX, endY, Math.max(2, size.width / 130), 0, 2 * Math.PI); context.fill();
        }
      }
    }
  }, [cursor, geometry, measureEnd, measureStart, series, windowCenter, windowWidth]);

  const select = (view: MprView, event: MouseEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const imageScale = Math.min(bounds.width / event.currentTarget.width, bounds.height / event.currentTarget.height);
    const imageWidth = event.currentTarget.width * imageScale, imageHeight = event.currentTarget.height * imageScale;
    const left = bounds.left + (bounds.width - imageWidth) / 2, top = bounds.top + (bounds.height - imageHeight) / 2;
    if (event.clientX < left || event.clientX > left + imageWidth || event.clientY < top || event.clientY > top + imageHeight) return;
    const x = Math.max(0, Math.min(1, (event.clientX - left) / imageWidth));
    const y = Math.max(0, Math.min(1, (event.clientY - top) / imageHeight));
    const next = cursorFromView(series, view, cursor, x, y);
    setCursor(next); onSlice(next.slice);
    const point = pixelCenter(series.slices[next.slice], next.row, next.column);
    if (point) {
      onPatientPoint(point);
      if (measureMode) {
        const mark = { view, index: view === 'source' ? next.slice : view === 'row' ? next.row : next.column, x, y, patient: point };
        if (!measureStart || measureEnd || measureStart.view !== view || measureStart.index !== mark.index) { setMeasureStart(mark); setMeasureEnd(null); }
        else setMeasureEnd(mark);
      }
    }
  };
  const scroll = (view: MprView, delta: number) => {
    if (!delta) return;
    if (measureMode) { setMeasureStart(null); setMeasureEnd(null); }
    const step = delta > 0 ? 1 : -1;
    const next = {
      ...cursor,
      slice: view === 'source' ? Math.max(0, Math.min(series.slices.length - 1, cursor.slice + step)) : cursor.slice,
      row: view === 'row' ? Math.max(0, Math.min(series.rows - 1, cursor.row + step)) : cursor.row,
      column: view === 'column' ? Math.max(0, Math.min(series.columns - 1, cursor.column + step)) : cursor.column,
    };
    setCursor(next);
    onSlice(next.slice);
    const point = pixelCenter(series.slices[next.slice], next.row, next.column);
    if (point) onPatientPoint(point);
  };
  useEffect(() => {
    if (!geometry) return;
    const listeners: Array<[HTMLCanvasElement, (event: WheelEvent) => void]> = [];
    for (const view of views) {
      const canvas = canvases.current[view];
      if (!canvas) continue;
      const navigate = (event: WheelEvent) => {
        event.preventDefault();
        event.stopPropagation();
        scroll(view, event.deltaY || event.deltaX);
      };
      canvas.addEventListener('wheel', navigate, { passive: false });
      listeners.push([canvas, navigate]);
    }
    return () => listeners.forEach(([canvas, navigate]) => canvas.removeEventListener('wheel', navigate));
  }, [cursor, geometry, onPatientPoint, onSlice, series]);

  if (!geometry) return <><p className="plane-status">Reconstruções ortogonais indisponíveis: a série precisa de ao menos dois cortes paralelos, regulares e com geometria DICOM completa.</p>{spatialView}</>;
  const first = series.slices[0];
  const ratios: Record<MprView, number> = {
    source: series.columns * first.pixelSpacing![1] / (series.rows * first.pixelSpacing![0]),
    row: series.columns * first.pixelSpacing![1] / (series.slices.length * geometry.stepMm),
    column: series.rows * first.pixelSpacing![0] / (series.slices.length * geometry.stepMm),
  };
  const distance = measureStart && measureEnd ? Math.hypot(...measureStart.patient.map((value, index) => value - measureEnd.patient[index])) : null;
  return <section className="mpr-viewer" aria-label="Reconstruções multiplanares sincronizadas">
    <header><small>RECONSTRUÇÃO MULTIPLANAR</small><h3>Três planos sincronizados</h3><p>Clique para mover a mira. Role o mouse sobre uma imagem para navegar pelos cortes daquele plano; as três vistas e o volume 3D acompanham.</p></header>
    <div className="mpr-measure-tools"><button aria-pressed={measureMode} onClick={() => { setMeasureMode(value => !value); setMeasureStart(null); setMeasureEnd(null); }}>{measureMode ? '✓ Medir distância' : 'Medir distância'}</button>{measureStart && <button onClick={() => { setMeasureStart(null); setMeasureEnd(null); }}>Limpar medida</button>}<span role="status">{distance !== null ? `${distance.toFixed(1)} mm entre os pontos` : measureMode ? 'Clique em dois pontos no mesmo plano.' : 'Geometria DICOM em milímetros.'}</span></div>
    <div className="mpr-grid">{views.map(view => <figure key={view}>
      <canvas ref={node => { canvases.current[view] = node; }} onClick={event => select(view, event)} style={{ aspectRatio: String(ratios[view]) }} aria-label={`Reconstrução ${geometry.labels[view]}; use o scroll para navegar pelos cortes`} />
      <figcaption>{geometry.labels[view]} · {view === 'source' ? 'adquirida' : 'reconstruída'}</figcaption>
    </figure>)}{spatialView && <div className="mpr-spatial"><div className="spatial-heading">Espaço do exame · 3D</div>{spatialView}</div>}</div>
    <small>Reconstrução por vizinho mais próximo, sem interpolação diagnóstica. O aspecto usa o espaçamento físico dos voxels.</small>
  </section>;
}
