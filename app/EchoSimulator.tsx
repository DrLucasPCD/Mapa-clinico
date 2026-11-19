import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from 'react';
import {
  echoBeamFor,
  echoCinePhase,
  echoWindowOrder,
  echoWindows,
  type EchoCycleMarks,
  type EchoProbe,
  type EchoWindow,
} from './echo-windows';
import { labLayers } from './lab3d-data';
import './lab3d.css';

const Lab3dScene = lazy(() => import('./Lab3dScene'));
const layers = labLayers.heart.map((layer) => layer.id);
const flow = {
  chambers: false,
  greatVessels: false,
  arteries: false,
  veins: false,
};
const noop = () => {};
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const initial = { ...echoWindows.plax, depth: 170 };
const files = {
  plax: 'PLAXnormal',
  psax: 'SAXPAP_normal',
  'psax-apical': 'SAXAP_normal',
  apical: 'A4C_normal',
  subcostal: 'Subcostal_normal',
};
const labels = {
  start: 'Fim da diástole',
  systole: 'Fim da sístole',
  end: 'Diástole seguinte',
};

export default function EchoSimulator() {
  const [probe, setProbe] = useState<EchoProbe>(initial);
  const [gain, setGain] = useState(100);
  const [guide, setGuide] = useState(true);
  const [clock, setClock] = useState(true);
  const [cut, setCut] = useState(false);
  const [selection, setSelection] = useState('');
  const [local, setLocal] = useState<{
    file: File;
    url: string;
    view: string;
  } | null>(null);
  const [timing, setTiming] = useState<{
    src: string;
    marks: Partial<EchoCycleMarks>;
  } | null>(null);
  const [mediaStatus, setMediaStatus] = useState<{
    src: string;
    error: boolean;
  } | null>(null);
  const [playhead, setPlayhead] = useState<{
    src: string;
    duration: number;
    time: number;
  } | null>(null);
  const map = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ id: number; rotating: boolean } | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const heartTime = useRef(0);
  const beam = useMemo(() => echoBeamFor(probe), [probe]);
  const window = beam?.window;
  const info = window && echoWindows[window];
  const example =
    window === 'psax' && probe.tilt < -12 ? 'psax-apical' : window;
  const localClip = local?.view === example ? local : null;
  const src =
    localClip?.url ?? (example ? `/ultrasound/echo/${example}.mp4` : '');
  const sourcePage =
    example &&
    `https://commons.wikimedia.org/wiki/File:${files[example]}_(CardioNetworks_ECHOpedia).webm`;
  const marks = timing?.src === src ? timing.marks : {};
  const { start, systole, end } = marks;
  const complete =
    start !== undefined && systole !== undefined && end !== undefined;
  const synchronized =
    complete && echoCinePhase(start, { start, systole, end }) !== null;
  const status = mediaStatus?.src === src ? mediaStatus : null;
  const playback = playhead?.src === src ? playhead : null;
  const modelTime = () =>
    video.current && synchronized
      ? (echoCinePhase(video.current.currentTime, { start, systole, end }) ??
          0) * 0.8
      : null;

  useEffect(
    () => () => {
      if (local) URL.revokeObjectURL(local.url);
    },
    [local],
  );

  const changeProbe = (event: PointerEvent) => {
    const rect = map.current?.getBoundingClientRect();
    if (!rect?.width || !rect.height || !pointer.current) return;
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    if (pointer.current.rotating) {
      const degrees =
        (Math.atan2((x - probe.x) * rect.width, (probe.y - y) * rect.height) *
          180) /
        Math.PI;
      setProbe((previous) => ({ ...previous, roll: Math.round(degrees) }));
    } else
      setProbe((previous) => ({
        ...previous,
        x: clamp(x, 0.12, 0.88),
        y: clamp(y, 0.14, 0.68),
      }));
  };
  const begin = (event: PointerEvent<HTMLElement>, rotating: boolean) => {
    if (event.button !== 0 || pointer.current) return;
    event.stopPropagation();
    pointer.current = { id: event.pointerId, rotating };
    event.currentTarget.setPointerCapture(event.pointerId);
    if (!rotating) changeProbe(event);
  };
  const endPointer = (event: PointerEvent) => {
    if (pointer.current?.id === event.pointerId) pointer.current = null;
  };
  const choose = (id: EchoWindow) => {
    const { x, y, roll, tilt } = echoWindows[id];
    setProbe((previous) => ({ ...previous, x, y, roll, tilt }));
  };
  const mark = (key: keyof EchoCycleMarks) => {
    if (!video.current || video.current.readyState < 1) return;
    video.current.pause();
    setTiming({ src, marks: { ...marks, [key]: video.current.currentTime } });
  };
  const captureTime = () => {
    const current = video.current;
    if (current && Number.isFinite(current.duration)) {
      setPlayhead({
        src,
        time: current.currentTime,
        duration: current.duration,
      });
    }
  };
  const seek = (time: number) => {
    if (!video.current || !playback) return;
    video.current.pause();
    video.current.currentTime = clamp(time, 0, playback.duration);
    captureTime();
  };

  return (
    <section className="echo-simulator" aria-labelledby="echo-title">
      <header className="us-heading">
        <div>
          <h2 id="echo-title">Simulador de ecocardiografia</h2>
          <p>
            Posicione a sonda no tórax, gire pelo marcador e incline o feixe.
            Compare a janela acústica no coração 3D com um cine real da mesma
            vista.
          </p>
        </div>
        <span>Eco transtorácico</span>
      </header>
      <nav
        className="us-region-list echo-windows"
        aria-label="Janelas de ecocardiografia"
      >
        {echoWindowOrder.map((id) => (
          <button
            key={id}
            aria-pressed={window === id}
            className={window === id ? 'active' : ''}
            onClick={() => choose(id)}
          >
            {echoWindows[id].label}
          </button>
        ))}
      </nav>
      <div className="echo-grid">
        <section className="us-body-panel">
          <div className="us-panel-title">
            <strong>Posicionar a sonda</strong>
            <small>Vista anterior · direita do paciente à esquerda</small>
          </div>
          <div
            ref={map}
            className="us-body-map echo-torso"
            role="group"
            aria-label="Posição da sonda. Use as setas para mover."
            tabIndex={0}
            onPointerDown={(event) => begin(event, false)}
            onPointerMove={(event) => {
              if (pointer.current?.id === event.pointerId) changeProbe(event);
            }}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
            onLostPointerCapture={endPointer}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget) return;
              const delta = {
                ArrowUp: [0, -0.025],
                ArrowDown: [0, 0.025],
                ArrowLeft: [-0.025, 0],
                ArrowRight: [0.025, 0],
              }[event.key];
              if (!delta) return;
              event.preventDefault();
              setProbe((previous) => ({
                ...previous,
                x: clamp(previous.x + delta[0], 0.12, 0.88),
                y: clamp(previous.y + delta[1], 0.14, 0.68),
              }));
            }}
          >
            <div aria-hidden="true" className="echo-chest">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
            <span className="echo-side right">D</span>
            <span className="echo-side left">E</span>
            {guide &&
              (['plax', 'apical', 'subcostal'] as const).map((id) => (
                <span
                  key={id}
                  className="echo-hotspot"
                  style={{
                    left: `${echoWindows[id].x * 100}%`,
                    top: `${echoWindows[id].y * 100}%`,
                  }}
                  aria-hidden="true"
                />
              ))}
            <div
              className="echo-probe"
              style={{
                left: `${probe.x * 100}%`,
                top: `${probe.y * 100}%`,
                transform: `translate(-50%,-100%) rotate(${probe.roll}deg)`,
              }}
            >
              <button
                aria-label="Girar transdutor do eco"
                role="slider"
                aria-valuemin={-180}
                aria-valuemax={180}
                aria-valuenow={probe.roll}
                className="us-probe-handle"
                onPointerDown={(event) => begin(event, true)}
                title="Arraste para girar a sonda"
                onKeyDown={(event) => {
                  const increment = {
                    ArrowLeft: -5,
                    ArrowDown: -5,
                    ArrowRight: 5,
                    ArrowUp: 5,
                  }[event.key];
                  if (!increment) return;
                  event.preventDefault();
                  setProbe((previous) => ({
                    ...previous,
                    roll: ((previous.roll + increment + 540) % 360) - 180,
                  }));
                }}
              >
                ↻
              </button>
              <span className="echo-probe-marker" aria-hidden="true" />
            </div>
          </div>
          <div className="us-map-help">
            Rotação {probe.roll}° · arraste a alça para girar
          </div>
          <div className="echo-sliders">
            <label>
              Inclinação {probe.tilt}°
              <input
                type="range"
                min="-30"
                max="30"
                value={probe.tilt}
                aria-label="Inclinação da sonda"
                onChange={(event) =>
                  setProbe((previous) => ({
                    ...previous,
                    tilt: event.target.valueAsNumber,
                  }))
                }
              />
            </label>
            <label>
              Profundidade {(probe.depth / 10).toFixed(0)} cm
              <input
                type="range"
                min="75"
                max="235"
                step="5"
                value={probe.depth}
                aria-label="Profundidade do feixe"
                onChange={(event) =>
                  setProbe((previous) => ({
                    ...previous,
                    depth: event.target.valueAsNumber,
                  }))
                }
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={guide}
                onChange={(event) => setGuide(event.target.checked)}
              />{' '}
              Mostrar pontos de referência
            </label>
          </div>
        </section>
        <section className="us-body-panel">
          <div className="us-panel-title">
            <strong>Coração 3D</strong>
            <small>{info ? info.short : 'Sonda fora das janelas'}</small>
          </div>
          <div className="echo-heart-stage">
            <Suspense fallback={<p role="status">Carregando coração 3D…</p>}>
              <Lab3dScene
                scope="heart"
                molecule="dopamina"
                view="natural"
                layers={layers}
                spread={0}
                cut={0}
                axis="coronal"
                selected={selection}
                focus={0}
                camera="oblique"
                cameraReset={0}
                lookAtLesion={false}
                pointCloud={false}
                showHydrogen={false}
                flow={flow}
                echo={beam}
                echoCut={cut}
                echoTime={modelTime}
                stage={0}
                progress={0}
                playing={clock && !synchronized}
                bpm={75}
                time={heartTime}
                lockedCamera={false}
                vectors={false}
                chamberView="all"
                onSelect={setSelection}
                onParts={noop}
              />
            </Suspense>
          </div>
          <div className="echo-model-controls">
            <label>
              <input
                type="checkbox"
                checked={cut}
                disabled={!beam}
                onChange={(event) => setCut(event.target.checked)}
              />{' '}
              Abrir plano no coração
            </label>
            <label>
              <input
                type="checkbox"
                checked={clock}
                disabled={synchronized}
                onChange={(event) => setClock(event.target.checked)}
              />{' '}
              Animar batimento didático
            </label>
          </div>
        </section>
        <section className="us-image-panel">
          <div className="us-panel-title">
            <strong>{info?.label ?? 'Sem janela acústica'}</strong>
            <small>
              {localClip
                ? 'Cine local'
                : example === 'psax-apical'
                  ? 'Cine de referência · nível apical'
                  : example === 'psax'
                    ? 'Cine de referência · nível papilar'
                    : 'Cine de referência'}
            </small>
          </div>
          <div className="us-image-stage echo-video">
            {src ? (
              <video
                key={src}
                ref={video}
                src={src}
                controls
                muted
                playsInline
                loop
                preload="metadata"
                aria-label={`Cine de ecocardiografia ${info?.short}`}
                onError={() => setMediaStatus({ src, error: true })}
                onLoadedMetadata={captureTime}
                onTimeUpdate={captureTime}
                onLoadedData={() => setMediaStatus({ src, error: false })}
                style={{ filter: `brightness(${gain}%)` }}
              />
            ) : (
              <p className="us-no-window">
                Mova a sonda para uma das janelas do tórax.
              </p>
            )}
          </div>
          <div className="echo-sliders">
            {status?.error && (
              <p role="alert">
                Este formato de vídeo não abriu no navegador. Tente um MP4
                codificado em H.264.
              </p>
            )}
            <label>
              Ganho de exibição {gain}%
              <input
                type="range"
                min="65"
                max="150"
                value={gain}
                onChange={(event) => setGain(event.target.valueAsNumber)}
              />
            </label>
            {example && (
              <div className="echo-import">
                <label className="echo-upload">
                  Importar cine local
                  <input
                    type="file"
                    accept="video/*,.mp4,.webm,.mov"
                    aria-label="Importar vídeo de ecocardiograma"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      if (file) {
                        setLocal({
                          file,
                          url: URL.createObjectURL(file),
                          view: example,
                        });
                        setTiming(null);
                      }
                      event.currentTarget.value = '';
                    }}
                  />
                </label>
                {localClip && (
                  <button
                    onClick={() => {
                      setLocal(null);
                      setTiming(null);
                    }}
                  >
                    Remover cine local
                  </button>
                )}
              </div>
            )}
            {example && (
              <small>
                {localClip ? (
                  localClip.file.name
                ) : (
                  <>
                    Vídeo de Vdbilt / CardioNetworks ECHOpedia ·{' '}
                    <a
                      href={sourcePage || undefined}
                      target="_blank"
                      rel="noreferrer"
                    >
                      fonte
                    </a>{' '}
                    ·{' '}
                    <a
                      href="https://creativecommons.org/licenses/by-sa/3.0/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      CC BY-SA 3.0
                    </a>
                    . Convertido para MP4.
                  </>
                )}
              </small>
            )}
          </div>
        </section>
      </div>
      {info && (
        <section className="echo-study-note">
          <h3>{info.label}</h3>
          <p>{info.placement}</p>
          <p>
            {example === 'psax-apical'
              ? 'No eixo curto apical, observe a cavidade do ventrículo esquerdo mais próxima do ápice e compare com o nível papilar.'
              : info.landmarks}
          </p>
          <a href={info.reference} target="_blank" rel="noreferrer">
            {info.referenceLabel} ↗
          </a>
        </section>
      )}
      {src && (
        <details className="echo-study-note">
          <summary>Sincronizar o ciclo com o cine</summary>
          <p>
            Marque o fim da diástole e da sístole de um batimento, depois o fim
            da diástole seguinte. O coração didático acompanha o tempo entre os
            marcos.
          </p>
          {playback && (
            <div className="echo-playhead">
              <button
                type="button"
                onClick={() => seek(playback.time - 0.02)}
                aria-label="Voltar 20 milissegundos"
              >
                −20 ms
              </button>
              <label>
                Posição no cine · {playback.time.toFixed(2)} s
                <input
                  aria-label="Posição no cine"
                  type="range"
                  min="0"
                  max={playback.duration}
                  step=".01"
                  value={playback.time}
                  onChange={(event) => seek(event.target.valueAsNumber)}
                />
              </label>
              <button
                type="button"
                onClick={() => seek(playback.time + 0.02)}
                aria-label="Avançar 20 milissegundos"
              >
                +20 ms
              </button>
            </div>
          )}
          <div className="us-region-list">
            {(Object.keys(labels) as Array<keyof EchoCycleMarks>).map((id) => (
              <button key={id} onClick={() => mark(id)}>
                {labels[id]}
                {marks[id] !== undefined ? ` · ${marks[id].toFixed(2)} s` : ''}
              </button>
            ))}
            {Object.keys(marks).length > 0 && (
              <button onClick={() => setTiming(null)}>Limpar marcos</button>
            )}
          </div>
          {complete && (
            <p role="status">
              {synchronized
                ? 'Ciclo sincronizado por tempo.'
                : 'Os três marcos precisam estar em ordem cronológica.'}
            </p>
          )}
        </details>
      )}
      <p className="us-limitation">
        Os cines mudam por janela documentada. Ângulo e profundidade mudam de
        forma contínua no coração didático. A sincronização de um vídeo 2D é
        temporal. A reconstrução espacial do paciente exige uma aquisição
        volumétrica com geometria.
      </p>
    </section>
  );
}
