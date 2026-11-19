import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import {
  cardiacPhaseLabel,
  cinePhaseAt,
  cineWindow,
  pixelVelocity,
  regionFlow,
  throughPlaneVelocity,
  type CardiacCine,
} from './cardiac-cine';
import type { DicomSeries, DicomSlice } from './dicom';
import { mprGeometry } from './mpr';
import { pixelCenter, sliceFrame } from './patient-geometry';

const PatientVolume = lazy(() => import('./PatientVolume'));
const TriPlanarViewer = lazy(() => import('./TriPlanarViewer'));
type Pixel = { row: number; column: number };
const signed = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
});

function CineImage({
  slice,
  pixel,
  radius,
  center,
  width,
  onPixel,
}: {
  slice: DicomSlice;
  pixel: Pixel | null;
  radius: number;
  center: number;
  width: number;
  onPixel: (pixel: Pixel) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { rows, columns, velocity } = slice;
  const frame = sliceFrame(slice);
  const rowSpacing = frame?.rowSpacing ?? 1;
  const colSpacing = frame?.columnSpacing ?? 1;
  const targetRatio = (columns * colSpacing) / (rows * rowSpacing);
  useEffect(() => {
    const element = canvas.current!;
    element.width = columns;
    element.height = rows;
    const ctx = element.getContext('2d');
    if (!ctx) return;
    const image = ctx.createImageData(columns, rows);
    const extent = velocity
      ? Math.max(
          1,
          Math.abs(
            velocity.first * velocity.slopeCmPerSec +
              velocity.interceptCmPerSec,
          ),
          Math.abs(
            velocity.last * velocity.slopeCmPerSec + velocity.interceptCmPerSec,
          ),
        )
      : 1;
    for (let i = 0; i < slice.pixels.length; i++) {
      const offset = i * 4;
      image.data[offset + 3] = 255;
      if (velocity) {
        const speed = pixelVelocity(
          slice,
          Math.floor(i / columns),
          i % columns,
        );
        if (speed === null) continue;
        const strength = Math.min(1, Math.abs(speed) / extent);
        image.data[offset] =
          speed > 0 ? 25 + 230 * strength : 25 - 10 * strength;
        image.data[offset + 1] =
          speed > 0 ? 28 + 93 * strength : 28 + 143 * strength;
        image.data[offset + 2] =
          speed > 0 ? 32 + 32 * strength : 32 + 221 * strength;
      } else {
        const value = slice.pixels[i] * slice.slope + slice.intercept;
        const gray = Math.round(
          Math.min(1, Math.max(0, (value - center + width / 2) / width)) * 255,
        );
        const shade = slice.invert ? 255 - gray : gray;
        image.data[offset] =
          image.data[offset + 1] =
          image.data[offset + 2] =
            shade;
      }
    }
    ctx.putImageData(image, 0, 0);
    if (!pixel) return;
    ctx.strokeStyle = '#f8f9cd';
    ctx.lineWidth = Math.max(0.6, columns / 260);
    const x = pixel.column + 0.5,
      y = pixel.row + 0.5;
    ctx.beginPath();
    if (velocity && throughPlaneVelocity(slice))
      ctx.ellipse(
        x,
        y,
        radius / colSpacing,
        radius / rowSpacing,
        0,
        0,
        2 * Math.PI,
      );
    else {
      ctx.moveTo(x - 6, y);
      ctx.lineTo(x + 6, y);
      ctx.moveTo(x, y - 6);
      ctx.lineTo(x, y + 6);
    }
    ctx.stroke();
  }, [
    center,
    colSpacing,
    columns,
    pixel,
    radius,
    rowSpacing,
    rows,
    slice,
    velocity,
    width,
  ]);

  function pick(event: MouseEvent<HTMLCanvasElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    onPixel({
      column: Math.min(
        columns - 1,
        Math.floor(((event.clientX - bounds.left) / bounds.width) * columns),
      ),
      row: Math.min(
        rows - 1,
        Math.floor(((event.clientY - bounds.top) / bounds.height) * rows),
      ),
    });
  }
  return (
    <div
      className="cine-source"
      style={{ maxWidth: Math.min(540, 350 * targetRatio) }}
    >
      <canvas
        ref={canvas}
        style={{ aspectRatio: targetRatio }}
        onClick={pick}
        aria-label={
          velocity
            ? 'Mapa de velocidades. Clique para centralizar a região de interesse.'
            : 'Quadro cardíaco no plano adquirido. Clique para mover a mira.'
        }
        onKeyDown={(event) => {
          const keyToDelta: Record<string, [number, number]> = {
            ArrowLeft: [0, -1],
            ArrowRight: [0, 1],
            ArrowUp: [-1, 0],
            ArrowDown: [1, 0],
          };
          if (!(event.key in keyToDelta)) return;
          event.preventDefault();
          const [row, col] = keyToDelta[event.key];
          onPixel({
            row: Math.max(
              0,
              Math.min(rows - 1, (pixel?.row ?? Math.floor(rows / 2)) + row),
            ),
            column: Math.max(
              0,
              Math.min(
                columns - 1,
                (pixel?.column ?? Math.floor(columns / 2)) + col,
              ),
            ),
          });
        }}
        tabIndex={0}
      />
    </div>
  );
}

function FlowCurve({
  values,
  phase,
  cine,
}: {
  values: (number | null)[];
  phase: number;
  cine: CardiacCine;
}) {
  const top = Math.max(1, ...values.map((value) => Math.abs(value ?? 0)));
  const first = cine.frameStartsMs[0];
  const span = Math.max(1, cine.frameStartsMs.at(-1)! - first);
  const x = (i: number) => 16 + (268 * (cine.frameStartsMs[i] - first)) / span;
  const y = (value: number) => 51 - (40 * value) / top;
  const line = values
    .map((value, i) =>
      value === null
        ? ''
        : (i === 0 || values[i - 1] === null ? 'M' : 'L') +
          x(i) +
          ',' +
          y(value),
    )
    .join(' ');
  return (
    <svg
      role="img"
      aria-label="Vazão por fase cardíaca na região selecionada"
      viewBox="0 0 300 100"
      className="cine-curve"
    >
      <line x1="16" x2="284" y1="51" y2="51" stroke="#7594a1" />
      <line
        x1={x(phase)}
        x2={x(phase)}
        y1="7"
        y2="94"
        stroke="#708c9b"
        strokeDasharray="4 4"
      />
      <path d={line} fill="none" stroke="#48dfd7" strokeWidth="2" />
      {values[phase] !== null && (
        <circle cx={x(phase)} cy={y(values[phase])} r="4" fill="#f5fbd5" />
      )}
    </svg>
  );
}

export default function CardiacCineViewer({
  reference,
  cine,
  onReference,
  onSpatialPoint,
}: {
  reference: DicomSeries;
  cine: CardiacCine | null;
  onReference?: () => void;
  onSpatialPoint: (series: DicomSeries, index: number) => void;
}) {
  const initialPhase = Math.max(0, cine?.phases.indexOf(reference) ?? 0);
  const [phase, setPhase] = useState(initialPhase);
  const [index, setIndex] = useState(Math.floor(reference.slices.length / 2));
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [mode, setMode] = useState<'source' | 'planes' | 'volume'>('source');
  const [radius, setRadius] = useState(6);
  const [pixel, setPixel] = useState<Pixel | null>(null);
  const [point, setPoint] = useState<number[] | null>(null);
  const timeline = useRef(cine?.frameStartsMs[initialPhase] ?? 0);
  const base = cine?.phases[0] ?? reference;
  const active = cine?.phases[phase] ?? reference;
  const slice = active.slices[index];
  const velocity = Boolean(slice.velocity);
  const aligned = useMemo(() => Boolean(mprGeometry(base)), [base]);
  const limits = useMemo(() => cineWindow(base), [base]);
  const hasFlow = throughPlaneVelocity(slice);
  const pickedSpeed =
    pixel && velocity ? pixelVelocity(slice, pixel.row, pixel.column) : null;
  const rates = useMemo(
    () =>
      pixel && hasFlow
        ? (cine?.phases ?? [reference]).map((item) =>
            regionFlow(item.slices[index], pixel.row, pixel.column, radius),
          )
        : [],
    [cine, hasFlow, index, pixel, radius, reference],
  );
  const currentRate = rates[phase] ?? null;

  useEffect(() => {
    if (!playing || !cine) return;
    let animation = 0;
    let previous: number | undefined;
    function tick(now: number) {
      if (previous !== undefined)
        timeline.current =
          (timeline.current + Math.min(100, now - previous) * rate) %
          cine!.durationMs;
      previous = now;
      setPhase(cinePhaseAt(cine!, timeline.current));
      animation = requestAnimationFrame(tick);
    }
    animation = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animation);
  }, [cine, playing, rate]);

  useEffect(() => onSpatialPoint(base, index), [base, index, onSpatialPoint]);

  function seek(value: number) {
    if (!cine) return;
    const next = (value + cine.phases.length) % cine.phases.length;
    timeline.current = cine.frameStartsMs[next];
    setPlaying(false);
    setPhase(next);
  }
  function selectPixel(next: Pixel) {
    setPixel(next);
    setPoint(pixelCenter(slice, next.row, next.column) ?? null);
  }
  function selectSlice(next: number) {
    setIndex(next);
    if (pixel)
      setPoint(
        pixelCenter(active.slices[next], pixel.row, pixel.column) ?? null,
      );
  }
  const volume = mode === 'volume' && (
    <Suspense fallback={<p>Preparando volume…</p>}>
      <PatientVolume
        series={base}
        activePhase={active}
        point={point}
        center={limits.center}
        width={limits.width}
        onReference={onReference}
      />
    </Suspense>
  );

  return (
    <section
      className="cardiac-cine"
      aria-label={cine ? 'Cine cardíaco DICOM' : 'Velocidade medida no DICOM'}
    >
      <header>
        <h3>{cine ? 'Cine cardíaco' : 'Mapa de velocidade'}</h3>
        {cine && (
          <p>
            {cine.phases.length} fases ·{' '}
            {cine.recordedTiming
              ? 'Ciclo nominal do exame'
              : 'Ritmo de reprodução aproximado'}
          </p>
        )}
        {onReference && mode !== 'volume' && (
          <button onClick={onReference}>Comparar com coração do Atlas</button>
        )}
      </header>
      {cine && (
        <div className="cine-transport">
          <button aria-label="Fase anterior" onClick={() => seek(phase - 1)}>
            <ChevronLeft size={17} />
          </button>
          <button
            className="cine-play"
            aria-label={playing ? 'Pausar cine' : 'Reproduzir cine'}
            onClick={() => setPlaying((value) => !value)}
          >
            {playing ? <Pause size={17} /> : <Play size={17} />}
          </button>
          <button aria-label="Próxima fase" onClick={() => seek(phase + 1)}>
            <ChevronRight size={17} />
          </button>
          <label>
            Fase {phase + 1}/{cine.phases.length} · {cardiacPhaseLabel(active)}
            <input
              type="range"
              aria-label="Fase cardíaca"
              min={0}
              max={cine.phases.length - 1}
              value={phase}
              onChange={(event) => seek(event.target.valueAsNumber)}
            />
          </label>
          <label>
            Reprodução
            <select
              aria-label="Velocidade da reprodução"
              value={rate}
              onChange={(event) => setRate(Number(event.target.value))}
            >
              <option value=".25">¼×</option>
              <option value=".5">½×</option>
              <option value="1">1×</option>
            </select>
          </label>
        </div>
      )}
      {active.slices.length > 1 && (
        <label className="cine-slice">
          Corte adquirido {index + 1}/{active.slices.length}
          <input
            type="range"
            aria-label="Corte do cine"
            min={0}
            max={active.slices.length - 1}
            value={index}
            onChange={(event) => selectSlice(event.target.valueAsNumber)}
          />
        </label>
      )}
      {cine && !velocity && cine.hasVolume && (
        <nav className="cine-tabs" aria-label="Visualização do cine">
          <button
            aria-pressed={mode === 'source'}
            onClick={() => setMode('source')}
          >
            Plano adquirido
          </button>
          {aligned && (
            <button
              aria-pressed={mode === 'planes'}
              onClick={() => setMode('planes')}
            >
              Três planos
            </button>
          )}
          <button
            aria-pressed={mode === 'volume'}
            onClick={() => setMode('volume')}
          >
            Volume 4D
          </button>
        </nav>
      )}
      {aligned && mode !== 'source' ? (
        <Suspense fallback={<p>Preparando reconstruções…</p>}>
          <TriPlanarViewer
            series={active}
            slice={index}
            windowCenter={limits.center}
            windowWidth={limits.width}
            onSlice={selectSlice}
            onPatientPoint={setPoint}
            onCursorChange={setPoint}
            spatialView={volume || undefined}
          />
        </Suspense>
      ) : (
        <div className={volume ? 'cine-images with-volume' : 'cine-images'}>
          <CineImage
            slice={slice}
            pixel={pixel}
            radius={radius}
            center={limits.center}
            width={limits.width}
            onPixel={selectPixel}
          />
          {volume}
        </div>
      )}
      {cine && !velocity && !cine.hasVolume && (
        <p>
          Esta aquisição cobre o plano adquirido. O volume 4D requer uma pilha
          regular em cada fase.
        </p>
      )}
      {velocity && (
        <div className="cine-flow">
          <h4>Velocidade codificada na RM</h4>
          <p>
            <span className="cine-negative">Azul · negativa</span>{' '}
            <span className="cine-positive">Laranja · positiva</span>
          </p>
          {slice.velocity && (
            <p>
              Vetor de codificação no referencial do paciente (L, P, S) ·{' '}
              {slice.velocity.direction
                .map((value) => value.toFixed(2))
                .join(' / ')}
            </p>
          )}
          <p>
            {pixel
              ? pickedSpeed === null
                ? 'Pixel fora da faixa calibrada'
                : 'Pixel selecionado · ' + signed.format(pickedSpeed) + ' cm/s'
              : 'Clique na imagem para marcar um ponto.'}
          </p>
          {hasFlow && (
            <>
              <label>
                Raio da região · {radius} mm
                <input
                  type="range"
                  aria-label="Raio da região de fluxo"
                  min={1}
                  max={30}
                  value={radius}
                  onChange={(event) => setRadius(event.target.valueAsNumber)}
                />
              </label>
              {pixel && (
                <p>
                  {currentRate === null ? (
                    'A região deve caber na imagem e conter apenas pixels calibrados.'
                  ) : (
                    <strong>
                      Vazão na região · {signed.format(currentRate)} mL/s
                    </strong>
                  )}
                </p>
              )}
              {cine && rates.some((value) => value !== null) && (
                <>
                  <FlowCurve cine={cine} values={rates} phase={phase} />
                  <p>A curva usa a mesma região circular em todas as fases.</p>
                </>
              )}
            </>
          )}
          {!hasFlow && (
            <p>
              O mapa mede uma componente da velocidade. A vazão requer
              codificação perpendicular ao corte.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
