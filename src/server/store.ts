import { hosted, setting } from "./runtime";
import { createClient } from "@supabase/supabase-js";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import type { Ledger, Actor } from "../domain/types";
import { seed } from "./seed";
import { isolate } from "./access";
export const isDemo = () => setting("DEMO_MODE") === "true";
export function cloud(admin = false) {
  const url = setting("SUPABASE_URL");
  const key = admin
    ? setting("SUPABASE_SERVICE_ROLE_KEY")
    : setting("SUPABASE_ANON_KEY");
  if (!url || !key)
    throw new Error(
      "Cloud connection is not configured. Ask your administrator to finish setup.",
    );
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
const fields = [
  "vendors",
  "categories",
  "invoices",
  "payments",
  "receivables",
  "receipts",
  "budgets",
  "audit_logs",
  "recommendations",
  "imports",
  "alerts",
] as const;
const path = (company: string) => {
  if (!/^[a-zA-Z0-9-]+$/.test(company)) throw new Error("Invalid company.");
  return resolve(".data", company + ".json");
};
export async function load(actor: Actor): Promise<Ledger> {
  if (actor.mode === "demo") {
    const h = hosted();
    if (h) {
      const row = await h.env.DB.prepare(
        "SELECT ledger FROM demo_ledgers WHERE id = ? AND owner = ?",
      )
        .bind(actor.company_id, h.user)
        .first();
      if (!row)
        throw new Error("Workspace not found. Reopen your demo workspace.");
      return isolate(JSON.parse(row.ledger), actor);
    }
    return isolate(
      JSON.parse(await readFile(path(actor.company_id), "utf8")),
      actor,
    );
  }
  const { data, error } = await cloud(true).rpc("finance_snapshot", {
    p_company: actor.company_id,
  });
  if (error || !data) throw new Error("Could not read your company ledger.");
  return isolate(data as Ledger, actor);
}

let queue = Promise.resolve();
export async function transact(
  actor: Actor,
  operation: (l: Ledger) => Ledger,
): Promise<Ledger> {
  let release!: () => void;
  const old = queue;
  queue = new Promise<void>((r) => (release = r));
  await old;
  try {
    const original = await load(actor);
    const next = operation(original);
    if (actor.mode === "demo") {
      const h = hosted();
      if (h) {
        const result = await h.env.DB.prepare(
          "UPDATE demo_ledgers SET ledger = ?, revision = ? WHERE id = ? AND owner = ? AND revision = ?",
        )
          .bind(
            JSON.stringify(next),
            next.revision,
            actor.company_id,
            h.user,
            original.revision,
          )
          .run();
        if (result.meta.changes !== 1)
          throw new Error("The ledger changed. Refresh and try again.");
        return next;
      }
      const file = path(actor.company_id);
      await writeFile(file + ".tmp", JSON.stringify(next));
      await rename(file + ".tmp", file);
    } else {
      const changes: Record<string, unknown> = {};
      for (const table of fields) {
        const rows = next[table].filter(
          (r) =>
            JSON.stringify(r) !==
            JSON.stringify(original[table].find((x) => x.id === r.id)),
        );
        if (rows.length) changes[table] = rows;
      }
      if (JSON.stringify(next.company) !== JSON.stringify(original.company))
        changes.company = next.company;
      const { error } = await cloud(true).rpc("finance_commit", {
        p_company: actor.company_id,
        p_revision: original.revision,
        p_changes: changes,
      });
      if (error)
        throw new Error(
          "The ledger changed or could not be saved. Refresh and try again.",
        );
    }
    return next;
  } finally {
    release();
  }
}
export async function createDemo() {
  const h = hosted();
  const id =
    "demo-" +
    (h ? createHash("sha256").update(h.user).digest("hex") : randomUUID());
  const l = seed(id);
  if (h) {
    await h.env.DB.prepare(
      "INSERT INTO demo_ledgers (id, owner, revision, ledger) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO NOTHING",
    )
      .bind(id, h.user, l.revision, JSON.stringify(l))
      .run();
    return id;
  }
  await mkdir(".data", { recursive: true });
  await writeFile(path(id), JSON.stringify(l));
  return id;
}
