import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const js=ts.transpileModule(await readFile('app/atlas-slice.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ES2022}}).outputText;
const {relativeSlice}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
test('Slices move on the acquired plane, preserving LPS direction',()=>{
  for(const region of ['head','thorax','abdomen','body']){
    const axial0=relativeSlice({plane:'axial',fraction:0,region});
    const axial1=relativeSlice({plane:'axial',fraction:1,region});
    assert.equal(axial0.axis,'y');assert(axial0.position<axial1.position);
    const cor0=relativeSlice({plane:'coronal',fraction:0,region});
    const cor1=relativeSlice({plane:'coronal',fraction:1,region});
    assert.equal(cor0.axis,'z');assert(cor0.position>cor1.position);
    const sag0=relativeSlice({plane:'sagital',fraction:0,region});
    const sag1=relativeSlice({plane:'sagital',fraction:1,region});
    assert.equal(sag0.axis,'x');assert(sag0.position<sag1.position);
  }
});
test('Relative slice positions stay inside region bounds',()=>{
  for(const fraction of [-5,0,0.5,1,5]){
    const r=relativeSlice({plane:'axial',fraction,region:'head'});
    assert(r.position>=r.bounds.y[0]&&r.position<=r.bounds.y[1]);
  }
});
