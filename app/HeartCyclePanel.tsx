import { useEffect, useMemo, useState, type RefObject } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { heartCycle } from './heart-cycle';
import { ecgBeats, electricalVector, projectLead } from './ecg-model';

export default function HeartCyclePanel({
  bpm,
  time,
  onSeek,
}: {
  bpm: number;
  time: RefObject<number>;
  onSeek: (seconds: number) => void;
}) {
  const period = 60 / bpm;
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    let frame = 0,
      last = 0;
    function draw(now: number) {
      if (now - last >= 32) {
        last = now;
        setSeconds(time.current);
      }
      frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [time]);
  const paths = useMemo(() => {
    const beats = ecgBeats('sinus', bpm, period);
    const lines = [[], [], [], [], []] as string[][];
    for (let i = 0; i <= 160; i++) {
      const t = (i / 160) * period;
      const m = heartCycle(t, bpm);
      const ecg = projectLead(electricalVector(t, beats, 'sinus', 55), 'II');
      const y = [
        24 - ecg * 17,
        87 - m.pressureLV * 0.36,
        87 - m.pressureRV * 0.36,
        151 - m.volumeLV * 0.41,
        151 - m.volumeRV * 0.41,
      ];
      y.forEach((value, line) =>
        lines[line].push(
          (i ? 'L' : 'M') +
            ((i / 160) * 310).toFixed(2) +
            ',' +
            value.toFixed(2),
        ),
      );
    }
    return lines.map((segments) => segments.join(' '));
  }, [bpm, period]);
  const motion = heartCycle(seconds, bpm);
  const phaseTime = motion.seconds;
  function seek(next: number) {
    const wrapped = ((next % period) + period) % period;
    onSeek(wrapped);
    setSeconds(wrapped);
  }
  return (
    <section
      className="heart-cycle-panel"
      aria-label="Ciclo cardíaco e traçados sincronizados"
    >
      <div className="heart-cycle-summary">
        <h3>{motion.phase}</h3>
        <span>
          {Math.round(phaseTime * 1000)} / {Math.round(period * 1000)} ms
        </span>
      </div>
      <div className="heart-cycle-controls">
        <button
          aria-label="Quadro anterior do batimento"
          onClick={() => seek(phaseTime - 1 / 60)}
        >
          <ChevronLeft size={17} />
        </button>
        <input
          aria-label="Posição no ciclo cardíaco"
          type="range"
          min={0}
          max={Math.ceil(period * 1000) - 1}
          value={Math.floor(phaseTime * 1000)}
          onChange={(event) => seek(event.target.valueAsNumber / 1000)}
        />
        <button
          aria-label="Próximo quadro do batimento"
          onClick={() => seek(phaseTime + 1 / 60)}
        >
          <ChevronRight size={17} />
        </button>
      </div>
      <div className="heart-cycle-valves" aria-label="Estado das valvas">
        {(
          [
            ['mitral', 'Mitral'],
            ['tricuspid', 'Tricúspide'],
            ['aortic', 'Aórtica'],
            ['pulmonary', 'Pulmonar'],
          ] as const
        ).map(([id, name]) => {
          const open = motion.valves[id] > 0.05;
          return (
            <span key={id} data-open={open}>
              {name} {open ? 'aberta' : 'fechada'}
            </span>
          );
        })}
      </div>
      <div className="heart-cycle-graph">
        <div className="heart-cycle-labels">
          <span>ECG · DII</span>
          <span>
            Pressão ventricular{' '}
            <small>
              {Math.round(motion.pressureLV)} / {Math.round(motion.pressureRV)}{' '}
              mmHg
            </small>
          </span>
          <span>
            Volume ventricular{' '}
            <small>
              {Math.round(motion.volumeLV)} / {Math.round(motion.volumeRV)} mL
            </small>
          </span>
        </div>
        <svg
          preserveAspectRatio="none"
          viewBox="0 0 310 150"
          role="img"
          aria-label="ECG sintético, pressão e volume de ambos os ventrículos"
        >
          <path
            d="M0 30 H310 M0 43 H310 M0 88 H310 M0 96 H310 M0 140 H310"
            stroke="#426770"
            fill="none"
          />
          {paths.map((path, i) => (
            <path
              key={i}
              d={path}
              stroke={
                ['#8fe8bb', '#ffab86', '#63cfff', '#ffab86', '#63cfff'][i]
              }
              strokeWidth="1.4"
              fill="none"
            />
          ))}
          <line
            x1={(phaseTime / period) * 310}
            x2={(phaseTime / period) * 310}
            y1="2"
            y2="145"
            stroke="#f8e7b0"
          />
        </svg>
      </div>
      <div className="heart-cycle-summary">
        <small>
          <span className="cycle-lv">Ventrículo esquerdo</span> ·{' '}
          <span className="cycle-rv">Ventrículo direito</span>
        </small>
        <small>Traçados didáticos</small>
      </div>
    </section>
  );
}
