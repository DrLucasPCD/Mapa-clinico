import { Download, Cpu, X } from 'lucide-react';
import type { usePatientAI } from './usePatientAI';
import type { usePatientVoice } from './usePatientVoice';

export default function PatientAIControls({
  ai,
  voice,
  pending,
}: {
  ai: ReturnType<typeof usePatientAI>;
  voice: ReturnType<typeof usePatientVoice>;
  pending: boolean;
}) {
  const state = ai.state;
  return (
    <div
      className="plantao-local-ai"
      aria-label="Opções de conversa com o paciente"
    >
      <div className="plantao-ai-heading">
        <Cpu size={18} />
        <strong>Conversa com o paciente</strong>
      </div>
      <p>
        Digite com suas palavras. O paciente responde com base na história do
        caso. A IA local é opcional e ajuda a interpretar perguntas que a ficha
        não reconhece.
      </p>
      {(state.status === 'off' || state.status === 'error') && (
        <>
          <button
            type="button"
            className="training-primary"
            onClick={() => void ai.enable()}
          >
            <Download size={15} />
            {state.status === 'error'
              ? 'Reativar IA local · modelo leve'
              : 'Ativar IA opcional · modelo leve'}
          </button>
          <small>
            Grátis, sem conta ou chave de API. Requer WebGPU. O modelo leve usa
            um download de cerca de 1 GB e pode ser menos preciso.
          </small>
          <button
            type="button"
            className="training-secondary"
            onClick={() => void ai.enable('standard')}
          >
            Usar modelo maior · cerca de 2,5 GB
          </button>
        </>
      )}
      {state.status === 'loading' && (
        <>
          <progress
            max={1}
            value={state.progress}
            aria-label="Download do modelo de conversa"
          />
          <output>
            {state.message} {Math.round(state.progress * 100)}%
          </output>
          <button
            type="button"
            className="training-secondary"
            onClick={ai.disable}
          >
            <X size={14} />
            Cancelar download
          </button>
        </>
      )}
      {state.status !== 'loading' && state.message && (
        <output>{state.message}</output>
      )}
      {state.status === 'ready' && (
        <button
          type="button"
          className="training-secondary"
          disabled={pending}
          onClick={ai.disable}
        >
          Desligar IA local
        </button>
      )}
      <div className="plantao-ai-voice">
        {voice.status === 'off' || voice.status === 'error' ? (
          <>
            <button
              type="button"
              className="training-secondary"
              onClick={voice.enable}
            >
              Ativar voz Faber para respostas livres
            </button>
            <small>
              Voz opcional, gerada neste aparelho. Download adicional de cerca
              de 90 MB.
            </small>
          </>
        ) : voice.status === 'loading' ? (
          <>
            <progress
              max={1}
              value={voice.progress}
              aria-label="Download da voz Faber"
            />
            <output>
              Preparando voz Faber… {Math.round(voice.progress * 100)}%
            </output>
            <button
              type="button"
              className="training-secondary"
              onClick={voice.disable}
            >
              Cancelar voz
            </button>
          </>
        ) : (
          <output>Voz Faber local pronta</output>
        )}
        {voice.status === 'error' && (
          <output>
            Não foi possível preparar a voz. Você pode continuar a conversa por
            texto.
          </output>
        )}
      </div>
      <small>
        As mensagens digitadas são processadas aqui. O download acessa Hugging
        Face e o distribuidor do WebLLM. A IA pode cometer erros e não substitui
        a correção do caso.
      </small>
    </div>
  );
}
