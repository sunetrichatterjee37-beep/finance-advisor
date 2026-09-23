import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { toJSONAsync, fromCrossJSON } from "seroval";
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
const db = new DatabaseSync(':memory:');
for (const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql'))) db.exec(readFileSync('drizzle/'+file,'utf8'));
const DB = { prepare(sql) { return { bind(...args) { return { async first() { return db.prepare(sql).get(...args); }, async run() { const r=db.prepare(sql).run(...args); return {meta:{changes:Number(r.changes)}}; } }; } }; } };
const files = new Map();
const BUCKET = { async put(key, bytes) { files.set(key, Buffer.from(bytes)); }, async get(key) {const b=files.get(key);return b ? { async arrayBuffer(){ return b; } } : null;} };
const env = { DB, BUCKET, DEMO_MODE:'true', SESSION_SECRET:'test-hosted-secret-not-for-real-deployment-12345' };
const worker=(await import('../dist/server/index.js')).default;
let currentUser='alice';
const app={ fetch(request) { const headers=new Headers(request.headers); headers.set('oai-authenticated-user-id',currentUser); return worker.fetch(new Request(request,{headers}),env,{}); } };
assert.equal((await worker.fetch(new Request('https://finance.test/'),env,{})).status,401);
assert.equal((await worker.fetch(new Request('https://finance.test/',{method:'POST',headers:{'oai-authenticated-user-id':'alice',origin:'https://evil.test'}}),env,{})).status,403);
console.log('PASS hosted identity and cross-origin checks');
const apiFile = (await readdir("dist/server/assets")).find(
  (f) => f.startsWith("api-") && f.endsWith(".js"),
);
const api = await readFile("dist/server/assets/" + apiFile, "utf8");
function fnId(name) {
  const match = api.match(
    new RegExp(
      "const " +
        name +
        '_createServerFn_handler = createServerRpc\\(\\{\\s*id: "([a-f0-9]+)"',
    ),
  );
  if (!match) throw new Error("Missing " + name);
  return match[1];
}
let cookie = "";
async function call(name, data, method = "POST") {
  const headers = {
    "content-type": "application/json",
    "x-tsr-serverFn": "true",
    origin: "http://localhost:3000",
    "sec-fetch-site": "same-origin",
    ...(cookie ? { cookie } : {}),
  };
  const response = await app.fetch(
    new Request("http://localhost:3000/_serverFn/" + fnId(name), {
      method,
      headers,
      ...(method === "POST"
        ? { body: JSON.stringify(await toJSONAsync({ data })) }
        : {}),
    }),
  );
  if (response.headers.get("set-cookie"))
    cookie = response.headers.get("set-cookie").split(";")[0];
  const text = await response.text();
  assert.equal(response.status, 200, text.slice(0, 300));
  try {
    return fromCrossJSON(JSON.parse(text), { refs: new Map() });
  } catch {
    throw new Error("Response parse: " + text.slice(0, 300));
  }
}
const login = await call("loginFn", { role: "admin" });
assert.equal(login.result.ok, true);
console.log("PASS demo login");
const before = (await call("viewFn", {})).result.data;
await mkdir("qa", { recursive: true });
for (const path of [
  "/",
  "/invoices",
  "/cash-flow",
  "/budgets",
  "/risk",
  "/vendors",
  "/advisor",
  "/audit",
  "/settings",
  "/invoices/inv-1042",
]) {
  const response = await app.fetch(
    new Request("http://localhost:3000" + path, { headers: { cookie } }),
  );
  const html = await response.text();
  assert.equal(response.status, 200, path + " " + html.slice(0, 200));
  assert.ok(!html.includes("We couldn’t load this page"), path);
  await writeFile(
    "qa/" +
      (path === "/" ? "dashboard" : path.slice(1).replaceAll("/", "-")) +
      ".html",
    html,
  );
  console.log("PASS page", path);
}
const wrap = await call("actionFn", {
  type: "decision",
  payload: {
    id: "inv-1043",
    status: "APPROVED",
    reason: "Verified matching purchase order",
  },
});
assert.equal(wrap.result.ok, true);
console.log("PASS approval");
const view = await call("viewFn", {});
assert.equal(
  view.result.data.metrics.payables,
  before.metrics.payables + 9600000,
);
assert.equal(view.result.data.audit_logs.length, 1);
assert.ok(view.result.data.risks.length);
console.log("PASS metrics refresh and audit");
const answer = await call("advisorFn", { question: "Why is cash changing?" });
assert.equal(answer.result.ok, true);
assert.equal(
  answer.result.data.calculation.projected,
  view.result.data.metrics.projections[1].cash,
);
console.log("PASS grounded advisor");
await call("loginFn", { role: "viewer" });
const denied = await call("actionFn", {
  type: "decision",
  payload: { id: "inv-1043", status: "REJECTED", reason: "attempt" },
});
assert.equal(denied.result.ok, false);
console.log("PASS viewer authorization");
assert.ok(JSON.stringify(denied).includes("read-only"));
for (const asset of await readdir("dist/client/assets"))
  if (asset.endsWith(".js")) {
    const source = await readFile("dist/client/assets/" + asset, "utf8");
    assert.ok(
      !/SUPABASE_SERVICE_ROLE_KEY|AI_API_KEY|SESSION_SECRET/.test(source),
      "Server-only key references leaked to client",
    );
  }
console.log("PASS client bundle secret separation");
console.log("PASS built server smoke checks");

await call('loginFn',{role:'admin'});
const uploaded=(await call('uploadFn',{name:'sample.pdf',mime:'application/pdf',base64:Buffer.from('%PDF-1.4 Fictional test invoice').toString('base64')})).result;
assert.equal(uploaded.ok,true);assert.match(uploaded.data.warning,/AI is not connected/);
const opened=(await call('documentFn',uploaded.data.file_id)).result;
assert.equal(opened.ok,true);assert.ok(opened.data.url.startsWith('data:application/pdf;base64,'));
console.log('PASS private document upload and retrieval');
const aliceCompany=(await call('viewFn',{})).result.data.company.id;
const aliceCookie=cookie;
currentUser='bob';
assert.equal((await call('viewFn',{})).result.ok,false);
cookie='';await call('loginFn',{role:'admin'});
assert.notEqual((await call('viewFn',{})).result.data.company.id,aliceCompany);
assert.equal((await call('documentFn',uploaded.data.file_id)).result.ok,false);
console.log('PASS user-bound sessions and cross-company file isolation');
currentUser='alice';cookie='';await call('loginFn',{role:'admin'});
const restored=(await call('viewFn',{})).result;
assert.equal(restored.data.company.id,aliceCompany);
assert.equal(restored.data.metrics.payables,view.result.data.metrics.payables);
console.log('PASS persistent ledger across fresh sessions');
const row=db.prepare('SELECT * FROM demo_ledgers WHERE id=?').get(aliceCompany);
const stale=await DB.prepare('UPDATE demo_ledgers SET ledger = ?, revision = ? WHERE id = ? AND owner = ? AND revision = ?').bind(row.ledger,row.revision+1,aliceCompany,'alice',row.revision-1).run();
assert.equal(stale.meta.changes,0);
console.log('PASS stale revision rejected');
