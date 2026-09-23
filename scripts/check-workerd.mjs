import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { toJSONAsync, fromCrossJSON } from 'seroval';
const mf = new Miniflare(convertV4MiniflareOptions({ workers: [{ name: 'finance', modules:true, scriptPath:'dist/server/index.js', compatibilityDate:'2026-09-01', compatibilityFlags:['nodejs_compat'], d1Databases:['DB'], r2Buckets:['BUCKET'], bindings:{ DEMO_MODE:'true', SESSION_SECRET:'workerd-test-only-not-deployment-1234567890' } }] }));
try {
 const db = await mf.getD1Database('DB');
 for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql'))) await db.exec((await readFile('drizzle/'+file,'utf8')).replaceAll('\n',' '));
 const response=await mf.dispatchFetch('https://finance.test/auth',{headers:{'oai-authenticated-user-id':'test-user'}});
 assert.equal(response.status,200);assert.match(await response.text(),/Open demo workspace/);
 const apiFile=(await readdir('dist/server/assets')).find(f=>f.startsWith('api-')&&f.endsWith('.js'));
 const api=await readFile('dist/server/assets/'+apiFile,'utf8');
 function id(name){return api.match(new RegExp('const '+name+'_createServerFn_handler = createServerRpc\\(\\{\\s*id: "([a-f0-9]+)"'))[1];}
 let cookie='';
 async function call(name,data){const r=await mf.dispatchFetch('https://finance.test/_serverFn/'+id(name),{method:'POST',headers:{'oai-authenticated-user-id':'test-user',origin:'https://finance.test','sec-fetch-site':'same-origin','content-type':'application/json','x-tsr-serverFn':'true',cookie},body:JSON.stringify(await toJSONAsync({data}))});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const text=await r.text();assert.equal(r.status,200,text);return fromCrossJSON(JSON.parse(text),{refs:new Map()}).result;}
 assert.equal((await call('loginFn',{role:'admin'})).ok,true);
 const view=await call('viewFn',{});assert.equal(view.ok,true);assert.ok(view.data.metrics);
 const updated=await call('actionFn',{type:'decision',payload:{id:'inv-1043',status:'APPROVED',reason:'Runtime verification'}});assert.equal(updated.ok,true);
 assert.equal((await call('viewFn',{})).data.audit_logs.length,1);
 const uploaded=await call('uploadFn',{name:'test.pdf',mime:'application/pdf',base64:Buffer.from('%PDF-1.4 test invoice').toString('base64')});assert.equal(uploaded.ok,true);
 assert.equal((await call('documentFn',uploaded.data.file_id)).ok,true);
 console.log('PASS actual Workers runtime: render, sign-in, D1 read/write, audit and R2 documents');
} finally { await mf.dispose(); }
