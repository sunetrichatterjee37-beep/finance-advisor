import { test } from "node:test";
import assert from "node:assert/strict";
import { seed } from "../src/server/seed";
import { financialEngine, outstanding } from "../src/server/finance";
import { duplicateScore, risks } from "../src/server/risk";
import { minor } from "../src/domain/money";
import { mutate } from "../src/server/operations";
import { isolate, authorize } from "../src/server/access";
import { invoiceInput } from "../src/server/validation";
import type { Actor } from "../src/domain/types";
const date = "2026-09-22";
const a: Actor = {
  user_id: "a",
  company_id: "test",
  name: "Tester",
  role: "finance",
  mode: "demo",
};
test("decimal parsing uses exact integer paise", () => {
  assert.equal(minor("100000.01"), 10000001);
  assert.throws(() => minor("1.001"));
  assert.throws(() => minor("-1"));
});
test("invoice total and date validation", () => {
  const i = seed("test", date).invoices[0];
  assert.ok(invoiceInput.safeParse(i).success);
  assert.equal(invoiceInput.safeParse({ ...i, tax_minor: 1 }).success, false);
  assert.equal(
    invoiceInput.safeParse({ ...i, due_date: "2026-02-30" }).success,
    false,
  );
});
test("partial payment: 100000 minus 60000 equals 40000 rupees", () => {
  const l = seed("test", date);
  const i = l.invoices[0];
  i.total_minor = 10000000;
  l.payments = [{ ...l.payments[0], invoice_id: i.id, amount_minor: 6000000 }];
  assert.equal(outstanding(l, i, date), 4000000);
});
test("receivables, current cash and cash projection reconcile", () => {
  const l = seed("test", date);
  const m = financialEngine(l, date);
  assert.equal(m.receivables, 68000000);
  assert.equal(m.cash, 130000000);
  for (const p of m.projections) {
    assert.equal(p.cash, m.cash + p.inflow - p.outflow);
    assert.equal(
      p.outflow,
      p.source_invoices.reduce((s, i) => s + i.amount, 0),
    );
  }
});
test("budget actual and commitment avoid double counting partial payments", () => {
  const m = financialEngine(seed("test", date), date);
  const b = m.budgets.find((b) => b.id === "b1")!;
  assert.equal(b.actual, 3000000);
  assert.equal(b.committed, 5500000);
  assert.equal(b.remaining, 9500000);
});
test("duplicate signals, amount anomalies, overdue and budget breach are evidence based", () => {
  const l = seed("test", date);
  const i = l.invoices.find((i) => i.id === "inv-1042")!;
  const j = l.invoices.find((i) => i.id === "inv-1043")!;
  assert.equal(duplicateScore(i, j), 100);
  l.budgets[0].budget_minor = 10000000;
  const r = risks(l, date).find((r) => r.invoice_id === i.id)!;
  for (const t of ["DUPLICATE", "AMOUNT", "OVERDUE", "BUDGET"])
    assert.ok(r.signals.some((s) => s.type === t));
  assert.ok(r.signals.every((s) => s.source_records.length && s.calculation));
});
test("overpayment prevention and imported overpayment detection", () => {
  const l = seed("test", date);
  assert.throws(
    () =>
      mutate(l, a, {
        type: "payment",
        payload: {
          invoice_id: "inv-1044",
          amount_minor: 9000000,
          payment_date: date,
          reference: "OVER",
          currency_code: "INR",
        },
      }),
    /overpayment/,
  );
  l.payments[3].amount_minor = 9000000;
  assert.ok(
    risks(l, date)
      .find((r) => r.invoice_id === "inv-1044")
      ?.signals.some((s) => s.type === "RECONCILIATION"),
  );
});
test("company isolation and viewer writes rejected on server", () => {
  const l = seed("test", date);
  assert.throws(() => isolate(l, { ...a, company_id: "other" }));
  l.invoices[0].company_id = "other";
  assert.throws(() => isolate(l, a));
  assert.throws(() => authorize({ ...a, role: "viewer" }, true));
  assert.throws(() => authorize(a, true, true));
});
test("approval does not mark an invoice paid and writes an audit event", () => {
  const l = seed("test", date);
  const next = mutate(l, a, {
    type: "decision",
    payload: {
      id: "inv-1043",
      status: "APPROVED",
      reason: "Reviewed source document",
    },
  });
  assert.equal(
    next.invoices.find((i) => i.id === "inv-1043")?.status,
    "APPROVED",
  );
  assert.equal(next.payments.length, l.payments.length);
  assert.equal(next.audit_logs.length, 1);
  assert.equal(next.audit_logs[0].action, "APPROVED");
});
test("investigation preserves existing approved obligations", () => {
  const l = seed("test", date);
  const next = mutate(l, a, {
    type: "decision",
    payload: {
      id: "inv-1042",
      status: "INVESTIGATION",
      reason: "Check duplicate",
    },
  });
  assert.equal(
    financialEngine(l, date).payables,
    financialEngine(next, date).payables,
  );
});
test("CSV duplicates and file replays are rejected atomically", () => {
  const l = seed("test", date);
  const row = { ...l.invoices[0], invoice_number: "NEW" };
  const c = {
    type: "import",
    payload: { rows: [row], hash: "a".repeat(64), name: "test.csv" },
  };
  const next = mutate(l, a, c);
  assert.equal(next.invoices.length, l.invoices.length + 1);
  assert.throws(() => mutate(next, a, c), /already/);
  assert.throws(
    () => mutate(l, a, { ...c, payload: { ...c.payload, rows: [row, row] } }),
    /already/,
  );
  assert.equal(l.imports.length, 0);
});
test("extracted invoices require human confirmation before approval", () => {
  const l = seed("test", date);
  l.invoices.find((i) => i.id === "inv-1043")!.source = "PDF";
  assert.throws(
    () =>
      mutate(l, a, {
        type: "decision",
        payload: { id: "inv-1043", status: "APPROVED", reason: "review" },
      }),
    /Confirm/,
  );
});
