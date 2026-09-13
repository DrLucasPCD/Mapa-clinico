import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Window} from 'happy-dom';
import ts from 'typescript';
import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
const asModule = text => 'data:text/javascript;base64,' + Buffer.from(text).toString('base64');
const compile = text => ts.transpileModule(text,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;
const math = asModule(compile(await readFile('app/landmark-registration.ts','utf8')));
const ui = compile(await readFile('app/LandmarkPanel.tsx','utf8'))
 .replaceAll('"react/jsx-runtime"',JSON.stringify(pathToFileURL(resolve('node_modules/react/jsx-runtime.js')).href))
 .replaceAll("'react'",JSON.stringify(pathToFileURL(resolve('node_modules/react/index.js')).href))
 .replaceAll("'./landmark-registration'",JSON.stringify(math));
const {default:Panel} = await import(asModule(ui));
test('manual pairs fit, invalidate after deletion, and reset for a new series with the same UID',async()=>{
 const window = new Window(); globalThis.window=window; globalThis.document=window.document; globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const host=document.createElement('div'); document.body.append(host); const root=createRoot(host);
 let result=null; const onRegistration=value=>{result=value};
 const series={id:'same-uid'}; let props={series,modelVariant:'male',onRegistration};
 const render=async extra=>{props={...props,...extra};await act(()=>root.render(React.createElement(Panel,props)));};
 const click=async text=>{const b=[...host.querySelectorAll('button')].find(b=>b.textContent===text); assert.ok(b); assert.equal(b.disabled,false); await act(()=>b.click());};
 for (const [i,point] of [[0,[0,0,0]],[1,[10,0,0]],[2,[0,10,0]]]) {
  await render({atlasPoint:{point,label:`Marco ${i}`,variant:'male'},targetPoint:point.map(n=>n+20)});
  await click('Adicionar par');
 }
 await click('Ajustar com 3 marcos'); assert.ok(result); assert.match(host.textContent,/Distância RMS/);
 await click('Remover'); assert.equal(result,null);
 await render({series:{id:'same-uid'}}); assert.equal(host.querySelectorAll('li').length,0); assert.equal(result,null);
 await act(()=>root.unmount()); window.happyDOM.abort();
});
