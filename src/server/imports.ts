import Papa from "papaparse";
import { createHash } from "node:crypto";
import type { Ledger } from "../domain/types";
import { minor } from "../domain/money";
import { invoiceInput } from "./validation";
export const csvFields = [
  "vendor",
  "invoice_number",
  "category",
  "invoice_date",
  "due_date",
  "subtotal",
  "tax",
  "total",
  "description",
] as const;
export function previewCsv(
  l: Ledger,
  text: string,
  mapping: Record<string, string> = {},
) {
  if (Buffer.byteLength(text) > 2_000_000)
    throw new Error("CSV files must be smaller than 2 MB.");
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  if (parsed.errors.length)
    throw new Error("CSV format is invalid: " + parsed.errors[0].message);
  if (parsed.data.length > 500)
    throw new Error("Import up to 500 rows at a time.");
  const headers = parsed.meta.fields || [];
  const map = Object.fromEntries(
    csvFields.map((f) => [
      f,
      mapping[f] ||
        headers.find((h) => h.trim().toLowerCase().replace(/ /g, "_") === f) ||
        f,
    ]),
  );
  const seen = new Set(
    l.invoices.map((i) => i.vendor_id + "|" + i.invoice_number.toLowerCase()),
  );
  const rows = parsed.data.map((row, index) => {
    try {
      const get = (f: string) => row[map[f]] || "";
      const vendor = l.vendors.find(
        (v) => v.name.toLowerCase() === get("vendor").trim().toLowerCase(),
      );
      const category = l.categories.find(
        (c) => c.name.toLowerCase() === get("category").trim().toLowerCase(),
      );
      const data = invoiceInput.parse({
        vendor_id: vendor?.id || "",
        category_id: category?.id || "",
        invoice_number: get("invoice_number"),
        invoice_date: get("invoice_date"),
        due_date: get("due_date"),
        subtotal_minor: minor(get("subtotal")),
        tax_minor: minor(get("tax") || "0"),
        total_minor: minor(get("total")),
        currency_code: "INR",
        description: get("description"),
        source: "CSV",
      });
      const key = data.vendor_id + "|" + data.invoice_number.toLowerCase();
      if (seen.has(key))
        throw new Error(
          "Vendor and invoice number already exist in the ledger or this CSV.",
        );
      seen.add(key);
      return { row: index + 2, data, error: null };
    } catch (e) {
      return {
        row: index + 2,
        data: null,
        error: e instanceof Error ? e.message : "Invalid row",
      };
    }
  });
  return {
    headers,
    mapping: map,
    rows,
    hash: createHash("sha256").update(text).digest("hex"),
    already_imported: l.imports.some(
      (i) => i.file_hash === createHash("sha256").update(text).digest("hex"),
    ),
  };
}
