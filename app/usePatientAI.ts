import { useEffect, useRef, useState } from 'react';
import type { WebWorkerMLCEngine } from '@mlc-ai/web-llm';
import type { PlantaoScenario } from './plantao-cases';
import {
  parsePatientReply,
  patientMessages,
  type PatientReply,
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
const models = {
  standard: {
    size: '4B',
    f16: 'a5c9fab855e3ccbdfed2e7e69683d75f30332161',
    f32: 'b7e4eb1ba80728187fb5df44055cc1a7c32310e0',
    context: 4096,
  },
  light: {
    size: '1.7B',
    f16: '80b3abcec6c3b3f5355dc0cc99cc4fb578f192bc',
    f32: 'bddd4d584cabe19113f7e4ff46fd9e73b4d3dc89',
    context: 3072,
  },
};

export function usePatientAI() {
  const [state, setState] = useState(initial);
  const engine = useRef<WebWorkerMLCEngine | null>(null);
  const worker = useRef<Worker | null>(null);
  const revision = useRef(0);
  const busy = useRef(false);
  const cancelResponse = useRef<(() => void) | undefined>(undefined);
  const activeLoad = useRef(false);
  const f16 = useRef(true);
  const loadTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  function release() {
    revision.current++;
    cancelResponse.current?.();
    cancelResponse.current = undefined;
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

  async function enable(profile: keyof typeof models = 'light') {
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
      const wasLoading = activeLoad.current;
      release();
      setState({
        status: 'error',
        progress: 0,
        message: wasLoading
          ? 'Não foi possível preparar a IA local. Confira a conexão e a memória disponível.'
          : 'A IA local foi interrompida. Você pode reativá-la e reenviar a pergunta.',
      });
    };
    loadTimer.current = setTimeout(fail, 300_000);
    try {
      const { WebWorkerMLCEngine, prebuiltAppConfig } =
        await import('@mlc-ai/web-llm');
      if (request !== revision.current) return;
      const model = models[profile];
      const precision = f16.current ? 'f16' : 'f32';
      const modelId = `Qwen3-${model.size}-q4${precision}_1-MLC`;
      const record = prebuiltAppConfig.model_list.find(
        (model) => model.model_id === modelId,
      )!;
      const modelRevision = model[precision];
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
          if (request === revision.current && activeLoad.current)
            setState({
              status: 'loading',
              progress: Math.max(0, Math.min(1, progress)),
              message: 'Baixando e preparando o modelo…',
            });
        },
      });
      await local.reload(modelId, { context_window_size: model.context });
      if (request !== revision.current) return;
      clearTimeout(loadTimer.current);
      activeLoad.current = false;
      engine.current = local;
      setState({
        status: 'ready',
        progress: 1,
        message:
          profile === 'light'
            ? 'Conversa livre ativa · modelo leve'
            : 'Conversa livre ativa neste aparelho',
      });
    } catch {
      fail();
    }
  }

  function disable() {
    release();
    setState({ status: 'off', progress: 0, message: '' });
  }

  async function respond(
    scenario: PlantaoScenario,
    history: readonly PatientTurn[],
    question: string,
  ): Promise<PatientReply> {
    const local = engine.current;
    if (!local || busy.current)
      throw new Error('A IA local está indisponível.');
    busy.current = true;
    const request = revision.current;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let content: string;
    let finishReason: string | null | undefined;
    try {
      const completion = await Promise.race([
        // WebLLM may dispose its GrammarMatcher during GPU loss. Validate ordinary
        // text here so generation does not depend on that native matcher.
        local.chat.completions.create({
          messages: patientMessages(scenario, history, question),
          temperature: 0,
          max_tokens: 48,
          extra_body: { enable_thinking: false },
        }),
        new Promise<never>((_, reject) => {
          cancelResponse.current = () =>
            reject(new Error('Conversa interrompida'));
          timer = setTimeout(
            () => reject(new Error('Tempo de resposta excedido')),
            60_000,
          );
        }),
      ]);
      if (request !== revision.current)
        throw new Error('Conversa interrompida');
      finishReason = completion.choices[0]?.finish_reason;
      content = completion.choices[0]?.message.content ?? '';
    } catch (error) {
      if (request === revision.current) {
        console.warn('Falha na inferência local do paciente', error);
        release();
        setState({
          status: 'error',
          progress: 0,
          message:
            'A IA local interrompeu a resposta. Reative-a para reenviar a pergunta.',
        });
      }
      throw error;
    } finally {
      clearTimeout(timer);
      if (request === revision.current) {
        cancelResponse.current = undefined;
        busy.current = false;
      }
    }
    // Misformatted output does not invalidate a working engine. The question
    // stays available for retry and the conversation is only updated on success.
    if (finishReason !== 'stop' && finishReason !== 'length')
      throw new Error('Resposta incompleta');
    return parsePatientReply(content, scenario);
  }

  return { state, enable, disable, respond };
}
