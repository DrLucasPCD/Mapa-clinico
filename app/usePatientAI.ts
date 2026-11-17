import { useEffect, useRef, useState } from 'react';
import type { PlantaoScenario } from './plantao-cases';
import { patientReplies } from './plantao-encounter';
import {
  patientFactPassages,
  patientQueries,
  patientReplyFromFacts,
  type PatientAIEvent,
  type PatientAIRequest,
  type PatientReply,
} from './patient-ai';

const initial = { status: 'off' as const, progress: 0, message: '' };
type State = {
  status: 'off' | 'loading' | 'ready' | 'error';
  progress: number;
  message: string;
};

export function usePatientAI(scenario: PlantaoScenario) {
  const [state, setState] = useState<State>(initial);
  const worker = useRef<Worker | null>(null);
  const ready = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pending = useRef<{
    resolve: (reply: PatientReply) => void;
    reject: (error: Error) => void;
  } | null>(null);

  function release() {
    clearTimeout(timer.current);
    worker.current?.terminate();
    worker.current = null;
    ready.current = false;
    pending.current?.reject(new Error('Interpretação interrompida'));
    pending.current = null;
  }

  useEffect(() => () => release(), []);

  function fail() {
    const wasReady = ready.current;
    release();
    setState({
      status: 'error',
      progress: 0,
      message: wasReady
        ? 'A interpretação local foi interrompida. A entrevista continua com os dados do caso.'
        : 'Não foi possível preparar a interpretação local. A entrevista com a ficha continua disponível.',
    });
  }

  function enable() {
    if (worker.current) return;
    setState({
      status: 'loading',
      progress: 0,
      message: 'Preparando o modelo de interpretação…',
    });
    try {
      const current = new Worker(
        new URL('./patient-ai.worker.ts', import.meta.url),
        { type: 'module' },
      );
      worker.current = current;
      timer.current = setTimeout(fail, 180_000);
      const failCurrent = () => {
        if (worker.current === current) fail();
      };
      current.onerror = failCurrent;
      current.onmessageerror = failCurrent;
      current.onmessage = ({ data }: MessageEvent<PatientAIEvent>) => {
        if (worker.current !== current) return;
        if (data.type === 'progress' && !ready.current) {
          setState({
            status: 'loading',
            progress: data.value,
            message: 'Preparando o modelo de interpretação…',
          });
        } else if (data.type === 'ready') {
          clearTimeout(timer.current);
          ready.current = true;
          setState({
            status: 'ready',
            progress: 1,
            message: 'Interpretação local ativa',
          });
        } else if (data.type === 'error') {
          fail();
        } else if (data.type === 'reply' && pending.current) {
          clearTimeout(timer.current);
          pending.current.resolve(
            patientReplyFromFacts(scenario, data.facts, patientReplies.unknown),
          );
          pending.current = null;
        }
      };
      const request: PatientAIRequest = {
        type: 'prepare',
        facts: patientFactPassages(scenario),
      };
      current.postMessage(request);
    } catch {
      fail();
    }
  }

  function disable() {
    release();
    setState(initial);
  }

  function respond(question: string, previousQuestion?: string) {
    const current = worker.current;
    if (!current || !ready.current || pending.current) {
      return Promise.reject(new Error('Interpretação local indisponível'));
    }
    return new Promise<PatientReply>((resolve, reject) => {
      pending.current = { resolve, reject };
      timer.current = setTimeout(fail, 15_000);
      try {
        const request: PatientAIRequest = {
          type: 'search',
          queries: patientQueries(question, previousQuestion),
        };
        current.postMessage(request);
      } catch {
        fail();
      }
    });
  }

  return { state, enable, disable, respond };
}
