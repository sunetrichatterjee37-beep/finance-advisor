export type Role = "admin" | "finance" | "viewer";
export type Status =
  | "DRAFT"
  | "EXTRACTED"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "SCHEDULED"
  | "PAID"
  | "REJECTED"
  | "INVESTIGATION";
export type Row = { id: string; company_id: string; created_at: string };
export type Invoice = Row & {
  vendor_id: string;
  category_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  scheduled_payment_date?: string;
  subtotal_minor: number;
  tax_minor: number;
  total_minor: number;
  currency_code: string;
  status: Status;
  source: string;
  description: string;
  file_id?: string;
  approved_at?: string;
  approved_by?: string;
  confirmed_at?: string;
};
export type Payment = Row & {
  invoice_id: string;
  amount_minor: number;
  payment_date: string;
  currency_code: string;
  reference: string;
  status: "COMPLETED";
};
export type Receipt = Row & {
  receivable_id: string;
  amount_minor: number;
  receipt_date: string;
  reference: string;
};
export type Receivable = Row & {
  customer_name: string;
  reference_number: string;
  issue_date: string;
  due_date: string;
  amount_minor: number;
  received_minor: number;
  currency_code: string;
};
export type Budget = Row & {
  category_id: string;
  period_start: string;
  period_end: string;
  budget_minor: number;
  currency_code: string;
};
export type Vendor = Row & { name: string; email: string; category: string };
export type Category = Row & { name: string };
export type Audit = Row & {
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  previous_state: any;
  new_state: any;
  metadata: Record<string, any>;
};
export type RecommendationState = Row & {
  status: "OPEN" | "REVIEWED" | "ACCEPTED" | "DISMISSED" | "COMPLETED";
  reason: string;
};
export type ImportRecord = Row & {
  file_hash: string;
  file_name: string;
  total_rows: number;
  valid_rows: number;
  status: string;
};
export type StoredAlert = Row & {
  invoice_id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  signal_data: Record<string, any>;
  evidence: Record<string, any>;
  status: string;
};
export type Ledger = {
  company: {
    id: string;
    name: string;
    currency_code: string;
    opening_cash_minor: number;
    opening_date: string;
  };
  vendors: Vendor[];
  categories: Category[];
  invoices: Invoice[];
  payments: Payment[];
  receivables: Receivable[];
  receipts: Receipt[];
  budgets: Budget[];
  audit_logs: Audit[];
  recommendations: RecommendationState[];
  imports: ImportRecord[];
  alerts: StoredAlert[];
  revision: number;
};
export type Actor = {
  user_id: string;
  company_id: string;
  role: Role;
  name: string;
  mode: "demo" | "cloud";
};
export type Signal = {
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  reason: string;
  calculation: string;
  source_records: string[];
  input_values: Record<string, string | number | boolean | null>;
  timestamp: string;
};
export type Risk = {
  invoice_id: string;
  signals: Signal[];
  severity: Signal["severity"];
};
export type Recommendation = {
  id: string;
  title: string;
  reason: string;
  priority: string;
  source_records: string[];
  status: RecommendationState["status"];
};
