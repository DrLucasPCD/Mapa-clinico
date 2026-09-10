import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile('app/detailed-catalog.ts','utf8');
const js = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;
const {detailedAliases}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
for (const [variant,count] of [['male',3478],['female',264]]) test(`${variant}: every catalog structure exists in its own GLB`,async()=>{
 const manifest=JSON.parse(await readFile(`public/models/detailed/manifest${variant==='female'?'_female':''}.json`,'utf8'));
 assert.equal(manifest.organs.length,count);
 const files=new Map();
 for(const file of new Set(manifest.organs.map(o=>o.mesh_file))){
  assert(file.endsWith(`_${variant}.glb`));
  const buffer=await readFile('public/models/detailed/'+file);
  assert.equal(buffer.toString('utf8',0,4),'glTF');
  const gltf=JSON.parse(buffer.toString('utf8',20,20+buffer.readUInt32LE(12)));
  files.set(file,new Set(gltf.nodes.filter(n=>n.mesh!==undefined).map(n=>n.name)));
 }
 for(const organ of manifest.organs) assert(files.get(organ.mesh_file).has(organ.node),organ.node);
 if(variant==='male'){
  for(const key of ['heart','cerebrum','deltoid-muscles','rotator-cuff-muscles-supraspinatus','rotator-cuff-muscles-infraspinatus','rotator-cuff-muscles-subscapularis','superficial-gluteal-muscles-gluteus-medius','liver','metacarpal']) assert(manifest.organs.some(o=>detailedAliases(o).some(a=>a.includes(key))),key);
  const vessels=JSON.parse(await readFile('app/vessels.json','utf8'));
  for(const v of vessels)for(const id of v.geometryIds)assert(manifest.organs.some(o=>o.organ_id===id),id);
 }
});
