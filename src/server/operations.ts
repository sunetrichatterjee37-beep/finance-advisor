import { randomUUID } from "node:crypto";
import type {
  Actor,
  Ledger,
  Invoice,
  RecommendationState,
} from "../domain/types";
import { authorize, isolate } from "./access";
import {
  invoiceInput,
  paymentInput,
  budgetInput,
  receivableInput,
} from "./validation";
import { outstanding, paid, committed, remainingReceivable } from "./finance";
import { risks } from "./risk";
import { recommendations } from "./recommendations";
import { dateValid, today } from "../domain/money";
export type Command = { type: string; payload: Record<string, any> };
export function mutate(original: Ledger, actor: Actor, command: Command) {
  authorize(actor, true, command.type === "company");
  isolate(original, actor);
  const l = structuredClone(original);
  const p = command.payload;
  const at = new Date().toISOString();
  const base = (id: string = randomUUID()) => ({
    id,
    company_id: actor.company_id,
    created_at: at,
  });
  let before: unknown = null;
  let after: unknown = null;
  let entity = "invoice";
  let id = "";
  const invoice = () => {
    const i = l.invoices.find((i) => i.id === p.id);
    if (!i) throw new Error("Invoice was not found.");
    return i;
  };
  const create = (raw: unknown) => {
    const data = invoiceInput.parse(raw);
    if (
      !l.vendors.some((v) => v.id === data.vendor_id) ||
      !l.categories.some((c) => c.id === data.category_id)
    )
      throw new Error("Choose a vendor and category from this company.");
    const i: Invoice = { ...base(), ...data, status: "PENDING_REVIEW" };
    l.invoices.push(i);
    return i;
  };
  switch (command.type) {
    case "company": {
      if (
        !String(p.name || "").trim() ||
        !Number.isSafeInteger(p.opening_cash_minor) ||
        p.opening_cash_minor < 0 ||
        p.opening_cash_minor > 1_000_000_000_000 ||
        !dateValid(p.opening_date) ||
        p.opening_date > today()
      )
        throw new Error("Check company name, opening cash and opening date.");
      if (
        [
          ...l.payments.map((x) => x.payment_date),
          ...l.receipts.map((x) => x.receipt_date),
        ].some((d) => d < p.opening_date)
      )
        throw new Error(
          "Opening date must not follow existing payment or receipt records.",
        );
      before = { ...l.company };
      l.company = {
        ...l.company,
        name: p.name.trim().slice(0, 150),
        opening_cash_minor: p.opening_cash_minor,
        opening_date: p.opening_date,
      };
      after = l.company;
      id = l.company.id;
      entity = "company";
      break;
    }
    case "invoice":
      after = create(p);
      id = (after as Invoice).id;
      break;
    case "confirm": {
      const i = invoice();
      if (i.status !== "PENDING_REVIEW")
        throw new Error("Only pending invoices can be confirmed.");
      before = { ...i };
      i.confirmed_at = at;
      after = { ...i };
      id = i.id;
      break;
    }
    case "decision": {
      const i = invoice();
      before = { ...i };
      if (!["APPROVED", "REJECTED", "INVESTIGATION"].includes(p.status))
        throw new Error("Invalid decision.");
      if (i.status === "PAID")
        throw new Error("A paid invoice cannot be changed by review actions.");
      if (p.status === "REJECTED" && paid(l, i.id) > 0)
        throw new Error(
          "A partially paid invoice requires reconciliation before rejection.",
        );
      if (p.status === "APPROVED") {
        if (!["PENDING_REVIEW", "INVESTIGATION"].includes(i.status))
          throw new Error("Invoice is not awaiting approval.");
        if (["PDF", "IMAGE"].includes(i.source) && !i.confirmed_at)
          throw new Error("Confirm extracted fields before approval.");
        i.approved_at = at;
        i.approved_by = actor.user_id;
      }
      if (!String(p.reason || "").trim())
        throw new Error("Add a review reason.");
      i.status = p.status;
      after = { ...i };
      id = i.id;
      break;
    }
    case "schedule": {
      const i = invoice();
      if (
        !committed(i) ||
        i.status === "PAID" ||
        i.status === "REJECTED" ||
        i.status === "INVESTIGATION"
      )
        throw new Error("Only approved invoices can be scheduled.");
      if (!dateValid(p.date) || p.date < today())
        throw new Error("Choose today or a future date.");
      before = { ...i };
      i.status = "SCHEDULED";
      i.scheduled_payment_date = p.date;
      after = { ...i };
      id = i.id;
      break;
    }
    case "payment": {
      const x = paymentInput.parse(p);
      const i = l.invoices.find((i) => i.id === x.invoice_id);
      if (
        !i ||
        !committed(i) ||
        ["REJECTED", "INVESTIGATION"].includes(i.status)
      )
        throw new Error("Only approved invoices may receive payments.");
      if (x.payment_date > today())
        throw new Error(
          "Record completed payments only; use scheduling for future payments.",
        );
      if (x.payment_date < l.company.opening_date)
        throw new Error("Payment date precedes opening cash date.");
      if (l.payments.some((q) => q.reference === x.reference))
        throw new Error("Payment reference already recorded.");
      if (x.amount_minor > outstanding(l, i))
        throw new Error(
          "Possible overpayment: amount exceeds the outstanding balance.",
        );
      before = { ...i };
      after = { ...base(), ...x, status: "COMPLETED" };
      l.payments.push(after as any);
      if (outstanding(l, i) === 0) i.status = "PAID";
      entity = "payment";
      id = (after as any).id;
      break;
    }
    case "receivable": {
      const x = receivableInput.parse(p);
      if (l.receivables.some((r) => r.reference_number === x.reference_number))
        throw new Error("Receivable reference already exists.");
      after = { ...base(), ...x, received_minor: 0 };
      l.receivables.push(after as any);
      entity = "receivable";
      id = (after as any).id;
      break;
    }
    case "receipt": {
      const r = l.receivables.find((r) => r.id === p.id);
      if (!r) throw new Error("Receivable not found.");
      if (
        !Number.isSafeInteger(p.amount_minor) ||
        p.amount_minor <= 0 ||
        p.amount_minor > remainingReceivable(l, r.id)
      )
        throw new Error(
          "Receipt must be positive and within the outstanding balance.",
        );
      if (
        !dateValid(p.date) ||
        p.date > today() ||
        p.date < l.company.opening_date
      )
        throw new Error("Receipt date is invalid.");
      if (
        !String(p.reference || "").trim() ||
        l.receipts.some((x) => x.reference === p.reference)
      )
        throw new Error("Use a new receipt reference.");
      before = { ...r };
      after = {
        ...base(),
        receivable_id: r.id,
        amount_minor: p.amount_minor,
        receipt_date: p.date,
        reference: p.reference,
      };
      l.receipts.push(after as any);
      r.received_minor += p.amount_minor;
      entity = "receipt";
      id = (after as any).id;
      break;
    }
    case "budget": {
      const x = budgetInput.parse(p);
      if (!l.categories.some((c) => c.id === x.category_id))
        throw new Error("Category not found.");
      if (
        l.budgets.some(
          (b) =>
            b.id !== p.id &&
            b.category_id === x.category_id &&
            b.period_start <= x.period_end &&
            b.period_end >= x.period_start,
        )
      )
        throw new Error("Budget periods cannot overlap for the same category.");
      const b = l.budgets.find((b) => b.id === p.id);
      before = b ? { ...b } : null;
      after = { ...(b || base()), ...x };
      if (b) Object.assign(b, x);
      else l.budgets.push(after as any);
      entity = "budget";
      id = (after as any).id;
      break;
    }
    case "recommendation": {
      const item = recommendations(l).find((r) => r.id === p.id);
      if (!item) throw new Error("Recommendation is no longer active.");
      const next: Record<string, string[]> = {
        OPEN: ["REVIEWED", "DISMISSED"],
        REVIEWED: ["ACCEPTED", "DISMISSED"],
        ACCEPTED: ["COMPLETED", "DISMISSED"],
        DISMISSED: [],
        COMPLETED: [],
      };
      if (!next[item.status]?.includes(p.status))
        throw new Error("Invalid recommendation transition.");
      before = l.recommendations.find((r) => r.id === p.id) || item;
      after = {
        ...base(p.id),
        status: p.status,
        reason: String(p.reason || "Reviewed by user"),
      };
      l.recommendations = l.recommendations
        .filter((r) => r.id !== p.id)
        .concat(after as RecommendationState);
      entity = "recommendation";
      id = p.id;
      break;
    }
    case "import": {
      if (
        !/^[a-f0-9]{64}$/.test(p.hash) ||
        !Array.isArray(p.rows) ||
        !p.rows.length ||
        p.rows.length > 500
      )
        throw new Error("Invalid import. Maximum 500 rows per batch.");
      if (l.imports.some((i) => i.file_hash === p.hash))
        throw new Error("This file has already been imported.");
      const keys = new Set(
        l.invoices.map(
          (i) => i.vendor_id + "|" + i.invoice_number.toLowerCase(),
        ),
      );
      for (const r of p.rows) {
        const key = r.vendor_id + "|" + String(r.invoice_number).toLowerCase();
        if (keys.has(key))
          throw new Error(
            "An invoice vendor/reference already exists. Review duplicates before import.",
          );
        keys.add(key);
        create({ ...r, source: "CSV" });
      }
      after = {
        ...base(),
        file_hash: p.hash,
        file_name: String(p.name).slice(0, 200),
        total_rows: p.rows.length,
        valid_rows: p.rows.length,
        status: "COMPLETED",
      };
      l.imports.push(after as any);
      entity = "import";
      id = (after as any).id;
      break;
    }
    case "vendor": {
      if (!String(p.name || "").trim())
        throw new Error("Vendor name is required.");
      after = {
        ...base(),
        name: String(p.name).slice(0, 100),
        email: String(p.email || "").slice(0, 120),
        category: String(p.category || "").slice(0, 100),
      };
      l.vendors.push(after as any);
      entity = "vendor";
      id = (after as any).id;
      break;
    }
    default:
      throw new Error("This operation is not supported.");
  }
  l.audit_logs.push({
    ...base(),
    user_id: actor.user_id,
    action: command.type === "decision" ? p.status : command.type.toUpperCase(),
    entity_type: entity,
    entity_id: id,
    previous_state: before,
    new_state: after,
    metadata: { reason: p.reason || null, actor_name: actor.name },
  });
  const active = new Set<string>();
  for (const risk of risks(l)) {
    for (const signal of risk.signals) {
      const key = risk.invoice_id + "-" + signal.type;
      active.add(key);
      const alert = {
        ...base(key),
        invoice_id: risk.invoice_id,
        alert_type: signal.type,
        severity: signal.severity,
        title: signal.title,
        description: signal.reason,
        signal_data: signal.input_values,
        evidence: {
          calculation: signal.calculation,
          source_records: signal.source_records,
          timestamp: signal.timestamp,
        },
        status: "OPEN",
      };
      const existing = l.alerts.find((x) => x.id === key);
      if (existing)
        Object.assign(existing, alert, { created_at: existing.created_at });
      else l.alerts.push(alert);
    }
  }
  for (const alert of l.alerts)
    if (!active.has(alert.id)) alert.status = "RESOLVED";
  l.revision++;
  return l;
}
