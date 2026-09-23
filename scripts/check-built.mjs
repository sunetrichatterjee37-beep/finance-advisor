import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { toJSONAsync, fromCrossJSON } from "seroval";
process.env.DEMO_MODE = "true";
process.env.SESSION_SECRET = "test-secret-only-never-use-in-production-123456";
const app = (await import("../dist/server/server.js")).default;
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
      !/SUPABASE_SERVICE_ROLE_KEY|LOVABLE_API_KEY|SESSION_SECRET/.test(source),
      "Server-only key references leaked to client",
    );
  }
console.log("PASS client bundle secret separation");
console.log("PASS built server smoke checks");
