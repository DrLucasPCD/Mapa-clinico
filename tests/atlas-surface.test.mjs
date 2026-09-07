import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { Window } from 'happy-dom';
import ts from 'typescript';

test('Loading and error overlays never remove or replace the renderer canvas', async () => {
  const window = new Window();
  globalThis.window = window;
  globalThis.document = window.document;
  const React = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { flushSync } = await import('react-dom');
  const temp = await mkdtemp(
    process.cwd() + '/node_modules/.atlas-surface-test-',
  );
  const file = temp + '/surface.mjs';
  try {
    const source = await readFile('app/AtlasSurface.tsx', 'utf8');
    await writeFile(
      file,
      ts.transpileModule(source, {
        compilerOptions: {
          jsx: ts.JsxEmit.ReactJSX,
          module: ts.ModuleKind.ES2022,
        },
      }).outputText,
    );
    const { default: Surface } = await import(pathToFileURL(file).href);
    const rootNode = document.createElement('div');
    document.body.append(rootNode);
    const root = createRoot(rootNode),
      ref = React.createRef();
    const render = (status) =>
      flushSync(() =>
        root.render(React.createElement(Surface, { surfaceRef: ref, status })),
      );
    render('Carregando atlas');
    const mount = ref.current,
      canvas = document.createElement('canvas');
    mount.append(canvas);
    render('Carregando atlas • 50%');
    assert(canvas.isConnected);
    render('');
    assert(canvas.isConnected, 'Finishing loading detached the WebGL canvas');
    assert.equal(ref.current, mount);
    assert.equal(rootNode.querySelector('canvas'), canvas);
    assert.equal(rootNode.querySelector('[role=status]'), null);
    render('A renderização foi interrompida');
    assert(canvas.isConnected);
    assert(rootNode.querySelector('[role=status]'));
    render('');
    assert(canvas.isConnected);
    flushSync(() => root.unmount());
    window.happyDOM.abort();
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
