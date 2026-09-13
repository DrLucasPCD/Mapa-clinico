import { useEffect, useMemo, useRef, useState, type MouseEvent, type WheelEvent } from 'react';
import type { DicomSeries } from './dicom';
import { pixelCenter } from './patient-geometry';
import { cursorFromView, mprGeometry, viewDimensions, viewVoxel, type MprCursor, type MprView } from './mpr';

type Props = {
  series: DicomSeries;
  slice: number;
  windowCenter: number;
  windowWidth: number;
  onSlice: (index: number) => void;
  onPatientPoint: (point: number[]) => void;
};

const views: MprView[] = ['source', 'row', 'column'];

export default function TriPlanarViewer({ series, slice, windowCenter, windowWidth, onSlice, onPatientPoint }: Props) {
  const geometry = useMemo(() => mprGeometry(series), [series]);
  const [cursor, setCursor] = useState<MprCursor>({ column: Math.floor(series.columns / 2), row: Math.floor(series.rows / 2), slice });
  const canvases = useRef<Record<MprView, HTMLCanvasElement | null>>({ source: null, row: null, column: null });
  useEffect(() => setCursor({ column: Math.floor(series.columns / 2), row: Math.floor(series.rows / 2), slice }), [series]);
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
    }
  }, [cursor, geometry, series, windowCenter, windowWidth]);

  if (!geometry) return <p className="plane-status">Reconstruções ortogonais indisponíveis: a série precisa de ao menos dois cortes paralelos, regulares e com geometria DICOM completa.</p>;
  const select = (view: MprView, event: MouseEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const next = cursorFromView(series, view, cursor, (event.clientX - bounds.left) / bounds.width, (event.clientY - bounds.top) / bounds.height);
    setCursor(next); onSlice(next.slice);
    const point = pixelCenter(series.slices[next.slice], next.row, next.column);
    if (point) onPatientPoint(point);
  };
  const scroll = (view: MprView, event: WheelEvent<HTMLCanvasElement>) => {
    if (event.deltaY === 0) return;
    event.preventDefault();
    const step = event.deltaY > 0 ? 1 : -1;
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
  const first = series.slices[0];
  const ratios: Record<MprView, number> = {
    source: series.columns * first.pixelSpacing![1] / (series.rows * first.pixelSpacing![0]),
    row: series.columns * first.pixelSpacing![1] / (series.slices.length * geometry.stepMm),
    column: series.rows * first.pixelSpacing![0] / (series.slices.length * geometry.stepMm),
  };
  return <section className="mpr-viewer" aria-label="Reconstruções multiplanares sincronizadas">
    <header><small>RECONSTRUÇÃO MULTIPLANAR</small><h3>Três planos sincronizados</h3><p>Clique para mover a mira. Role o mouse sobre uma imagem para navegar pelos cortes daquele plano; as três vistas e o volume 3D acompanham.</p></header>
    <div className="mpr-grid">{views.map(view => <figure key={view}>
      <canvas ref={node => { canvases.current[view] = node; }} onClick={event => select(view, event)} onWheel={event => scroll(view, event)} style={{ aspectRatio: String(ratios[view]) }} aria-label={`Reconstrução ${geometry.labels[view]}; use o scroll para navegar pelos cortes`} />
      <figcaption>{geometry.labels[view]} · {view === 'source' ? 'adquirida' : 'reconstruída'}</figcaption>
    </figure>)}</div>
    <small>Reconstrução por vizinho mais próximo, sem interpolação diagnóstica. O aspecto usa o espaçamento físico dos voxels.</small>
  </section>;
}
