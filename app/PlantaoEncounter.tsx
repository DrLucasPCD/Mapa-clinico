import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Activity,
  ClipboardList,
  Mic,
  Send,
  SlidersHorizontal,
  Square,
  UserRound,
  X,
} from 'lucide-react';
import type { PlantaoScenario } from './plantao-cases';
import { patientIdentity, patientVitals } from './plantao-encounter';

type Recognition = {
  lang: string;
  interimResults: boolean;
  onresult:
    | ((event: {
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

export type EncounterTurn = {
  question: string;
  answer: string;
};

export function PatientPortrait({
  scenario,
  speaking = false,
}: {
  scenario: PlantaoScenario;
  speaking?: boolean;
}) {
  const { portrait } = patientIdentity(scenario);
  return (
    <span
      className={'plantao-portrait' + (speaking ? ' is-speaking' : '')}
      aria-hidden="true"
    >
      <span className={'plantao-portrait-image patient-' + portrait}>
        <UserRound size={46} />
      </span>
    </span>
  );
}

export function PatientVitals({
  scenario,
  compact = false,
}: {
  scenario: PlantaoScenario;
  compact?: boolean;
}) {
  return (
    <div
      className={
        'plantao-monitor' + (compact ? ' plantao-monitor-compact' : '')
      }
    >
      {!compact && (
        <div className="plantao-monitor-heading">
          <Activity size={16} /> Sinais vitais simulados
        </div>
      )}
      <dl aria-label="Sinais vitais simulados">
        {patientVitals(scenario).map(({ id, short, label, value, unit }) => (
          <div key={id}>
            <dt>{compact ? label : <abbr title={label}>{short}</abbr>}</dt>
            <dd>
              {value ?? (
                <span aria-label="Não informado">
                  {compact ? 'Não informado' : '—'}
                </span>
              )}{' '}
              {unit && <small>{unit}</small>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function EncounterDialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  return (
    <dialog
      className="plantao-dialog"
      ref={dialog}
      aria-labelledby="plantao-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header>
        <h3 id="plantao-dialog-title">{title}</h3>
        <button type="button" aria-label="Fechar painel" onClick={onClose}>
          <X size={20} />
        </button>
      </header>
      <div className="plantao-dialog-content">{children}</div>
    </dialog>
  );
}

export default function PlantaoEncounter({
  scenario,
  latest,
  asked,
  speaking,
  onAsk,
  onOpen,
  onStopVoice,
  voiceButton,
  aiControls,
  pending = false,
  pendingQuestion,
  conversationNote,
  onUseCaseAnswer,
}: {
  scenario: PlantaoScenario;
  latest?: EncounterTurn;
  asked: readonly number[];
  speaking: boolean;
  onAsk: (text: string) => void;
  onOpen: (panel: 'record' | 'actions') => void;
  onStopVoice: () => void;
  voiceButton: (key: string, text: string, label: string) => ReactNode;
  aiControls?: ReactNode;
  pending?: boolean;
  pendingQuestion?: string;
  conversationNote?: string;
  onUseCaseAnswer: () => void;
}) {
  const [draft, setDraft] = useState('');
  const [micState, setMicState] = useState<
    'idle' | 'listening' | 'transcribing'
  >('idle');
  const [micMessage, setMicMessage] = useState('');
  const recognition = useRef<Recognition | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const browser =
    typeof window === 'undefined' ? undefined : (window as SpeechWindow);
  const SpeechRecognition =
    browser?.SpeechRecognition ?? browser?.webkitSpeechRecognition;
  const listening = micState !== 'idle';
  const { name, speaker } = patientIdentity(scenario);

  useEffect(
    () => () => {
      if (recognition.current) {
        recognition.current.onend = null;
        recognition.current.onerror = null;
        recognition.current.onresult = null;
        recognition.current.abort();
      }
    },
    [],
  );

  function toggleMicrophone() {
    if (!SpeechRecognition) return;
    if (listening) {
      if (micState === 'listening') {
        setMicState('transcribing');
        recognition.current?.stop();
      }
      return;
    }
    setMicMessage('');
    onStopVoice();
    try {
      const session = new SpeechRecognition();
      session.lang = 'pt-BR';
      session.interimResults = false;
      recognition.current = session;
      session.onresult = (event) => {
        if (recognition.current !== session) return;
        const transcript = Array.from(
          event.results,
          (result) => result[0]?.transcript ?? '',
        )
          .join(' ')
          .trim();
        if (transcript) {
          setDraft(transcript.slice(0, 420));
          setMicMessage('Revise a transcrição antes de enviar.');
          input.current?.focus();
        }
      };
      session.onerror = (event) => {
        if (recognition.current !== session) return;
        recognition.current = null;
        setMicState('idle');
        setMicMessage(
          event.error === 'not-allowed' || event.error === 'service-not-allowed'
            ? 'O microfone não foi autorizado. Você pode digitar a pergunta.'
            : 'A transcrição está indisponível. Você pode digitar a pergunta.',
        );
      };
      session.onend = () => {
        if (recognition.current !== session) return;
        recognition.current = null;
        setMicState('idle');
      };
      setMicState('listening');
      session.start();
    } catch {
      recognition.current = null;
      setMicState('idle');
      setMicMessage(
        'Não foi possível iniciar o microfone. Você pode digitar a pergunta.',
      );
    }
  }

  function send(text: string) {
    if (listening || pending || !text.trim()) return;
    onAsk(text.trim());
    setDraft('');
    setMicMessage('');
  }

  return (
    <section className="plantao-encounter" aria-label="Conversa com o paciente">
      <div className="plantao-conversation-head">
        <PatientPortrait scenario={scenario} speaking={speaking} />
        <p className="plantao-person-role">
          {speaker} · {name}
        </p>
        <h3>Fale com o paciente</h3>
        <output className="plantao-conversation-state">
          {micState === 'listening'
            ? 'Ouvindo sua pergunta…'
            : micState === 'transcribing'
              ? 'Transcrevendo…'
              : pending
                ? 'O paciente está respondendo…'
                : speaking
                  ? 'Resposta do paciente em reprodução…'
                  : 'Faça uma pergunta de cada vez.'}
        </output>
      </div>
      {aiControls}
      <div className="plantao-encounter-actions">
        <button
          type="button"
          className="training-secondary"
          onClick={() => onOpen('record')}
        >
          <ClipboardList size={16} /> Ficha do paciente
        </button>
        <button
          type="button"
          className="training-secondary"
          onClick={() => onOpen('actions')}
        >
          <SlidersHorizontal size={16} /> Intervenções
        </button>
        <button
          type="button"
          className="training-primary plantao-mic"
          disabled={
            !SpeechRecognition || micState === 'transcribing' || pending
          }
          onClick={toggleMicrophone}
        >
          {listening ? <Square size={16} /> : <Mic size={16} />}
          {listening ? 'Finalizar ditado' : 'Falar agora'}
        </button>
        <p className="plantao-mic-note">
          {SpeechRecognition
            ? 'O navegador pode usar um serviço de voz para transcrever. Revise o texto antes de enviar.'
            : 'Este navegador oferece a conversa por texto.'}
        </p>
      </div>
      <form
        className="plantao-message-form"
        onSubmit={(event) => {
          event.preventDefault();
          send(draft);
        }}
      >
        <input
          ref={input}
          value={draft}
          placeholder="Pergunta ou orientação…"
          aria-label="Mensagem para o paciente"
          maxLength={420}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button
          className="training-primary"
          type="submit"
          disabled={listening || pending || !draft.trim()}
        >
          <Send size={15} /> Enviar
        </button>
      </form>
      {micMessage && <output className="training-note">{micMessage}</output>}
      {pending && (
        <div className="training-note">
          <output>
            Você perguntou «{pendingQuestion}». Consultando a IA local…
          </output>
          <button
            type="button"
            className="training-secondary"
            onClick={onUseCaseAnswer}
          >
            Responder com a ficha agora
          </button>
        </div>
      )}
      {conversationNote && (
        <output className="training-note">{conversationNote}</output>
      )}
      <div className="plantao-suggestions" aria-label="Sugestões de perguntas">
        {scenario.interview.map((entry, i) => (
          <button
            className="training-secondary"
            key={entry.question}
            type="button"
            data-asked={asked.includes(i)}
            disabled={listening || pending}
            onClick={() => send(entry.question)}
          >
            {entry.question}
          </button>
        ))}
      </div>
      {latest && (
        <article
          className="plantao-dialogue"
          aria-label="Última resposta do paciente"
        >
          <p className="plantao-last-question">
            <span>Você</span> {latest.question}
          </p>
          <div className="plantao-reply">
            <p>
              <span>{name}</span> {latest.answer}
            </p>
            {voiceButton('reply', latest.answer, 'Ouvir resposta')}
          </div>
        </article>
      )}
    </section>
  );
}
