import { z } from "zod";
import { dateValid } from "../domain/money";
const date = z.string().refine(dateValid, "Enter a valid date.");
const amount = z.number().int().nonnegative().max(1_000_000_000_000);
export const invoiceInput = z
  .object({
    vendor_id: z.string().min(1),
    category_id: z.string().min(1),
    invoice_number: z.string().trim().min(1).max(100),
    invoice_date: date,
    due_date: date,
    subtotal_minor: amount,
    tax_minor: amount,
    total_minor: amount,
    currency_code: z.literal("INR"),
    description: z.string().max(2000),
    source: z.enum(["MANUAL", "CSV", "PDF", "IMAGE"]),
    file_id: z.string().optional(),
  })
  .refine(
    (x) => x.total_minor === x.subtotal_minor + x.tax_minor,
    "Total must equal subtotal plus tax.",
  )
  .refine(
    (x) => x.due_date >= x.invoice_date,
    "Due date cannot precede invoice date.",
  );
export const paymentInput = z.object({
  invoice_id: z.string(),
  amount_minor: amount.positive(),
  payment_date: date,
  reference: z.string().trim().min(1).max(100),
  currency_code: z.literal("INR"),
});
export const receivableInput = z
  .object({
    customer_name: z.string().trim().min(1).max(120),
    reference_number: z.string().trim().min(1).max(100),
    issue_date: date,
    due_date: date,
    amount_minor: amount.positive(),
    currency_code: z.literal("INR"),
  })
  .refine(
    (x) => x.due_date >= x.issue_date,
    "Due date cannot precede issue date.",
  );
export const budgetInput = z
  .object({
    category_id: z.string(),
    period_start: date,
    period_end: date,
    budget_minor: amount.positive(),
    currency_code: z.literal("INR"),
  })
  .refine((x) => x.period_end >= x.period_start, "Budget period is invalid.");
