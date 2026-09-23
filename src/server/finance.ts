import type { Ledger, Invoice } from "../domain/types";
import { addDays, today } from "../domain/money";
export const committed = (i: Invoice) =>
  !!i.approved_at || ["APPROVED", "SCHEDULED", "PAID"].includes(i.status);
export function paid(l: Ledger, id: string, asOf = today()) {
  return l.payments
    .filter(
      (p) =>
        p.invoice_id === id &&
        p.status === "COMPLETED" &&
        p.payment_date <= asOf,
    )
    .reduce((s, p) => s + p.amount_minor, 0);
}
export function outstanding(l: Ledger, i: Invoice, asOf = today()) {
  return Math.max(0, i.total_minor - paid(l, i.id, asOf));
}
export function remainingReceivable(l: Ledger, id: string, asOf = today()) {
  const r = l.receivables.find((r) => r.id === id)!;
  return Math.max(
    0,
    r.amount_minor -
      l.receipts
        .filter((p) => p.receivable_id === id && p.receipt_date <= asOf)
        .reduce((s, p) => s + p.amount_minor, 0),
  );
}
export function financialEngine(l: Ledger, asOf = today()) {
  const active = l.invoices.filter(
    (i) => committed(i) && i.status !== "REJECTED",
  );
  const payables = active.reduce((s, i) => s + outstanding(l, i, asOf), 0);
  const receivables = l.receivables.reduce(
    (s, r) => s + remainingReceivable(l, r.id, asOf),
    0,
  );
  const out = l.payments
    .filter(
      (p) =>
        p.status === "COMPLETED" &&
        p.payment_date >= l.company.opening_date &&
        p.payment_date <= asOf,
    )
    .reduce((s, p) => s + p.amount_minor, 0);
  const received = l.receipts
    .filter(
      (r) => r.receipt_date >= l.company.opening_date && r.receipt_date <= asOf,
    )
    .reduce((s, r) => s + r.amount_minor, 0);
  const cash = l.company.opening_cash_minor + received - out;
  const projections = [0, 30, 60, 90].map((days) => {
    const end = addDays(asOf, days);
    const invoices = days
      ? active.filter(
          (i) =>
            (i.scheduled_payment_date || i.due_date) <= end &&
            outstanding(l, i, asOf) > 0,
        )
      : [];
    const receipts = days
      ? l.receivables.filter(
          (r) => r.due_date <= end && remainingReceivable(l, r.id, asOf) > 0,
        )
      : [];
    const inflow = receipts.reduce(
      (s, r) => s + remainingReceivable(l, r.id, asOf),
      0,
    );
    const outflow = invoices.reduce((s, i) => s + outstanding(l, i, asOf), 0);
    return {
      days,
      date: end,
      inflow,
      outflow,
      cash: cash + inflow - outflow,
      source_invoices: [...invoices]
        .sort((a, b) =>
          (a.scheduled_payment_date || a.due_date).localeCompare(
            b.scheduled_payment_date || b.due_date,
          ),
        )
        .map((i) => ({
          id: i.id,
          reference: i.invoice_number,
          vendor_id: i.vendor_id,
          status: i.status,
          amount: outstanding(l, i, asOf),
          due_date: i.scheduled_payment_date || i.due_date,
        })),
      source_receivables: receipts.map((r) => ({
        id: r.id,
        reference: r.reference_number,
        amount: remainingReceivable(l, r.id, asOf),
        due_date: r.due_date,
      })),
    };
  });
  const budgets = l.budgets.map((b) => {
    const invoices = active.filter(
      (i) =>
        i.category_id === b.category_id &&
        i.invoice_date >= b.period_start &&
        i.invoice_date <= b.period_end,
    );
    const actual = invoices.reduce(
      (s, i) => s + Math.min(paid(l, i.id, asOf), i.total_minor),
      0,
    );
    const committed = invoices.reduce((s, i) => s + outstanding(l, i, asOf), 0);
    return {
      ...b,
      name:
        l.categories.find((c) => c.id === b.category_id)?.name ||
        "Uncategorized",
      actual,
      committed,
      remaining: b.budget_minor - actual - committed,
      utilization: ((actual + committed) / b.budget_minor) * 100,
      source_records: invoices.map((i) => i.id),
    };
  });
  const vendors = l.vendors.map((v) => {
    const invoices = l.invoices.filter(
      (i) => i.vendor_id === v.id && i.status !== "REJECTED",
    );
    const approved = invoices.filter(committed);
    return {
      ...v,
      count: invoices.length,
      average: invoices.length
        ? Math.round(
            invoices.reduce((s, i) => s + i.total_minor, 0) / invoices.length,
          )
        : 0,
      largest: Math.max(0, ...invoices.map((i) => i.total_minor)),
      spend: approved.reduce((s, i) => s + paid(l, i.id, asOf), 0),
      outstanding: approved.reduce((s, i) => s + outstanding(l, i, asOf), 0),
      overdue: approved
        .filter((i) => i.due_date < asOf)
        .reduce((s, i) => s + outstanding(l, i, asOf), 0),
      history: invoices.map((i) => ({
        id: i.id,
        date: i.invoice_date,
        amount: i.total_minor,
      })),
    };
  });
  const currentBudgets = budgets.filter(
    (b) => b.period_start <= asOf && b.period_end >= asOf,
  );
  const budgetTotal = currentBudgets.reduce((s, b) => s + b.budget_minor, 0);
  const exposure = currentBudgets.reduce(
    (s, b) => s + b.actual + b.committed,
    0,
  );
  return {
    asOf,
    updated_at: new Date().toISOString(),
    cash,
    payables,
    receivables,
    net: cash + receivables - payables,
    coverage: projections[1].outflow ? cash / projections[1].outflow : null,
    projections,
    budgets,
    vendors,
    budget_utilization: budgetTotal ? (exposure / budgetTotal) * 100 : 0,
    overdue_payables: active
      .filter((i) => i.due_date < asOf)
      .reduce((s, i) => s + outstanding(l, i, asOf), 0),
    overdue_receivables: l.receivables
      .filter((r) => r.due_date < asOf)
      .reduce((s, r) => s + remainingReceivable(l, r.id, asOf), 0),
  };
}
export type Metrics = ReturnType<typeof financialEngine>;

export function paymentScenario(l: Ledger, invoice: Invoice, asOf = today()) {
  const m = financialEngine(l, asOf),
    balance = outstanding(l, invoice, asOf);
  return {
    invoice_id: invoice.id,
    outstanding: balance,
    cash_before: m.cash,
    cash_after_payment: m.cash - balance,
    formula: "Current cash − outstanding invoice balance",
    note: "Immediate payment scenario only. No payment is recorded, and this obligation is not counted twice in the baseline projection.",
  };
}
