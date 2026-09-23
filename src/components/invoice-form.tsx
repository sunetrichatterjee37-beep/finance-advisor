import { useState } from "react";
import { Field, ErrorText } from "./ui";
import { useFinance } from "./state";
import { minor, today, addDays } from "../domain/money";
export function InvoiceForm({
  onDone,
  initial = {},
  source = "MANUAL",
  fileId,
}: {
  onDone: () => void;
  initial?: Record<string, any>;
  source?: string;
  fileId?: string;
}) {
  const { view, act, busy } = useFinance();
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await act("invoice", {
        vendor_id: f.get("vendor"),
        category_id: f.get("category"),
        invoice_number: f.get("number"),
        invoice_date: f.get("date"),
        due_date: f.get("due"),
        subtotal_minor: minor(String(f.get("subtotal"))),
        tax_minor: minor(String(f.get("tax"))),
        total_minor: minor(String(f.get("total"))),
        currency_code: "INR",
        description: f.get("description"),
        source,
        ...(fileId ? { file_id: fileId } : {}),
      });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <form onSubmit={submit}>
      <div className="form-grid">
        <Field label="Vendor">
          <select
            name="vendor"
            required
            defaultValue={
              view.vendors.find(
                (v) =>
                  v.name.toLowerCase() === String(initial.vendor).toLowerCase(),
              )?.id || ""
            }
          >
            <option value="">Choose vendor</option>
            {view.vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Category">
          <select name="category" required>
            <option value="">Choose category</option>
            {view.categories.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Invoice number">
          <input
            name="number"
            required
            defaultValue={initial.invoice_number || ""}
          />
        </Field>
        <Field label="Currency">
          <input value="INR — Indian rupee" readOnly />
        </Field>
        <Field label="Invoice date">
          <input
            type="date"
            name="date"
            required
            defaultValue={initial.invoice_date || today()}
          />
        </Field>
        <Field label="Due date">
          <input
            type="date"
            name="due"
            required
            defaultValue={initial.due_date || addDays(today(), 30)}
          />
        </Field>
        <Field label="Subtotal (₹)">
          <input
            name="subtotal"
            inputMode="decimal"
            required
            defaultValue={initial.subtotal || ""}
          />
        </Field>
        <Field label="Tax (₹)">
          <input
            name="tax"
            inputMode="decimal"
            required
            defaultValue={initial.tax || "0"}
          />
        </Field>
        <Field label="Total (₹)">
          <input
            name="total"
            inputMode="decimal"
            required
            defaultValue={initial.total || ""}
          />
        </Field>
      </div>
      <Field label="Description">
        <textarea name="description" defaultValue={initial.description || ""} />
      </Field>
      <ErrorText error={error} />
      <p className="muted">
        Saved as pending review. Approval and payment are separate actions.
      </p>
      <button className="primary" disabled={busy}>
        {busy ? "Saving…" : "Save for review"}
      </button>
    </form>
  );
}
