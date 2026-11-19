import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import {
  readUltrasoundVolume,
  type UltrasoundPhase,
} from './ultrasound-volume';
import type { MprView } from './mpr';
import { pixelCenter } from './patient-geometry';

const PatientVolume = lazy(() => import('./PatientVolume'));
const TriPlanarViewer = lazy(() => import('./TriPlanarViewer'));

export default function EchoVolumeStudy() {
  const [exam, setExam] = useState<{
    phases: UltrasoundPhase[];
    center: number;
    width: number;
    key: number;
  }>();
  const [phase, setPhase] = useState(0);
  const [slice, setSlice] = useState(0);
  const [point, setPoint] = useState<number[] | null>(null);
  const [view, setView] = useState<MprView>('source');
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);
  const phases = exam?.phases;
  const current = phases?.[phase];
  const base = phases?.[0];
  const last = (phases?.length ?? 1) - 1;

  useEffect(() => {
    if (!playing || !phases || phases.length < 2) return;
    const delay =
      phase < last
        ? phases[phase + 1].time - phases[phase].time
        : phases[1].time - phases[0].time;
    const timer = window.setTimeout(
      () => setPhase((index) => (index === last ? 0 : index + 1)),
      Math.max(16, delay * 1000),
    );
    return () => window.clearTimeout(timer);
  }, [last, phase, phases, playing]);

  async function open(file: File) {
    const key = ++request.current;
    setLoading(true);
    setError('');
    setPlaying(false);
    try {
      if (file.size > 256 * 1024 * 1024)
        throw new Error('Abra um DICOM de até 256 MB.');
      const data = new Uint8Array(await file.arrayBuffer());
      if (key !== request.current) return;
      const phases = readUltrasoundVolume(data);
      const { series } = phases[0];
      const middle = Math.floor(series.slices.length / 2);
      const sample = series.slices[middle];
      let low = Infinity,
        high = -Infinity;
      for (const item of series.slices)
        for (const pixel of item.pixels) {
          const value = pixel * item.slope + item.intercept;
          low = Math.min(low, value);
          high = Math.max(high, value);
        }
      setExam({
        phases,
        key,
        center: sample.windowCenter ?? (low + high) / 2,
        width: sample.windowWidth ?? Math.max(1, high - low),
      });
      setPhase(0);
      setSlice(middle);
      setView('source');
      setPoint(
        pixelCenter(
          sample,
          Math.floor(series.rows / 2),
          Math.floor(series.columns / 2),
        ) ?? null,
      );
    } catch (cause) {
      if (key === request.current)
        setError(
          cause instanceof Error ? cause.message : 'Falha ao abrir o volume.',
        );
    } finally {
      if (key === request.current) setLoading(false);
    }
  }

  return (
    <div className="echo-simulator">
      <header className="us-heading">
        <div>
          <h2>Eco volumétrico 3D e 4D</h2>
          <p>
            Abra um Enhanced US Volume DICOM monocromático. O visor usa os
            cortes cartesianos e o tempo gravado entre as fases. Os arquivos são
            processados no navegador.
          </p>
        </div>
      </header>
      <div className="image-tools">
        <label className="dicom-upload">
          {loading ? 'Lendo volume…' : 'Importar eco volumétrico'}
          <input
            aria-label="Importar DICOM de eco volumétrico"
            type="file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void open(file);
              event.target.value = '';
            }}
          />
        </label>
        {exam && (
          <button
            onClick={() => {
              ++request.current;
              setLoading(false);
              setPlaying(false);
              setExam(undefined);
              setError('');
            }}
          >
            Fechar exame
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="plane-status">
          {error}
        </p>
      )}
      {exam && base && current && (
        <>
          {last > 0 && (
            <div className="echo-study-note">
              <div className="us-region-list">
                <button
                  onClick={() => setPlaying((value) => !value)}
                  aria-pressed={playing}
                >
                  {playing ? 'Pausar ciclo' : 'Reproduzir ciclo'}
                </button>
              </div>
              <label>
                Fase {phase + 1} de {last + 1} ·{' '}
                {Math.round(current.time * 1000)} ms
                <input
                  type="range"
                  aria-label="Fase do eco"
                  min="0"
                  max={last}
                  value={phase}
                  onChange={(event) => {
                    setPlaying(false);
                    setPhase(event.target.valueAsNumber);
                  }}
                />
              </label>
            </div>
          )}
          <div className="echo-study-note">
            Coordenadas do volume adquirido. A mira mantém a posição física
            enquanto o exame percorre as fases.
          </div>
          <Suspense fallback={<p>Preparando os planos e o volume…</p>}>
            <TriPlanarViewer
              key={exam.key}
              series={current.series}
              slice={slice}
              windowCenter={exam.center}
              windowWidth={exam.width}
              onSlice={setSlice}
              onPatientPoint={setPoint}
              onCursorChange={setPoint}
              activePlane={view}
              onActivePlane={setView}
              spatialView={
                <PatientVolume
                  series={base.series}
                  activePhase={current.series}
                  point={point}
                  center={exam.center}
                  width={exam.width}
                />
              }
            />
          </Suspense>
        </>
      )}
    </div>
  );
}
