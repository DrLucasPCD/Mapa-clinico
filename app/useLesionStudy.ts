import { useEffect, useState } from 'react';
import type { DicomSeries } from './dicom';
import type { DicomSegment } from './dicom-seg';
import {
  maxMaskBytes,
  paintLesion,
  type BrushPoint,
  type LesionMask,
  type LesionSurface,
} from './lesion-mask';
import { regularVolumeGrid, type MprCursor, type MprView } from './mpr';
import type { Point3 } from './patient-geometry';

const emptyMask: LesionMask = new Map();
export type LesionTool = 'navigate' | 'paint' | 'erase';

export function useLesionStudy(
  series: DicomSeries,
  enabled: boolean,
  onSurface?: (series: DicomSeries, surface: LesionSurface | null) => void,
) {
  const [imported, setImported] = useState<DicomSegment[]>([]);
  const [manual, setManual] = useState<LesionMask>(emptyMask);
  const [selection, setSelection] = useState('manual');
  const [undoMask, setUndoMask] = useState<LesionMask | null>(null);
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
  const editing = selection === 'manual';
  const mask =
    (editing
      ? manual
      : imported.find((segment) => String(segment.id) === selection)?.mask) ??
    emptyMask;
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
      setImported(segments);
      setSelection(String(segments[0].id));
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
    if (!editing || tool === 'navigate') return;
    try {
      const next = paintLesion(
        manual,
        series,
        view,
        cursor,
        points,
        radius,
        stepMm,
        tool === 'paint' ? 1 : 0,
      );
      if (next !== manual) {
        setUndoMask(manual);
        setManual(next);
      }
      setError('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível aplicar o traço.',
      );
    }
  }

  return {
    imported,
    editing,
    selection,
    select: (id: string) => {
      setSelection(id);
      setTool('navigate');
      setShown(true);
    },
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
    importing,
    importFile,
    stroke,
    error,
    rendering: enabled && mask.size > 0 && !completed,
    volume: completed?.volume ?? null,
    surfaceError: completed?.error ?? '',
    canUndo: undoMask !== null,
    undo: () => {
      if (undoMask) {
        setManual(undoMask);
        setUndoMask(null);
      }
    },
    clear: () => {
      setUndoMask(manual);
      setManual(emptyMask);
    },
  };
}
