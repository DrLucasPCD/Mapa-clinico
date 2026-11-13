import { useState } from 'react';
import { ArrowRight, ClipboardList, Stethoscope } from 'lucide-react';
import { biliaryImagingReference, gallbladderImage, interview, plantaoDecisions } from './training-data';
import { recordTrainingReview } from './training-review';

const stages = ['Entrevista', 'Exame', 'Imagem', 'Hipótese', 'Devolutiva'];
type Mode = 'guided' | 'exam';

export default function Plantao({ onAtlas, onUltrasound, reviewDecision }: {
  onAtlas: () => void; onUltrasound: () => void; reviewDecision?: number;
}) {
  const [reviewing, setReviewing] = useState(reviewDecision !== undefined);
  const [mode, setMode] = useState<Mode | null>(reviewing ? 'guided' : null);
  const [step, setStep] = useState(reviewDecision === undefined ? 0 : reviewDecision + 1);
  const [asked, setAsked] = useState<number[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [choice, setChoice] = useState<number | null>(null);
  const [hint, setHint] = useState(false);
  const decision = plantaoDecisions[step - 1];
  const confirmed = step > 0 && answers[step - 1] !== undefined;
  const askedKey = asked.filter(index => interview[index].key).length;

  function start(next: Mode | null) {
    setReviewing(false);
    setMode(next);
    setStep(0);
    setAsked([]);
    setAnswers([]);
    setChoice(null);
    setHint(false);
  }

  function advance() {
    setStep(value => value + 1);
    setChoice(null);
    setHint(false);
  }

  function submit() {
    if (choice === null || !decision || confirmed) return;
    const nextAnswers = [...answers];
    nextAnswers[step - 1] = choice;
    setAnswers(nextAnswers);
    if (reviewing) {
      recordTrainingReview('plantao', String(step - 1), choice === decision.correct);
    } else if (step === 3) {
      plantaoDecisions.forEach((item, index) => recordTrainingReview('plantao', String(index), nextAnswers[index] === item.correct));
    }
    if (mode === 'exam') advance();
  }

  return (
    <section id="plantao" className="training-screen plantao-screen" aria-labelledby="plantao-title">
      <header className="training-header">
        <span className="training-icon"><Stethoscope size={23} /></span>
        <div><h2 id="plantao-title">Modo Plantão</h2><p>Dor no hipocôndrio direito</p></div>
      </header>
      <div className="plantao-layout">
        <aside className="training-card plantao-chart">
          <h3><ClipboardList size={18} /> Prontuário da simulação</h3>
          <p><strong>Mulher, 35 anos</strong><br />«Senti uma dor do lado direito da barriga.»</p>
          <small>História complementar fictícia com USG real.</small>
          {mode && <ol className="plantao-progress" aria-label="Etapas do atendimento">
            {stages.map((item, index) => <li key={item} aria-current={step === index ? 'step' : undefined} className={index <= step ? 'reached' : ''}>{item}</li>)}
          </ol>}
          {asked.length > 0 && <details><summary>Respostas da paciente ({asked.length})</summary>
            <ul>{asked.map(index => <li key={index}><strong>{interview[index].question}</strong><br />{interview[index].answer}</li>)}</ul>
          </details>}
        </aside>
        <div className="training-card plantao-stage">
          {!mode && <>
            <h3>Escolha como atender</h3>
            <div className="plantao-mode">
              <button onClick={() => start('guided')}><strong>Modo guiado</strong><span>Dicas sob demanda e comentários após cada decisão.</span><ArrowRight size={18} /></button>
              <button onClick={() => start('exam')}><strong>Modo prova</strong><span>As respostas e explicações aparecem na devolutiva.</span><ArrowRight size={18} /></button>
            </div>
          </>}
          {mode && step === 0 && <>
            <h3>O que você quer perguntar?</h3>
            <p>Escolha até três perguntas antes de solicitar o exame.</p>
            <div className="training-options">
              {interview.map((item, index) => <div key={item.question}>
                <button disabled={asked.includes(index) || asked.length === 3}
                  onClick={() => setAsked(previous => [...previous, index])}>{item.question}</button>
                {asked.includes(index) && <p className="training-feedback">{item.answer}</p>}
              </div>)}
            </div>
            {mode === 'guided' && <details><summary>Ver dica</summary><p>Pense na evolução da dor e em sinais de inflamação ou obstrução biliar.</p></details>}
            <button className="training-primary" onClick={advance}>Ir para a escolha do exame <ArrowRight size={16} /></button>
          </>}
          {mode && decision && <>
            {step === 2 && <figure className="training-figure">
              <img src={gallbladderImage.image} alt="Ultrassonografia do quadrante superior direito. Observe a vesícula." />
              <figcaption>USG do caso · {gallbladderImage.author}, Radiopaedia (rID 27525) · <a href="https://radiopaedia.org/licence" target="_blank" rel="noreferrer">Licença</a></figcaption>
            </figure>}
            {step === 3 && <p className="training-feedback"><strong>Laudo resumido</strong><br />Múltiplos cálculos intravesiculares com sombra acústica posterior.</p>}
            <fieldset className="training-options">
              <legend>{decision.title}</legend>
              {decision.options.map((option, index) => <label key={option}>
                <input type="radio" name={`plantao-${step}`} checked={choice === index} disabled={confirmed} onChange={() => setChoice(index)} />{option}
              </label>)}
            </fieldset>
            {mode === 'guided' && !confirmed && <button className="training-secondary" aria-expanded={hint} onClick={() => setHint(value => !value)}>Dica</button>}
            {hint && !confirmed && <p className="training-feedback">{decision.hint}</p>}
            {!confirmed && <button className="training-primary" disabled={choice === null} onClick={submit}>{mode === 'exam' ? 'Registrar e continuar' : 'Conferir decisão'} <ArrowRight size={16} /></button>}
            {confirmed && <>
              <div className="training-feedback" role="status"><strong>{choice === decision.correct ? 'Correto' : decision.options[decision.correct]}</strong><p>{decision.explanation}</p></div>
              <button className="training-primary" onClick={reviewing ? () => start(null) : advance}>{reviewing ? 'Voltar ao início do plantão' : stages[step + 1]} <ArrowRight size={16} /></button>
            </>}
          </>}
          {mode && step === 4 && <>
            <h3>Devolutiva</h3>
            <p><strong>{answers.filter((answer, index) => answer === plantaoDecisions[index].correct).length} de 3 decisões corretas</strong> · {askedKey} de 3 pistas principais exploradas.</p>
            <details><summary>Rever as pistas da entrevista</summary><ul>
              {interview.filter(item => item.key).map(item => <li key={item.question}><strong>{item.question}</strong> {item.answer}</li>)}
            </ul></details>
            <ol className="plantao-results">{plantaoDecisions.map((item, index) => <li key={item.title}>
              <strong>{item.title}</strong>
              <p>Sua escolha: {item.options[answers[index]]}</p>
              <p>{item.explanation}</p>
            </li>)}</ol>
            <div className="training-actions">
              <button className="training-primary" onClick={onAtlas}>Rever vesícula no Atlas 3D</button>
              <button className="training-secondary" onClick={onUltrasound}>Praticar no simulador de USG</button>
              <button className="training-secondary" onClick={() => start(null)}>Refazer atendimento</button>
            </div>
            <p className="training-note">Imagem de {gallbladderImage.author}. <a href={gallbladderImage.source} target="_blank" rel="noreferrer">Caso original · Radiopaedia</a> · <a href="https://radiopaedia.org/licence" target="_blank" rel="noreferrer">Licença</a> · <a href={biliaryImagingReference} target="_blank" rel="noreferrer">Escolha do exame · ACR</a></p>
          </>}
        </div>
      </div>
    </section>
  );
}
