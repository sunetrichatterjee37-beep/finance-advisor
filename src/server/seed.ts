import type { Ledger, Invoice, Status } from "../domain/types";
import { addDays, today } from "../domain/money";
export function seed(company_id: string, asOf = today()): Ledger {
  const at = new Date().toISOString();
  const row = (id: string) => ({ id, company_id, created_at: at });
  const start = asOf.slice(0, 7) + "-01";
  const end = new Date(Number(asOf.slice(0, 4)), Number(asOf.slice(5, 7)), 0)
    .toISOString()
    .slice(0, 10);
  const l: Ledger = {
    company: {
      id: company_id,
      name: "NovaTech Solutions Pvt. Ltd.",
      currency_code: "INR",
      opening_cash_minor: 140000000,
      opening_date: addDays(asOf, -120),
    },
    vendors: [
      "CloudMatrix",
      "OfficeHub",
      "TechServe",
      "LogiPro",
      "DataWorks",
    ].map((name, k) => ({
      ...row("v" + k),
      name,
      email: name.toLowerCase() + "@example.test",
      category: [
        "Technology",
        "Operations",
        "Technology",
        "Logistics",
        "Technology",
      ][k],
    })),
    categories: ["Technology", "Operations", "Logistics"].map((name, k) => ({
      ...row("c" + k),
      name,
    })),
    invoices: [],
    payments: [],
    receivables: [],
    receipts: [],
    budgets: [
      {
        ...row("b0"),
        category_id: "c0",
        period_start: start,
        period_end: end,
        budget_minor: 48000000,
        currency_code: "INR",
      },
      {
        ...row("b1"),
        category_id: "c1",
        period_start: start,
        period_end: end,
        budget_minor: 18000000,
        currency_code: "INR",
      },
      {
        ...row("b2"),
        category_id: "c2",
        period_start: start,
        period_end: end,
        budget_minor: 14000000,
        currency_code: "INR",
      },
    ],
    audit_logs: [],
    recommendations: [],
    imports: [],
    alerts: [],
    revision: 0,
  };
  const invoice = (
    id: string,
    v: number,
    n: string,
    total: number,
    date: string,
    due: string,
    status: Status,
    description: string,
  ): Invoice => ({
    ...row(id),
    vendor_id: "v" + v,
    category_id: v === 1 ? "c1" : v === 3 ? "c2" : "c0",
    invoice_number: n,
    invoice_date: date,
    due_date: due,
    subtotal_minor: total,
    tax_minor: 0,
    total_minor: total,
    currency_code: "INR",
    status,
    source: "MANUAL",
    description,
    ...(["APPROVED", "PAID", "SCHEDULED"].includes(status)
      ? { approved_at: at, approved_by: "demo-finance" }
      : {}),
  });
  for (let k = 0; k < 3; k++) {
    const d = addDays(start, -20 - 30 * k);
    l.invoices.push(
      invoice(
        "hist" + k,
        0,
        "CM-H" + k,
        4000000,
        d,
        addDays(d, 10),
        "PAID",
        "Cloud infrastructure",
      ),
    );
    l.payments.push({
      ...row("p-h" + k),
      invoice_id: "hist" + k,
      amount_minor: 4000000,
      payment_date: addDays(d, 10),
      currency_code: "INR",
      reference: "BANK-H" + k,
      status: "COMPLETED",
    });
  }
  l.invoices.push(
    invoice(
      "inv-1042",
      0,
      "CM-1042",
      9600000,
      start,
      addDays(asOf, -4),
      "APPROVED",
      "Cloud infrastructure",
    ),
    invoice(
      "inv-1043",
      0,
      "CM-1042",
      9600000,
      addDays(start, 1),
      addDays(asOf, 10),
      "PENDING_REVIEW",
      "Cloud infrastructure",
    ),
    invoice(
      "inv-1044",
      1,
      "OH-0821",
      8500000,
      start,
      addDays(asOf, -2),
      "APPROVED",
      "Office renewal",
    ),
    invoice(
      "inv-1045",
      2,
      "TS-0914",
      21000000,
      start,
      addDays(asOf, 18),
      "SCHEDULED",
      "Software implementation",
    ),
    invoice(
      "inv-1046",
      3,
      "LP-0610",
      7200000,
      start,
      addDays(asOf, 45),
      "APPROVED",
      "Regional logistics",
    ),
    invoice(
      "inv-1047",
      4,
      "DW-0912",
      13500000,
      start,
      addDays(asOf, 70),
      "APPROVED",
      "Data platform subscription",
    ),
  );
  l.payments.push({
    ...row("p-partial"),
    invoice_id: "inv-1044",
    amount_minor: 3000000,
    payment_date: asOf,
    currency_code: "INR",
    reference: "BANK-2309",
    status: "COMPLETED",
  });
  for (let k = 0; k < 4; k++)
    l.invoices.push(
      invoice(
        "freq" + k,
        3,
        "LP-NEW" + k,
        500000,
        start,
        addDays(asOf, 15 + k),
        "PENDING_REVIEW",
        "Local dispatch",
      ),
    );
  for (let k = 0; k < 3; k++)
    l.invoices.push(
      invoice(
        "fh" + k,
        3,
        "LP-H" + k,
        500000,
        addDays(start, -15 - 30 * k),
        addDays(start, -5 - 30 * k),
        "APPROVED",
        "Local dispatch",
      ),
    );
  l.receivables = [
    {
      ...row("rec1"),
      customer_name: "Aster Technologies",
      reference_number: "REC-2201",
      issue_date: start,
      due_date: addDays(asOf, -3),
      amount_minor: 20000000,
      received_minor: 5000000,
      currency_code: "INR",
    },
    {
      ...row("rec2"),
      customer_name: "Meridian Labs",
      reference_number: "REC-2202",
      issue_date: start,
      due_date: addDays(asOf, 22),
      amount_minor: 35000000,
      received_minor: 0,
      currency_code: "INR",
    },
    {
      ...row("rec3"),
      customer_name: "Orbit Services",
      reference_number: "REC-2203",
      issue_date: start,
      due_date: addDays(asOf, 55),
      amount_minor: 18000000,
      received_minor: 0,
      currency_code: "INR",
    },
  ];
  l.receipts = [
    {
      ...row("receipt1"),
      receivable_id: "rec1",
      amount_minor: 5000000,
      receipt_date: asOf,
      reference: "NEFT-0822",
    },
  ];
  return l;
}
