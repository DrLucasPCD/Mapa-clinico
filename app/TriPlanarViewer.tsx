import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import type { DicomSeries } from './dicom';
import { pixelCenter } from './patient-geometry';
import { cursorFromView, mprGeometry, regularVolumeGrid, viewDimensions, viewPixelIndex, viewSliceIndex, viewVoxel, type MprCursor, type MprView } from './mpr';
import { brushSpacing, lesionColor, type BrushPoint, type LesionSurface } from './lesion-mask';
import { useLesionStudy } from './useLesionStudy';
import LesionControls from './LesionControls';

type Props = {
  spatialView?: ReactNode;
  keepCursor?: boolean;
  series: DicomSeries;
  slice: number;
  windowCenter: number;
  windowWidth: number;
  onSlice: (index: number) => void;
  onPatientPoint: (point: number[]) => void;
  onCursorChange: (point: number[]) => void;
  onLesionSurface?: (series: DicomSeries, surface: LesionSurface | null) => void;
  onActivePlane?: (view: MprView) => void;
  activePlane?: MprView;
};

const views: MprView[] = ['source', 'row', 'column'];
type MeasurePoint = { view: MprView; index: number; x: number; y: number; patient: number[] };
type Stroke = { pointerId: number; view: MprView; cursor: MprCursor; points: BrushPoint[] };
const relativePoint = (event: MouseEvent<HTMLCanvasElement>) => {
  const bounds = event.currentTarget.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return null;
  return { x: (event.clientX - bounds.left) / bounds.width, y: (event.clientY - bounds.top) / bounds.height };
};

export default function TriPlanarViewer({ series, slice, windowCenter, windowWidth, onSlice, onPatientPoint, onCursorChange, spatialView, keepCursor = false, onLesionSurface, activePlane = 'source', onActivePlane }: Props) {
  const safeSlice = Math.max(0, Math.min(series.slices.length - 1, slice));
  const geometry = useMemo(() => {
    const aligned = mprGeometry(series);
    if (aligned || !onLesionSurface) return aligned;
    const grid = regularVolumeGrid(series);
    return grid && { stepMm: grid.stepMm, labels: { source: 'Plano de aquisição', row: 'Ortogonal 1', column: 'Ortogonal 2' } };
  }, [series, onLesionSurface]);
  const study = useLesionStudy(series, Boolean(geometry && onLesionSurface), onLesionSurface);
  const { mask, shown, tool } = study;
  const drawing = useRef<Stroke | null>(null);
  const [trail, setTrail] = useState<Stroke | null>(null);
  const [cursor, setCursor] = useState<MprCursor>({ column: Math.floor(series.columns / 2), row: Math.floor(series.rows / 2), slice: safeSlice });
  const [measureMode, setMeasureMode] = useState(false);
  const [measureStart, setMeasureStart] = useState<MeasurePoint | null>(null);
  const [measureEnd, setMeasureEnd] = useState<MeasurePoint | null>(null);
  const canvases = useRef<Record<MprView, HTMLCanvasElement | null>>({ source: null, row: null, column: null });
  useEffect(() => { if (keepCursor) return; setCursor({ column: Math.floor(series.columns / 2), row: Math.floor(series.rows / 2), slice: safeSlice }); setMeasureStart(null); setMeasureEnd(null); }, [series, keepCursor]);
  useEffect(() => setCursor(current => current.slice === safeSlice ? current : { ...current, slice: safeSlice }), [safeSlice]);
  useEffect(() => {
    const frame = series.slices[cursor.slice];
    if (!frame) return;
    const point = pixelCenter(frame,cursor.row,cursor.column);
    if (point) onCursorChange(point);
  }, [series,cursor,onCursorChange]);

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
        const marked = shown && mask.get(viewSliceIndex(view, cursor, y))?.[viewPixelIndex(series.columns, view, cursor, x, y)];
        image.data[offset] = marked ? gray * .53 + 255 * .47 : gray;
        image.data[offset + 1] = marked ? gray * .53 + 155 * .47 : gray;
        image.data[offset + 2] = marked ? gray * .53 + 83 * .47 : gray;
        image.data[offset + 3] = 255;
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
  }, [cursor, geometry, mask, shown, measureEnd, measureStart, series, windowCenter, windowWidth]);

  const select = (view: MprView, event: MouseEvent<HTMLCanvasElement>) => {
    if (tool !== 'navigate') return;
    const position = relativePoint(event);
    if (!position) return;
    const { x, y } = position;
    onActivePlane?.(view);
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
  const brushPoint = (view: MprView, event: PointerEvent<HTMLCanvasElement>) => {
    const position = relativePoint(event);
    if (!position) return null;
    const size = viewDimensions(series, view);
    return {
      x: Math.max(0, Math.min(size.width - 1, Math.floor(position.x * size.width))),
      y: Math.max(0, Math.min(size.height - 1, Math.floor(position.y * size.height))),
    };
  };
  const beginStroke = (view: MprView, event: PointerEvent<HTMLCanvasElement>) => {
    if (tool === 'navigate' || event.button !== 0 || drawing.current) return;
    const point = brushPoint(view, event);
    if (!point) return;
    onActivePlane?.(view);
    event.currentTarget.setPointerCapture(event.pointerId);
    setMeasureMode(false); setMeasureStart(null); setMeasureEnd(null);
    drawing.current = { view, cursor, pointerId: event.pointerId, points: [point] };
    setTrail(drawing.current);
  };
  const extendStroke = (event: PointerEvent<HTMLCanvasElement>) => {
    const active = drawing.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const point = brushPoint(active.view, event), last = active.points.at(-1);
    if (!point || (point.x === last?.x && point.y === last?.y)) return;
    active.points.push(point);
    setTrail({ ...active });
  };
  const endStroke = (event: PointerEvent<HTMLCanvasElement>, commit: boolean) => {
    const active = drawing.current;
    if (!active || active.pointerId !== event.pointerId) return;
    drawing.current = null; setTrail(null);
    if (!commit || !geometry) return;
    const last = brushPoint(active.view, event);
    if (last) active.points.push(last);
    study.stroke(active.view, active.cursor, active.points, geometry.stepMm);
  };
  const scroll = (view: MprView, delta: number) => {
    if (!delta || drawing.current) return;
    onActivePlane?.(view);
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
  }, [cursor, geometry, onActivePlane, onPatientPoint, onSlice, series]);

  if (!geometry) return <><p className="plane-status">Reconstruções ortogonais indisponíveis: a série precisa de ao menos dois cortes paralelos, regulares e com geometria DICOM completa.</p>{spatialView}</>;
  const first = series.slices[0];
  const ratios: Record<MprView, number> = {
    source: series.columns * first.pixelSpacing![1] / (series.rows * first.pixelSpacing![0]),
    row: series.columns * first.pixelSpacing![1] / (series.slices.length * geometry.stepMm),
    column: series.rows * first.pixelSpacing![0] / (series.slices.length * geometry.stepMm),
  };
  const distance = measureStart && measureEnd ? Math.hypot(...measureStart.patient.map((value, index) => value - measureEnd.patient[index])) : null;
  const location = pixelCenter(series.slices[cursor.slice], cursor.row, cursor.column);
  return <section className="mpr-viewer" aria-label="Reconstruções multiplanares sincronizadas">
    <header><small>RECONSTRUÇÃO MULTIPLANAR</small><h3>Três planos sincronizados</h3><p>Clique para mover a mira. Role o mouse sobre uma imagem para navegar pelos cortes daquele plano; as três vistas e o volume 3D acompanham.</p></header>
    <div className="mpr-measure-tools"><button aria-pressed={measureMode && tool === 'navigate'} onClick={() => { study.setTool('navigate'); setMeasureMode(value => tool !== 'navigate' || !value); setMeasureStart(null); setMeasureEnd(null); }}>{measureMode && tool === 'navigate' ? '✓ Medir distância' : 'Medir distância'}</button>{measureStart && <button onClick={() => { setMeasureStart(null); setMeasureEnd(null); }}>Limpar medida</button>}<span role="status">{distance !== null ? `${distance.toFixed(1)} mm entre os pontos` : measureMode && tool === 'navigate' ? 'Clique em dois pontos no mesmo plano.' : 'Geometria DICOM em milímetros.'}</span></div>
    {onLesionSurface && <LesionControls study={study} />}
    <div className="mpr-grid">{views.map(view => {
      const size = viewDimensions(series, view);
      const [dx, dy] = brushSpacing(series, view, geometry.stepMm);
      const stroke = trail?.view === view ? trail.points : null;
      return <figure key={view} className={activePlane === view ? 'mpr-active-plane' : undefined}>
        <div className="mpr-image" style={{ aspectRatio: ratios[view], width: `min(100%, calc(var(--mpr-max-height, 260px) * ${ratios[view]}))` }}>
          <canvas ref={node => { canvases.current[view] = node; }} onClick={event => select(view, event)}
            onPointerDown={event => beginStroke(view, event)} onPointerMove={extendStroke}
            onPointerUp={event => endStroke(event, true)} onPointerCancel={event => endStroke(event, false)}
            onLostPointerCapture={event => endStroke(event, false)}
            style={tool === 'navigate' ? undefined : { touchAction: 'none' }}
            aria-label={`Reconstrução ${geometry.labels[view]}. Role para navegar pelos cortes.`} />
          {stroke && <svg className="lesion-preview" aria-hidden="true" viewBox={`0 0 ${size.width * dx} ${size.height * dy}`}>
            <polyline points={stroke.map(({ x, y }) => `${(x + .5) * dx},${(y + .5) * dy}`).join(' ')}
              fill="none" stroke={tool === 'paint' ? lesionColor : '#d3f9ff'} strokeWidth={study.radius * 2} strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={(stroke[0].x + .5) * dx} cy={(stroke[0].y + .5) * dy} r={study.radius} fill={tool === 'paint' ? lesionColor : '#d3f9ff'} />
          </svg>}
        </div>
        <figcaption>{geometry.labels[view]} · {view === 'source' ? 'adquirida' : 'reconstruída'}</figcaption>
      </figure>;
    })}{spatialView && <div className="mpr-spatial"><div className="spatial-heading">Espaço do exame · 3D</div>{spatialView}</div>}</div>
    {location && <small>Mira em milímetros LPS · {location.map(value => value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })).join(' / ')}</small>}
    <small>As imagens usam o espaçamento físico dos voxels da série.</small>
  </section>;
}
