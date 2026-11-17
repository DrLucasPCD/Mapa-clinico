import { useEffect, useRef, useState } from 'react';
import type { WebWorkerMLCEngine } from '@mlc-ai/web-llm';
import type { PlantaoScenario } from './plantao-cases';
import {
  parsePatientReply,
  patientMessages,
  patientReplySchema,
  type PatientTurn,
} from './patient-ai';

type GPU = {
  requestAdapter: () => Promise<{
    features: { has: (feature: string) => boolean };
  } | null>;
};
export type PatientAIState = {
  status: 'checking' | 'off' | 'loading' | 'ready' | 'error' | 'unsupported';
  progress: number;
  message: string;
};
const initial: PatientAIState = {
  status: 'checking',
  progress: 0,
  message: 'Verificando suporte à IA local…',
};

export function usePatientAI() {
  const [state, setState] = useState(initial);
  const engine = useRef<WebWorkerMLCEngine | null>(null);
  const worker = useRef<Worker | null>(null);
  const revision = useRef(0);
  const busy = useRef(false);
  const activeLoad = useRef(false);
  const f16 = useRef(true);
  const loadTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  function release() {
    revision.current++;
    clearTimeout(loadTimer.current);
    worker.current?.terminate();
    worker.current = null;
    engine.current = null;
    busy.current = false;
    activeLoad.current = false;
  }

  useEffect(() => {
    let active = true;
    const gpu = (navigator as Navigator & { gpu?: GPU }).gpu;
    void (async () => {
      try {
        const adapter = await gpu?.requestAdapter();
        if (!active) return;
        if (!adapter) {
          setState({
            status: 'unsupported',
            progress: 0,
            message:
              'A conversa livre precisa de WebGPU. Tente uma versão recente do Chrome ou Edge em um aparelho compatível. As perguntas guiadas continuam disponíveis.',
          });
          return;
        }
        f16.current = adapter.features.has('shader-f16');
        setState({ status: 'off', progress: 0, message: '' });
      } catch {
        if (active)
          setState({
            status: 'unsupported',
            progress: 0,
            message:
              'Não foi possível acessar a GPU neste navegador. As perguntas guiadas continuam disponíveis.',
          });
      }
    })();
    return () => {
      active = false;
      release();
    };
  }, []);

  async function enable() {
    if (activeLoad.current || engine.current) return;
    release();
    activeLoad.current = true;
    const request = revision.current;
    setState({
      status: 'loading',
      progress: 0,
      message: 'Baixando e preparando o modelo…',
    });
    const fail = () => {
      if (revision.current !== request) return;
      release();
      setState({
        status: 'error',
        progress: 0,
        message:
          'Não foi possível preparar a IA local. Confira a conexão e a memória disponível e tente novamente.',
      });
    };
    loadTimer.current = setTimeout(fail, 300_000);
    try {
      const { WebWorkerMLCEngine, prebuiltAppConfig } =
        await import('@mlc-ai/web-llm');
      if (request !== revision.current) return;
      const modelId = f16.current
        ? 'Qwen3-4B-q4f16_1-MLC'
        : 'Qwen3-4B-q4f32_1-MLC';
      const record = prebuiltAppConfig.model_list.find(
        (model) => model.model_id === modelId,
      )!;
      const modelRevision = f16.current
        ? 'a5c9fab855e3ccbdfed2e7e69683d75f30332161'
        : 'b7e4eb1ba80728187fb5df44055cc1a7c32310e0';
      worker.current = new Worker(
        new URL('./patient-ai.worker.ts', import.meta.url),
        { type: 'module' },
      );
      worker.current.onerror = fail;
      const local = new WebWorkerMLCEngine(worker.current, {
        appConfig: {
          model_list: [
            { ...record, model: `${record.model}/resolve/${modelRevision}/` },
          ],
        },
        initProgressCallback: ({ progress }) => {
          if (request === revision.current)
            setState({
              status: 'loading',
              progress: Math.max(0, Math.min(1, progress)),
              message: 'Baixando e preparando o modelo…',
            });
        },
      });
      await local.reload(modelId, { context_window_size: 4096 });
      if (request !== revision.current) return;
      clearTimeout(loadTimer.current);
      activeLoad.current = false;
      engine.current = local;
      setState({
        status: 'ready',
        progress: 1,
        message: 'Conversa livre ativa neste aparelho',
      });
    } catch {
      fail();
    }
  }

  function disable() {
    release();
    setState({ status: 'off', progress: 0, message: '' });
  }

  function interrupt() {
    if (busy.current) disable();
    else engine.current?.interruptGenerate();
  }

  async function respond(
    scenario: PlantaoScenario,
    history: readonly PatientTurn[],
    question: string,
  ) {
    const local = engine.current;
    if (!local || busy.current)
      throw new Error('A IA local está indisponível.');
    busy.current = true;
    const request = revision.current;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const completion = await Promise.race([
        local.chat.completions.create({
          messages: patientMessages(scenario, history, question),
          temperature: 0,
          max_tokens: 220,
          response_format: {
            type: 'json_object',
            schema: patientReplySchema(scenario.interview.length),
          },
          extra_body: { enable_thinking: false },
        }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('Tempo de resposta excedido')),
            60_000,
          );
        }),
      ]);
      if (request !== revision.current)
        throw new Error('Conversa interrompida');
      if (completion.choices[0]?.finish_reason !== 'stop')
        throw new Error(
          `Resposta incompleta (${completion.choices[0]?.finish_reason})`,
        );
      return parsePatientReply(
        completion.choices[0]?.message.content ?? '',
        scenario,
      );
    } catch (error) {
      console.warn('Falha na inferência local do paciente', error);
      if (request === revision.current) {
        release();
        setState({
          status: 'error',
          progress: 0,
          message:
            'A IA local interrompeu a resposta. Ative-a novamente ou continue com as perguntas guiadas.',
        });
      }
      throw error;
    } finally {
      clearTimeout(timer);
      if (request === revision.current) busy.current = false;
    }
  }

  return { state, enable, disable, respond, interrupt };
}
