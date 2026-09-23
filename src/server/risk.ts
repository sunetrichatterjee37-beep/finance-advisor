import type { Invoice, Ledger, Signal, Risk } from "../domain/types";
import { financialEngine, outstanding, paid, committed } from "./finance";
import { today, dateValid } from "../domain/money";
export function duplicateScore(a: Invoice, b: Invoice) {
  if (a.id === b.id || a.vendor_id !== b.vendor_id) return 0;
  let n = 20;
  if (
    a.invoice_number.trim().toLowerCase() ===
    b.invoice_number.trim().toLowerCase()
  )
    n += 40;
  if (
    a.total_minor === b.total_minor ||
    Math.abs(a.total_minor - b.total_minor) /
      Math.max(a.total_minor, b.total_minor, 1) <=
      0.01
  )
    n += 20;
  if (
    Math.abs(Date.parse(a.invoice_date) - Date.parse(b.invoice_date)) <=
    7 * 864e5
  )
    n += 10;
  if (
    a.description.trim() &&
    a.description.trim().toLowerCase() === b.description.trim().toLowerCase()
  )
    n += 10;
  return n;
}
const rank = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
export function risks(l: Ledger, asOf = today()): Risk[] {
  const m = financialEngine(l, asOf);
  const time = new Date().toISOString();
  return l.invoices
    .filter((i) => i.status !== "REJECTED")
    .map((i) => {
      const signals: Signal[] = [];
      const add = (
        type: string,
        severity: Signal["severity"],
        title: string,
        reason: string,
        calculation: string,
        source_records: string[],
        input_values: Record<string, string | number | boolean | null>,
      ) =>
        signals.push({
          type,
          severity,
          title,
          reason,
          calculation,
          source_records,
          input_values,
          timestamp: time,
        });
      const dup = l.invoices
        .filter((j) => j.status !== "REJECTED" && duplicateScore(i, j) >= 70)
        .sort((a, b) => duplicateScore(i, b) - duplicateScore(i, a))[0];
      if (dup) {
        const score = duplicateScore(i, dup);
        add(
          "DUPLICATE",
          "HIGH",
          "Possible duplicate",
          "Same vendor and overlapping invoice attributes. This is a signal, not proof of fraud.",
          `Signal score ${score}/100; threshold 70`,
          [i.id, dup.id],
          { score, other_invoice: dup.invoice_number },
        );
      }
      const history = l.invoices.filter(
        (j) =>
          j.vendor_id === i.vendor_id &&
          j.id !== i.id &&
          j.status !== "REJECTED" &&
          j.invoice_date < i.invoice_date &&
          j.total_minor > 0,
      );
      const avg = history.length
        ? Math.round(
            history.reduce((s, j) => s + j.total_minor, 0) / history.length,
          )
        : 0;
      if (history.length >= 3 && avg && i.total_minor >= 2 * avg)
        add(
          "AMOUNT",
          "HIGH",
          "Unusual invoice amount",
          "Invoice is at least twice the prior vendor average.",
          `${i.total_minor} / ${avg} = ${(i.total_minor / avg).toFixed(2)}×`,
          [i.id, ...history.map((j) => j.id)],
          {
            current_minor: i.total_minor,
            average_minor: avg,
            count: history.length,
            difference_percent: Math.round((i.total_minor / avg - 1) * 100),
          },
        );
      if (history.length < 3)
        add(
          "DATA_QUALITY",
          "LOW",
          "Limited vendor history",
          "Fewer than three earlier invoices; amount anomaly confidence is limited.",
          `${history.length} historical invoices; minimum 3`,
          [i.id, ...history.map((j) => j.id)],
          { count: history.length },
        );
      const first = asOf.slice(0, 7) + "-01";
      const prior = new Date(first + "T00:00:00Z");
      prior.setUTCMonth(prior.getUTCMonth() - 3);
      const before = prior.toISOString().slice(0, 10);
      const older = l.invoices.filter(
        (j) =>
          j.vendor_id === i.vendor_id &&
          j.status !== "REJECTED" &&
          j.invoice_date >= before &&
          j.invoice_date < first,
      );
      const current = l.invoices.filter(
        (j) =>
          j.vendor_id === i.vendor_id &&
          j.status !== "REJECTED" &&
          j.invoice_date >= first &&
          j.invoice_date <= asOf,
      );
      if (
        older.length >= 3 &&
        current.length >= Math.max(4, 2 * (older.length / 3))
      )
        add(
          "FREQUENCY",
          "MEDIUM",
          "Unusual billing frequency",
          "Current month count exceeds twice the three-month average.",
          `${current.length} this month / ${(older.length / 3).toFixed(1)} per prior month`,
          [...older, ...current].map((j) => j.id),
          {
            current_count: current.length,
            prior_monthly_average: older.length / 3,
          },
        );
      const due = outstanding(l, i, asOf);
      if (committed(i) && i.due_date < asOf && due > 0)
        add(
          "OVERDUE",
          "MEDIUM",
          "Payment overdue",
          "Committed invoice has an unpaid balance after its due date.",
          `${Math.floor((Date.parse(asOf) - Date.parse(i.due_date)) / 864e5)} days overdue`,
          [i.id],
          { due_date: i.due_date, outstanding_minor: due },
        );
      for (const b of m.budgets.filter(
        (b) =>
          b.category_id === i.category_id &&
          i.invoice_date >= b.period_start &&
          i.invoice_date <= b.period_end,
      )) {
        const exposure =
          b.actual + b.committed + (committed(i) ? 0 : i.total_minor);
        if (exposure > b.budget_minor)
          add(
            "BUDGET",
            "HIGH",
            "Budget breach risk",
            "Category exposure exceeds the budget for this invoice period.",
            `${b.actual} + ${b.committed} + ${committed(i) ? 0 : i.total_minor} > ${b.budget_minor} paise`,
            [i.id, b.id, ...b.source_records],
            {
              budget_minor: b.budget_minor,
              actual_minor: b.actual,
              committed_minor: b.committed,
              additional_minor: committed(i) ? 0 : i.total_minor,
              excess_minor: exposure - b.budget_minor,
            },
          );
      }
      if (paid(l, i.id, asOf) > i.total_minor)
        add(
          "RECONCILIATION",
          "CRITICAL",
          "Possible overpayment",
          "Applied payments exceed the invoice total.",
          `${paid(l, i.id, asOf)} - ${i.total_minor} paise`,
          [
            i.id,
            ...l.payments.filter((p) => p.invoice_id === i.id).map((p) => p.id),
          ],
          { overpayment_minor: paid(l, i.id, asOf) - i.total_minor },
        );
      if (
        !dateValid(i.due_date) ||
        i.total_minor !== i.subtotal_minor + i.tax_minor ||
        i.currency_code !== l.company.currency_code ||
        !l.vendors.some((v) => v.id === i.vendor_id)
      )
        add(
          "DATA_QUALITY",
          "HIGH",
          "Invalid invoice data",
          "A date, total, vendor, or currency is inconsistent.",
          "Validation failed",
          [i.id],
          { currency: i.currency_code },
        );
      return {
        invoice_id: i.id,
        signals,
        severity: signals.reduce<Signal["severity"]>(
          (r, s) => (rank[s.severity] > rank[r] ? s.severity : r),
          "LOW",
        ),
      };
    })
    .filter((r) => r.signals.length);
}
