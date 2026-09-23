import {
  queryRisk,
  queryAudit,
  queryLedger,
  queryReceivables,
  paginate,
  type ListQuery,
} from "./lists";
import { hosted, aiConfigured, setting } from "./runtime";
import { createServerFn } from "@tanstack/react-start";
import {
  actor,
  demoLogin,
  signIn,
  signOut,
  companies,
  switchCompany,
} from "./auth";
import { load, transact, isDemo, cloud } from "./store";
import { mutate, type Command } from "./operations";
import { financialEngine } from "./finance";
import { risks } from "./risk";
import { recommendations } from "./recommendations";
import { authorize } from "./access";
import { previewCsv } from "./imports";
import { advisor, extractDocument } from "./ai";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import type { Role } from "../domain/types";
export async function safe<T>(fn: () => Promise<T>) {
  try {
    return { ok: true as const, data: await fn(), error: null };
  } catch (e) {
    let message =
      e instanceof Error ? e.message : "We could not complete this action.";
    if (message.startsWith("["))
      message = "Check required fields, dates and invoice totals.";
    return { ok: false as const, data: null, error: message };
  }
}
export const sessionFn = createServerFn({ method: "GET" }).handler(async () =>
  safe(async () => ({ actor: await actor(), companies: await companies() })),
);
export const configFn = createServerFn({ method: "GET" }).handler(async () => ({
  demo: isDemo(),
  cloud: !!(setting("SUPABASE_URL") && setting("SUPABASE_ANON_KEY")),
}));
export const loginFn = createServerFn({ method: "POST" })
  .validator((v: { email?: string; password?: string; role?: Role }) => v)
  .handler(async ({ data }) =>
    safe(() =>
      data.role
        ? demoLogin(data.role)
        : signIn(data.email || "", data.password || ""),
    ),
  );
export const signupFn = createServerFn({ method: "POST" })
  .validator(
    (v: { email: string; password: string; name: string; company: string }) =>
      v,
  )
  .handler(async ({ data }) =>
    safe(async () => {
      if (
        data.password.length < 12 ||
        !data.name.trim() ||
        !data.company.trim()
      )
        throw new Error(
          "Enter your name, company and a password of at least 12 characters.",
        );
      const { error } = await cloud().auth.signUp({
        email: data.email,
        password: data.password,
        options: { data: { full_name: data.name, company_name: data.company } },
      });
      if (error)
        throw new Error(
          "Registration could not be completed. Please check your details.",
        );
      return "Check your email to confirm your account, then sign in.";
    }),
  );
export const logoutFn = createServerFn({ method: "POST" }).handler(() => {
  signOut();
  return true;
});
export const switchFn = createServerFn({ method: "POST" })
  .validator((v: string) => v)
  .handler(async ({ data }) => safe(() => switchCompany(data)));
export const viewFn = createServerFn({ method: "POST" })
  .validator(
    (v: {
      page?: number;
      search?: string;
      status?: string;
      vendor?: string;
      from?: string;
      to?: string;
      sort?: string;
    }) => v,
  )
  .handler(async ({ data }) =>
    safe(async () => {
      const a = await actor();
      const l = await load(a);
      const m = financialEngine(l);
      const priority = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      const r = risks(l).sort(
        (a, b) => priority[b.severity] - priority[a.severity],
      );
      let invoices = l.invoices.filter(
        (i) =>
          (!data.search ||
            (
              i.invoice_number +
              " " +
              l.vendors.find((v) => v.id === i.vendor_id)?.name
            )
              .toLowerCase()
              .includes(data.search.toLowerCase())) &&
          (!data.status || i.status === data.status) &&
          (!data.vendor || i.vendor_id === data.vendor) &&
          (!data.from || i.invoice_date >= data.from) &&
          (!data.to || i.invoice_date <= data.to),
      );
      invoices.sort(
        data.sort === "amount"
          ? (a, b) => b.total_minor - a.total_minor
          : (a, b) => b.invoice_date.localeCompare(a.invoice_date),
      );
      const page = Math.max(0, Math.floor(data.page || 0));
      return {
        actor: a,
        company: l.company,
        metrics: {
          ...m,
          projections: m.projections.map((p) => ({
            ...p,
            source_invoices: p.source_invoices.slice(0, 25),
            source_receivables: p.source_receivables.slice(0, 25),
          })),
          vendors: m.vendors.map((v) => ({
            ...v,
            risk_signals: r
              .filter(
                (r) =>
                  l.invoices.find((i) => i.id === r.invoice_id)?.vendor_id ===
                  v.id,
              )
              .reduce((n, r) => n + r.signals.length, 0),
            history: [...v.history]
              .sort((a, b) => a.date.localeCompare(b.date))
              .slice(-24),
          })),
        },
        risks: r.slice(0, 25).map((r) => {
          const i = l.invoices.find((i) => i.id === r.invoice_id)!;
          return {
            ...r,
            invoice_number: i.invoice_number,
            vendor_id: i.vendor_id,
            vendor_name:
              l.vendors.find((v) => v.id === i.vendor_id)?.name || "",
            invoice_date: i.invoice_date,
            total_minor: i.total_minor,
            status: i.status,
          };
        }),
        risk_count: r.length,
        risk_counts: {
          CRITICAL: r.filter((x) => x.severity === "CRITICAL").length,
          HIGH: r.filter((x) => x.severity === "HIGH").length,
          MEDIUM: r.filter((x) => x.severity === "MEDIUM").length,
          LOW: r.filter((x) => x.severity === "LOW").length,
        },
        recommendations: recommendations(l),
        vendors: l.vendors,
        categories: l.categories,
        invoices: invoices.slice(page * 25, (page + 1) * 25),
        invoice_count: invoices.length,
        page,
        receivables: l.receivables.slice(0, 200),
        receipts: l.receipts.slice(-200),
        payments: l.payments.slice(-200),
        audit_logs:
          a.role === "admin" ? l.audit_logs.slice(-200).reverse() : [],
        revision: l.revision,
        ai_connected: aiConfigured(),
      };
    }),
  );
export const invoiceFn = createServerFn({ method: "POST" })
  .validator((v: string) => v)
  .handler(async ({ data }) =>
    safe(async () => {
      const l = await load(await actor());
      const invoice = l.invoices.find((i) => i.id === data);
      if (!invoice) throw new Error("Invoice not found.");
      return {
        invoice,
        vendor: l.vendors.find((v) => v.id === invoice.vendor_id),
        payments: l.payments.filter((p) => p.invoice_id === data),
        risk: risks(l).find((r) => r.invoice_id === data),
        audit: l.audit_logs
          .filter((x) => x.entity_id === data)
          .slice(-100)
          .reverse(),
      };
    }),
  );
export const actionFn = createServerFn({ method: "POST" })
  .validator((v: Command) => v)
  .handler(async ({ data }) =>
    safe(async () => {
      const a = await actor();
      await transact(a, (l) => mutate(l, a, data));
      return true;
    }),
  );
export const csvFn = createServerFn({ method: "POST" })
  .validator((v: { text: string; mapping?: Record<string, string> }) => v)
  .handler(async ({ data }) =>
    safe(async () => {
      const a = await actor();
      authorize(a, true);
      return previewCsv(await load(a), data.text, data.mapping);
    }),
  );
export const importFn = createServerFn({ method: "POST" })
  .validator(
    (v: { text: string; mapping: Record<string, string>; name: string }) => v,
  )
  .handler(async ({ data }) =>
    safe(async () => {
      const a = await actor();
      authorize(a, true);
      await transact(a, (l) => {
        const p = previewCsv(l, data.text, data.mapping);
        if (p.rows.some((r) => r.error) || p.already_imported)
          throw new Error("Fix invalid or duplicated rows before importing.");
        return mutate(l, a, {
          type: "import",
          payload: {
            rows: p.rows.map((r) => r.data),
            hash: p.hash,
            name: data.name,
          },
        });
      });
      return true;
    }),
  );
export const advisorFn = createServerFn({ method: "POST" })
  .validator((v: { question: string; invoiceId?: string }) => v)
  .handler(async ({ data }) =>
    safe(async () =>
      advisor(await load(await actor()), data.question, data.invoiceId),
    ),
  );
export const uploadFn = createServerFn({ method: "POST" })
  .validator((v: { name: string; mime: string; base64: string }) => v)
  .handler(async ({ data }) =>
    safe(async () => {
      const a = await actor();
      authorize(a, true);
      if (
        !["application/pdf", "image/png", "image/jpeg"].includes(data.mime) ||
        data.base64.length > 14_000_000
      )
        throw new Error("Upload a PDF, PNG or JPEG under 10 MB.");
      const bytes = Buffer.from(data.base64, "base64");
      const valid =
        data.mime === "application/pdf"
          ? bytes.subarray(0, 5).toString() === "%PDF-"
          : data.mime === "image/png"
            ? bytes
                .subarray(0, 8)
                .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
            : bytes[0] === 255 && bytes[1] === 216;
      if (!valid) throw new Error("The file contents do not match its type.");
      const file_id =
        a.company_id +
        "/" +
        randomUUID() +
        (data.mime === "application/pdf"
          ? ".pdf"
          : data.mime === "image/png"
            ? ".png"
            : ".jpg");
      if (a.mode === "demo") {
        if (hosted()) {
          await hosted()!.env.BUCKET.put(file_id, bytes, {
            httpMetadata: { contentType: data.mime },
          });
        } else {
          await mkdir(".data/files/" + a.company_id, { recursive: true });
          await writeFile(".data/files/" + file_id, bytes);
        }
      } else {
        const { error } = await cloud(true)
          .storage.from("invoices")
          .upload(file_id, bytes, { contentType: data.mime });
        if (error) throw new Error("Could not store the document.");
      }
      let fields: any = null;
      let warning = "";
      try {
        fields = await extractDocument(data.base64, data.mime);
      } catch (e) {
        warning =
          (e as Error).message +
          " Enter the invoice fields manually and confirm them.";
      }
      return {
        file_id,
        fields,
        warning,
        source: data.mime === "application/pdf" ? "PDF" : "IMAGE",
      };
    }),
  );
export const documentFn = createServerFn({ method: "POST" })
  .validator((v: string) => v)
  .handler(async ({ data }) =>
    safe(async () => {
      const a = await actor();
      if (
        !new RegExp("^" + a.company_id + "/[a-f0-9-]+\\.(pdf|png|jpg)$").test(
          data,
        )
      )
        throw new Error("Document access denied.");
      if (a.mode === "demo") {
        let bytes: Buffer;
        if (hosted()) {
          const file = await hosted()!.env.BUCKET.get(data);
          if (!file) throw new Error("Document not found.");
          bytes = Buffer.from(await file.arrayBuffer());
        } else bytes = await readFile(".data/files/" + data);
        return {
          url:
            "data:" +
            (data.endsWith(".pdf")
              ? "application/pdf"
              : data.endsWith(".png")
                ? "image/png"
                : "image/jpeg") +
            ";base64," +
            bytes.toString("base64"),
        };
      }
      const { data: r, error } = await cloud(true)
        .storage.from("invoices")
        .createSignedUrl(data, 60);
      if (error) throw new Error("Could not open document.");
      return { url: r.signedUrl };
    }),
  );
export const membersFn = createServerFn({ method: "GET" }).handler(async () =>
  safe(async () => {
    const a = await actor();
    authorize(a, false, true);
    if (a.mode === "demo")
      return [
        { user_id: "demo-admin", role: "admin", full_name: "Alex Morgan" },
        { user_id: "demo-finance", role: "finance", full_name: "Demo finance" },
        { user_id: "demo-viewer", role: "viewer", full_name: "Demo viewer" },
      ];
    const { data, error } = await cloud(true)
      .from("user_roles")
      .select("*")
      .eq("company_id", a.company_id);
    if (error) throw new Error("Could not load members.");
    const { data: profiles, error: profileError } = await cloud(true)
      .from("profiles")
      .select("user_id,full_name,email")
      .eq("company_id", a.company_id);
    if (profileError) throw new Error("Could not load member profiles.");
    return data.map((x) => ({
      ...x,
      ...profiles?.find((p) => p.user_id === x.user_id),
    }));
  }),
);
export const roleFn = createServerFn({ method: "POST" })
  .validator((v: { user_id: string; role: Role }) => v)
  .handler(async ({ data }) =>
    safe(async () => {
      const a = await actor();
      authorize(a, true, true);
      if (a.mode === "demo")
        throw new Error("Use the demo role selector on the sign-in page.");
      const { error } = await cloud(true).rpc("finance_set_role", {
        p_actor: a.user_id,
        p_company: a.company_id,
        p_user: data.user_id,
        p_role: data.role,
      });
      if (error)
        throw new Error("Role change failed. Keep at least one administrator.");
      return true;
    }),
  );

export const riskListFn = createServerFn({ method: "POST" })
  .validator((v: ListQuery) => v)
  .handler(async ({ data }) =>
    safe(async () => queryRisk(await load(await actor()), data)),
  );
export const auditListFn = createServerFn({ method: "POST" })
  .validator((v: ListQuery) => v)
  .handler(async ({ data }) =>
    safe(async () => {
      const a = await actor();
      authorize(a, false, true);
      return queryAudit(await load(a), data);
    }),
  );
export const ledgerListFn = createServerFn({ method: "POST" })
  .validator((v: ListQuery) => v)
  .handler(async ({ data }) =>
    safe(async () => queryLedger(await load(await actor()), data)),
  );
export const receivablesListFn = createServerFn({ method: "POST" })
  .validator((v: ListQuery) => v)
  .handler(async ({ data }) =>
    safe(async () => queryReceivables(await load(await actor()), data)),
  );
export const addMemberFn = createServerFn({ method: "POST" })
  .validator((v: { email: string; role: Role }) => v)
  .handler(async ({ data }) =>
    safe(async () => {
      const a = await actor();
      authorize(a, true, true);
      if (a.mode === "demo")
        throw new Error(
          "Member management requires a connected company account. Demo roles are simulations.",
        );
      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) ||
        !["admin", "finance", "viewer"].includes(data.role)
      )
        throw new Error("Enter a valid email and role.");
      const { error } = await cloud(true).rpc("finance_add_member", {
        p_actor: a.user_id,
        p_company: a.company_id,
        p_email: data.email,
        p_role: data.role,
      });
      if (error)
        throw new Error(
          "Could not add this account. It must have a verified email and must not already be a member.",
        );
      return true;
    }),
  );
export const projectionListFn = createServerFn({ method: "POST" })
  .validator(
    (v: ListQuery & { days: number; kind: "payables" | "receivables" }) => v,
  )
  .handler(async ({ data }) =>
    safe(async () => {
      const l = await load(await actor());
      const p = financialEngine(l).projections.find(
        (p) => p.days === data.days,
      );
      if (!p) throw new Error("Choose a valid projection horizon.");
      return paginate(
        data.kind === "payables" ? p.source_invoices : p.source_receivables,
        data.page,
      );
    }),
  );
export const vendorHistoryFn = createServerFn({ method: "POST" })
  .validator((v: ListQuery & { id: string }) => v)
  .handler(async ({ data }) =>
    safe(async () => {
      const l = await load(await actor());
      const v = financialEngine(l).vendors.find((v) => v.id === data.id);
      if (!v) throw new Error("Vendor not found.");
      return paginate(
        [...v.history].sort((a, b) => b.date.localeCompare(a.date)),
        data.page,
      );
    }),
  );
