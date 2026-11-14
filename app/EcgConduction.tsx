import { conductionSteps } from './ecg-conduction';
import type { ConductionStage } from './ecg-model';

type Props = {
  stage: ConductionStage | null;
  available: readonly boolean[];
  onSeek: (index: number) => void;
};

export default function EcgConduction({ stage, available, onSeek }: Props) {
  const step = stage ? conductionSteps[stage.index] : null;

  return <section className="training-card ecg-conduction-details" aria-label="Etapas da condução no ECG">
    <h3>Condução no traçado</h3>
    <p>Selecione uma etapa para mover o cursor e ver onde ela ocorre no ECG.</p>
    <nav className="ecg-conduction-steps" aria-label="Ir para uma etapa no traçado">
      {conductionSteps.map((item, index) => <button key={item.id} disabled={!available[index]}
        aria-current={stage?.index === index ? 'step' : undefined} onClick={() => onSeek(index)}>
        <span>{index + 1}</span>{item.label}
      </button>)}
    </nav>
    <p className="training-feedback ecg-stage-feedback">
      {step ? <><strong>{step.label} · {step.wave}</strong><br />{step.detail}</> : 'O cursor está entre as etapas destacadas.'}
    </p>
    <p className="training-note">Percurso e tempos esquemáticos. <a href="https://openstax.org/books/anatomy-and-physiology-2e/pages/19-2-cardiac-muscle-and-electrical-activity" target="_blank" rel="noreferrer">Condução cardíaca · OpenStax</a></p>
  </section>;
}
