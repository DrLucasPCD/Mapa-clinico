type Tool = {
  name: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: unknown) => unknown;
};
type Context = {
  registerTool: (t: Tool, o: { signal: AbortSignal }) => void | Promise<void>;
};
export function registerStudyTool(
  context: Context | undefined,
  select: (id: string, period: number) => void,
  ids: string[],
) {
  if (!context?.registerTool) return () => {};
  const controller = new AbortController();
  const tool: Tool = {
    name: 'open_anatomy_lesson',
    description:
      'Seleciona uma lição anatômica e um período no atlas visível. Não altera casos nem publica conteúdo.',
    inputSchema: {
      type: 'object',
      properties: {
        structureId: { type: 'string', enum: ids },
        period: { type: 'integer', minimum: 1, maximum: 12 },
      },
      required: ['structureId', 'period'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute(input) {
      if (!input || typeof input !== 'object')
        throw Error('Informe estrutura e período.');
      const x = input as Record<string, unknown>;
      if (
        Object.keys(x).some((k) => !['structureId', 'period'].includes(k)) ||
        typeof x.structureId !== 'string' ||
        !ids.includes(x.structureId) ||
        typeof x.period !== 'number' ||
        !Number.isInteger(x.period) ||
        x.period < 1 ||
        x.period > 12
      )
        throw Error('Estrutura ou período inválido.');
      select(x.structureId, x.period);
      return { structureId: x.structureId, period: x.period, view: 'atlas' };
    },
  };
  try {
    Promise.resolve(
      context.registerTool(tool, { signal: controller.signal }),
    ).catch(() => {});
  } catch {}
  return () => controller.abort();
}
export type { Context };
