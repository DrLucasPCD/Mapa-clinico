import { useEffect, useRef, useState } from 'react';

export function usePatientVoice() {
  const [status, setStatus] = useState<'off' | 'loading' | 'ready' | 'error'>(
    'off',
  );
  const [progress, setProgress] = useState(0);
  const worker = useRef<Worker | null>(null);
  const pending = useRef(
    new Map<
      number,
      {
        resolve: (blob: Blob) => void;
        reject: (error: Error) => void;
        timer: ReturnType<typeof setTimeout>;
      }
    >(),
  );
  const id = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function release() {
    clearTimeout(timer.current);
    worker.current?.terminate();
    worker.current = null;
    for (const request of pending.current.values()) {
      clearTimeout(request.timer);
      request.reject(new Error('Fala interrompida'));
    }
    pending.current.clear();
  }
  useEffect(() => () => release(), []);

  function enable() {
    if (worker.current) return;
    setStatus('loading');
    setProgress(0);
    const current = new Worker(
      new URL('./patient-voice.worker.ts', import.meta.url),
      { type: 'module' },
    );
    worker.current = current;
    const fail = () => {
      if (worker.current === current) {
        release();
        setStatus('error');
      }
    };
    timer.current = setTimeout(fail, 180_000);
    current.onerror = fail;
    current.onmessage = ({
      data,
    }: MessageEvent<{
      id: number;
      type: string;
      progress: number;
      audio: Blob;
    }>) => {
      if (worker.current !== current) return;
      if (data.type === 'progress') setProgress(data.progress);
      else if (data.type === 'ready') {
        clearTimeout(timer.current);
        setStatus('ready');
      } else if (data.type === 'error') fail();
      else if (data.type === 'audio') {
        const request = pending.current.get(data.id);
        if (request) {
          clearTimeout(request.timer);
          request.resolve(data.audio);
          pending.current.delete(data.id);
        }
      }
    };
    current.postMessage({ id: ++id.current, type: 'load' });
  }

  function disable() {
    release();
    setStatus('off');
  }

  function synthesize(text: string) {
    return new Promise<Blob>((resolve, reject) => {
      if (status !== 'ready' || !worker.current) {
        reject(new Error('Ative a voz Faber local para ouvir esta resposta.'));
        return;
      }
      const request = ++id.current;
      const timeout = setTimeout(() => {
        release();
        setStatus('error');
        reject(new Error('A voz demorou demais para responder.'));
      }, 60_000);
      pending.current.set(request, { resolve, reject, timer: timeout });
      worker.current.postMessage({ id: request, type: 'speak', text });
    });
  }
  return { status, progress, enable, disable, synthesize };
}
