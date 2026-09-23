import type { Actor, Ledger } from "../domain/types";
export function authorize(actor: Actor, write = false, admin = false) {
  if (!actor?.user_id || !actor.company_id)
    throw new Error("Sign in to continue.");
  if (write && actor.role === "viewer")
    throw new Error("Viewer access is read-only.");
  if (admin && actor.role !== "admin")
    throw new Error("Administrator access is required.");
}
export function isolate(l: Ledger, a: Actor) {
  authorize(a);
  if (l.company.id !== a.company_id) throw new Error("Company access denied.");
  for (const rows of [
    l.invoices,
    l.payments,
    l.receivables,
    l.receipts,
    l.vendors,
    l.categories,
    l.budgets,
    l.audit_logs,
    l.recommendations,
    l.imports,
    l.alerts,
  ])
    if (rows.some((r) => r.company_id !== a.company_id))
      throw new Error("Company access denied.");
  return l;
}
