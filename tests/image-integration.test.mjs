import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const js=ts.transpileModule(await readFile('app/image-integration.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;
const {imageIntegration}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
test('multiple selected images and unverified sequences never imply exact geometry',()=>{
 assert.equal(imageIntegration([{},{}]).mode,'reference');
 assert.equal(imageIntegration([{},{}],{kind:'ordered-series',seriesId:'x'}).mode,'reference');
 assert.equal(imageIntegration([{},{}],{kind:'ordered-series',orderVerified:true}).mode,'reference');
 assert.equal(imageIntegration([{}],{kind:'ordered-series',seriesId:'x',orderVerified:true}).mode,'reference');
});
test('only a verified multiframe sequence enables slice navigation, not patient registration',()=>{
 const r=imageIntegration([{},{}],{kind:'ordered-series',seriesId:'x',orderVerified:true});
 assert.equal(r.mode,'sequence');assert.match(r.description,/aproximada/);
});
test('DICOM integration accepts only local radiology files with the expected extension',()=>{
 const r=imageIntegration([],{kind:'dicom-series',files:['/radiology/admission/series-01.dcm','/radiology/follow-up_2.dcm']});
 assert.equal(r.mode,'dicom');
 assert.match(r.description,/geometria for válida/);
 for(const files of [
  ['https://example.test/radiology/series.dcm'],
  ['/radiology/../private/series.dcm'],
  ['/radiology/series.dcm?download=1'],
  ['/radiology/series.nii'],
  ['/tmp/series.dcm'],
  [],
 ]) assert.equal(imageIntegration([{},{}],{kind:'dicom-series',files}).mode,'reference',JSON.stringify(files));
});
test('Image count and modality-shaped metadata cannot fabricate a DICOM series',()=>{
 assert.equal(imageIntegration([{},{}],{kind:'selected-images'}).mode,'reference');
 assert.equal(imageIntegration([{},{}],{kind:'selected-images',seriesId:'ct',orderVerified:true}).mode,'reference');
 assert.equal(imageIntegration([{},{}],{kind:'ordered-series',seriesId:'ct',orderVerified:false}).mode,'reference');
 const reference=imageIntegration([{},{}],{kind:'dicom-series',files:['https://radiopaedia.org/cases/123.dcm']});
 assert.equal(reference.mode,'reference');
 assert.match(reference.description,/não permitem alinhamento exato/);
});
