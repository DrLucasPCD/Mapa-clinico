import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { conductionSteps } from './ecg-conduction';

const EcgHeart = lazy(() => import('./EcgHeart'));
const ends = conductionSteps.map((_, index) =>
  conductionSteps.slice(0, index + 1).reduce((sum, step) => sum + step.duration, 0));
const total = ends[ends.length - 1];

export default function EcgConduction() {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [stepPreview, setStepPreview] = useState(true);
  const playbackStart = useRef(0);
  const found = ends.findIndex(end => time < end);
  const index = found < 0 ? conductionSteps.length - 1 : found;
  const step = conductionSteps[index];
  const progress = stepPreview ? 1 : Math.min(1, (time - (ends[index - 1] ?? 0)) / step.duration);

  function seek(next: number) {
    setPlaying(false);
    setStepPreview(true);
    setTime(ends[next - 1] ?? 0);
  }

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let start: number | undefined;
    const initial = playbackStart.current;
    const advance = (timestamp: number) => {
      start ??= timestamp;
      const next = initial + (timestamp - start) / 1000;
      setTime(Math.min(next, total));
      if (next < total) frame = requestAnimationFrame(advance);
      else setPlaying(false);
    };
    frame = requestAnimationFrame(advance);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  return <div className="ecg-conduction">
    <div className="ecg-pair">
      <div className="ecg-model">
        <header><strong>Condução no coração 3D</strong><span>Ritmo sinusal</span></header>
        <Suspense fallback={<p>Preparando coração 3D…</p>}>
          <EcgHeart mode="conduction" stage={{ index, progress }} />
        </Suspense>
        <div className="ecg-legend"><span><i /> Frente de ativação</span><span><i /> Percurso já ativado</span></div>
      </div>
      <div className="training-card ecg-conduction-details">
        <h3>{step.label}</h3>
        <p><strong>{step.wave}</strong></p>
        <p>{step.detail}</p>
        <div className="training-actions">
          <button className="training-secondary" aria-label="Etapa anterior" disabled={index === 0} onClick={() => seek(index - 1)}><ChevronLeft size={17} /></button>
          <button className="training-primary" onClick={() => {
            if (!playing) {
              playbackStart.current = time >= total ? 0 : time;
              setStepPreview(false);
            }
            setPlaying(!playing);
          }}>
            {playing ? <Pause size={16} /> : <Play size={16} />}{playing ? 'Pausar' : 'Reproduzir condução'}
          </button>
          <button className="training-secondary" aria-label="Próxima etapa" disabled={index === conductionSteps.length - 1} onClick={() => seek(index + 1)}><ChevronRight size={17} /></button>
        </div>
        <nav className="ecg-conduction-steps" aria-label="Etapas da condução elétrica">
          {conductionSteps.map((item, i) => <button key={item.id} aria-current={i === index ? 'step' : undefined} onClick={() => seek(i)}>
            <span>{i + 1}</span>{item.label}
          </button>)}
        </nav>
      </div>
    </div>
    <p className="training-note">Trajeto e tempo ilustrativos. As posições dos nós, dos ramos e das fibras são esquemáticas no modelo 3D. <a href="https://openstax.org/books/anatomy-and-physiology-2e/pages/19-2-cardiac-muscle-and-electrical-activity" target="_blank" rel="noreferrer">Condução cardíaca · OpenStax</a></p>
  </div>;
}
