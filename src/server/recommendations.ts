import type { Ledger, Recommendation } from "../domain/types";
import { financialEngine } from "./finance";
import { risks } from "./risk";
import { today } from "../domain/money";
export function recommendations(l: Ledger, asOf = today()): Recommendation[] {
  const m = financialEngine(l, asOf);
  const items: Recommendation[] = [];
  for (const r of risks(l, asOf).filter((r) =>
    r.signals.some((s) => s.type === "DUPLICATE"),
  )) {
    const i = l.invoices.find((i) => i.id === r.invoice_id)!;
    items.push({
      id: `duplicate-${i.id}`,
      title: `Investigate ${i.invoice_number}`,
      reason:
        "A strong duplicate signal requires document review before payment or approval.",
      priority: "HIGH",
      source_records: r.signals.flatMap((s) => s.source_records),
      status: "OPEN",
    });
  }
  for (const b of m.budgets.filter(
    (b) =>
      b.utilization >= 90 &&
      Date.parse(b.period_end) - Date.parse(asOf) >= 7 * 864e5,
  ))
    items.push({
      id: `budget-${b.id}`,
      title: `Review ${b.name.toLowerCase()} spending`,
      reason: `${b.utilization.toFixed(1)}% of this budget is used or committed, with at least seven days remaining.`,
      priority: "MEDIUM",
      source_records: [b.id, ...b.source_records],
      status: "OPEN",
    });
  if (m.overdue_receivables > 1000000)
    items.push({
      id: "collections",
      title: "Prioritize overdue collections",
      reason: "Overdue receivables exceed the ₹10,000 collection threshold.",
      priority: "HIGH",
      source_records: l.receivables
        .filter((r) => r.due_date < asOf)
        .map((r) => r.id),
      status: "OPEN",
    });
  return items.map((i) => ({
    ...i,
    status: l.recommendations.find((s) => s.id === i.id)?.status || "OPEN",
  }));
}
