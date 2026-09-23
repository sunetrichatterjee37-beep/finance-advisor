import type { Ledger } from "../domain/types";
import { risks } from "./risk";
import { remainingReceivable } from "./finance";
export type ListQuery = {
  page?: number;
  search?: string;
  type?: string;
  severity?: string;
  vendor?: string;
  status?: string;
  from?: string;
  minAmount?: number;
};
export function paginate<T>(rows: T[], page = 0, size = 25) {
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(
    Math.max(0, Math.floor(Number.isFinite(page) ? page : 0)),
    pages - 1,
  );
  return {
    rows: rows.slice(current * size, (current + 1) * size),
    total,
    page: current,
    pages,
  };
}
export function riskRows(l: Ledger) {
  return risks(l).map((r) => {
    const i = l.invoices.find((i) => i.id === r.invoice_id)!;
    return {
      ...r,
      invoice_number: i.invoice_number,
      vendor_id: i.vendor_id,
      vendor_name: l.vendors.find((v) => v.id === i.vendor_id)?.name || "",
      invoice_date: i.invoice_date,
      total_minor: i.total_minor,
      status: i.status,
    };
  });
}
export function queryRisk(l: Ledger, q: ListQuery) {
  return paginate(
    riskRows(l).filter(
      (r) =>
        (!q.severity || q.severity === "ALL" || r.severity === q.severity) &&
        (!q.type || r.signals.some((s) => s.type === q.type)) &&
        (!q.vendor || r.vendor_id === q.vendor) &&
        (!q.status || r.status === q.status) &&
        (!q.from || r.invoice_date >= q.from) &&
        (!q.minAmount || r.total_minor >= q.minAmount),
    ),
    q.page,
    12,
  );
}
export function queryAudit(l: Ledger, q: ListQuery) {
  const search = (q.search || "").toLowerCase();
  return paginate(
    [...l.audit_logs]
      .reverse()
      .filter((a) =>
        (
          a.action +
          " " +
          a.entity_id +
          " " +
          a.user_id +
          " " +
          (a.metadata.actor_name || "")
        )
          .toLowerCase()
          .includes(search),
      ),
    q.page,
  );
}
export function queryReceivables(l: Ledger, q: ListQuery) {
  const search = (q.search || "").toLowerCase();
  return paginate(
    l.receivables
      .filter((r) =>
        (r.customer_name + " " + r.reference_number)
          .toLowerCase()
          .includes(search),
      )
      .map((r) => ({
        ...r,
        received_minor: r.amount_minor - remainingReceivable(l, r.id),
      })),
    q.page,
  );
}
export function ledgerRows(l: Ledger) {
  const vendor = (id: string) =>
    l.vendors.find((v) => v.id === id)?.name || "Unknown vendor";
  return [
    ...l.invoices.map((i) => ({
      id: i.id,
      date: i.invoice_date,
      type: "INVOICE",
      reference: i.invoice_number,
      party: vendor(i.vendor_id),
      amount: i.total_minor,
      status: i.status,
      source: i.source,
      href: "/invoices/" + i.id,
    })),
    ...l.payments.map((p) => {
      const i = l.invoices.find((i) => i.id === p.invoice_id);
      return {
        id: p.id,
        date: p.payment_date,
        type: "PAYMENT",
        reference: p.reference,
        party: i ? vendor(i.vendor_id) : "Unknown vendor",
        amount: -p.amount_minor,
        status: p.status,
        source: "RECORDED PAYMENT",
        href: "/invoices/" + p.invoice_id,
      };
    }),
    ...l.receivables.map((r) => ({
      id: r.id,
      date: r.issue_date,
      type: "RECEIVABLE",
      reference: r.reference_number,
      party: r.customer_name,
      amount: r.amount_minor,
      status: remainingReceivable(l, r.id) === 0 ? "RECEIVED" : "OUTSTANDING",
      source: "MANUAL",
      href: "/cash-flow",
    })),
    ...l.receipts.map((p) => {
      const r = l.receivables.find((r) => r.id === p.receivable_id);
      return {
        id: p.id,
        date: p.receipt_date,
        type: "RECEIPT",
        reference: p.reference,
        party: r?.customer_name || "Unknown customer",
        amount: p.amount_minor,
        status: "COMPLETED",
        source: "RECORDED RECEIPT",
        href: "/cash-flow",
      };
    }),
  ].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}
export function queryLedger(l: Ledger, q: ListQuery) {
  const search = (q.search || "").toLowerCase();
  return paginate(
    ledgerRows(l).filter(
      (r) =>
        (!q.type || r.type === q.type) &&
        (!q.from || r.date >= q.from) &&
        (r.reference + " " + r.party + " " + r.id)
          .toLowerCase()
          .includes(search),
    ),
    q.page,
  );
}
