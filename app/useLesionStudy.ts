import { useEffect, useState } from 'react';
import type { DicomSeries } from './dicom';
import {
  maxMaskBytes,
  paintLesion,
  propagateLesion,
  type BrushPoint,
  type LesionMask,
  type LesionSurface,
} from './lesion-mask';
import { regularVolumeGrid, type MprCursor, type MprView } from './mpr';
import type { Point3 } from './patient-geometry';

const emptyMask: LesionMask = new Map();
type Region = {
  id: string;
  label: string;
  mask: LesionMask;
  reviewed: Set<number>;
  imported?: boolean;
};

let regionCount = 0;
const newRegion = (label: string): Region => ({
  id: String(++regionCount),
  label,
  mask: emptyMask,
  reviewed: new Set(),
});

export type LesionTool = 'navigate' | 'paint' | 'erase';

export function useLesionStudy(
  series: DicomSeries,
  enabled: boolean,
  onSurface?: (series: DicomSeries, surface: LesionSurface | null) => void,
) {
  const [regions, setRegions] = useState<Region[]>(() => [
    newRegion('Lesão 1'),
  ]);
  const [selectedId, setSelectedId] = useState('');
  const [history, setHistory] = useState<Region | null>(null);
  const [exporting, setExporting] = useState(false);
  const [tool, setTool] = useState<LesionTool>('navigate');
  const [radius, setRadius] = useState(4);
  const [shown, setShown] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    mask: LesionMask;
    volume: number | null;
    error?: string;
  } | null>(null);
  const region = regions.find((item) => item.id === selectedId) ?? regions[0];
  const { mask } = region;
  const marked = [...mask.keys()].sort((a, b) => a - b);
  const pending = marked.filter((slice) => !region.reviewed.has(slice));

  const changeRegion = (update: (region: Region) => Region) =>
    setRegions((current) =>
      current.map((item) => (item.id === region.id ? update(item) : item)),
    );
  function updateMask(next: LesionMask) {
    if (next === mask) return;
    const currentBytes = regions.reduce(
      (total, item) =>
        total +
        (item.id === region.id ? next.size : item.mask.size) *
          series.rows *
          series.columns,
      0,
    );
    if (currentBytes > maxMaskBytes)
      throw new Error(
        'As regiões excedem o limite local de 224 MB de máscaras.',
      );
    const reviewed = new Set(
      [...region.reviewed].filter(
        (z) => next.has(z) && next.get(z) === mask.get(z),
      ),
    );
    setHistory(region);
    changeRegion((item) => ({ ...item, mask: next, reviewed }));
  }
  const completed = result?.mask === mask ? result : null;

  useEffect(() => {
    if (!enabled || !onSurface) return;
    onSurface(series, null);
    if (!mask.size) return;
    const grid = regularVolumeGrid(series);
    if (!grid) return;
    const { frame, stepMm } = grid;
    let worker: Worker | undefined;
    const timer = window.setTimeout(() => {
      const fail = (message: string) => {
        setResult({ mask, volume: null, error: message });
        worker?.terminate();
      };
      try {
        worker = new Worker(
          new URL('./lesion-surface.worker.ts', import.meta.url),
          { type: 'module' },
        );
        worker.onmessage = (
          event: MessageEvent<{ surface?: LesionSurface; error?: string }>,
        ) => {
          if (!event.data.surface) {
            fail(event.data.error ?? 'Falha ao gerar a superfície da lesão.');
            return;
          }
          const surface = event.data.surface;
          setResult({ mask, volume: surface.volumeMl });
          onSurface(series, surface);
          worker?.terminate();
        };
        worker.onerror = () =>
          fail(
            'Falha ao gerar a superfície da lesão. A marcação 2D continua disponível.',
          );
        worker.postMessage({
          grid: {
            rows: series.rows,
            columns: series.columns,
            origins: series.slices.map((slice) => slice.position!),
            columnVector: frame.rowDirection.map(
              (value) => value * frame.columnSpacing,
            ) as Point3,
            rowVector: frame.columnDirection.map(
              (value) => value * frame.rowSpacing,
            ) as Point3,
            normal: frame.normal,
            stepMm,
          },
          mask,
        });
      } catch {
        fail(
          'Não foi possível iniciar a reconstrução local. A marcação 2D continua disponível.',
        );
      }
    }, 120);
    return () => {
      window.clearTimeout(timer);
      worker?.terminate();
    };
  }, [enabled, mask, onSurface, series]);

  async function importFile(file: File) {
    setImporting(true);
    setError('');
    try {
      if (file.size > maxMaskBytes / 8 + 4 * 1024 * 1024)
        throw new Error(
          'O arquivo excede o limite local do leitor de máscaras.',
        );
      const { parseDicomSeg } = await import('./dicom-seg');
      const segments = parseDicomSeg(
        new Uint8Array(await file.arrayBuffer()),
        series,
      );
      const imported = segments.map((segment) => ({
        ...newRegion(segment.label),
        mask: segment.mask,
        imported: true,
      }));
      const used = [...regions, ...imported].reduce(
        (total, item) => total + item.mask.size * series.rows * series.columns,
        0,
      );
      if (used > maxMaskBytes)
        throw new Error(
          'As máscaras carregadas excedem o limite local de 224 MB.',
        );
      setRegions((current) => [
        ...current.filter((item) => item.mask.size),
        ...imported,
      ]);
      setSelectedId(imported[0].id);
      setHistory(null);
      setTool('navigate');
      setShown(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível importar a máscara.',
      );
    } finally {
      setImporting(false);
    }
  }

  function stroke(
    view: MprView,
    cursor: MprCursor,
    points: BrushPoint[],
    stepMm: number,
  ) {
    if (tool === 'navigate') return;
    try {
      const next = paintLesion(
        mask,
        series,
        view,
        cursor,
        points,
        radius,
        stepMm,
        tool === 'paint' ? 1 : 0,
      );
      updateMask(next);
      setError('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível aplicar o traço.',
      );
    }
  }

  async function exportFile() {
    setExporting(true);
    setError('');
    try {
      const { encodeDicomSeg } = await import('./dicom-seg-export');
      const bytes = encodeDicomSeg(series, regions);
      const url = URL.createObjectURL(
        new Blob([bytes.buffer], { type: 'application/dicom' }),
      );
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'mapa-clinico-lesoes.dcm';
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Falha ao exportar DICOM SEG.',
      );
    } finally {
      setExporting(false);
    }
  }

  return {
    regions,
    region,
    marked,
    pending,
    hasMasks: regions.some((item) => item.mask.size),
    importing,
    importFile,
    exporting,
    exportFile,
    select: (id: string) => {
      setSelectedId(id);
      setTool('navigate');
      setShown(true);
      setHistory(null);
    },
    add: () => {
      const item = newRegion(`Lesão ${regions.length + 1}`);
      setRegions((current) => [...current, item]);
      setSelectedId(item.id);
      setHistory(null);
      setShown(true);
    },
    rename: (label: string) => changeRegion((item) => ({ ...item, label })),
    mask,
    tool,
    setTool: (mode: LesionTool) => {
      setTool(mode);
      setShown(true);
    },
    radius,
    setRadius,
    shown,
    setShown,
    stroke,
    error,
    rendering: enabled && mask.size > 0 && !completed,
    volume: completed?.volume ?? null,
    surfaceError: completed?.error ?? '',
    canUndo: history?.id === region.id,
    undo: () => {
      if (!history || history.id !== region.id) return;
      changeRegion((item) => ({
        ...item,
        mask: history.mask,
        reviewed: history.reviewed,
      }));
      setHistory(null);
    },
    clear: () => updateMask(emptyMask),
    toggleReview: (slice: number) => {
      if (!mask.has(slice)) return;
      changeRegion((item) => {
        const reviewed = new Set(item.reviewed);
        if (reviewed.has(slice)) reviewed.delete(slice);
        else reviewed.add(slice);
        return { ...item, reviewed };
      });
    },
    propagate: (slice: number, direction: -1 | 1, count: number) => {
      try {
        const next = propagateLesion(
          mask,
          slice,
          direction,
          count,
          series.slices.length,
        );
        if (next === mask) {
          setError('O corte vizinho já tem contorno ou está fora da série.');
          return;
        }
        updateMask(next);
        setError('');
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Falha ao propagar o contorno.',
        );
      }
    },
  };
}
