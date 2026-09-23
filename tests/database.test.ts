import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("PostgreSQL migration: RLS, cross-company foreign keys, CAS and atomic audit", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);grant usage on schema auth,public to authenticated;`,
    );
    const migration = (
      await readFile("database/001_schema.sql", "utf8")
    ).replace("create extension if not exists pgcrypto;", "");
    await db.exec(migration);
    const uid = "00000000-0000-4000-8000-000000000001";
    await db.query("insert into auth.users values($1)", [uid]);
    await db.query("select finance_onboard($1,$2,$3,$4)", [
      uid,
      "Test Admin",
      "test@example.test",
      "Test Company",
    ]);
    const result = await db.query<{ company_id: string }>(
      "select company_id from user_roles",
    );
    const cid = result.rows[0].company_id;
    await db.exec(
      `insert into companies(id,name) values('other','Other Company');insert into vendors(id,company_id,name) values('other-vendor','other','Secret');`,
    );
    await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [
      uid,
    ]);
    await db.exec("set role authenticated");
    const visible = await db.query("select * from vendors");
    assert.equal(visible.rows.length, 0);
    const companies = await db.query("select id from companies");
    assert.equal(companies.rows.length, 1);
    await assert.rejects(
      db.query(
        `insert into vendors(id,company_id,name) values('bad',$1,'Bad')`,
        [cid],
      ),
      /permission denied/,
    );
    await assert.rejects(
      db.query(`select finance_commit($1,0,'{}')`, [cid]),
      /permission denied/,
    );
    await db.exec("reset role");
    const stamp = new Date().toISOString();
    const vendor = {
      id: "v1",
      company_id: cid,
      created_at: stamp,
      name: "Vendor",
      email: "",
      category: "",
    };
    await db.query("select finance_commit($1,$2,$3)", [
      cid,
      0,
      JSON.stringify({ vendors: [vendor] }),
    ]);
    await assert.rejects(
      db.query("select finance_commit($1,$2,$3)", [cid, 0, "{}"]),
      /Ledger changed/,
    );
    const category = (
      await db.query<{ id: string }>(
        "select id from categories where company_id=$1 limit 1",
        [cid],
      )
    ).rows[0].id;
    const invoice = {
      id: "i1",
      company_id: cid,
      created_at: stamp,
      vendor_id: "other-vendor",
      category_id: category,
      invoice_number: "X",
      invoice_date: "2026-09-01",
      due_date: "2026-09-30",
      subtotal_minor: 100,
      tax_minor: 0,
      total_minor: 100,
      currency_code: "INR",
      status: "PENDING_REVIEW",
      source: "MANUAL",
      description: "",
    };
    const audit = {
      id: "a1",
      company_id: cid,
      created_at: stamp,
      user_id: uid,
      action: "CREATE",
      entity_type: "invoice",
      entity_id: "i1",
      previous_state: null,
      new_state: invoice,
      metadata: {},
    };
    await assert.rejects(
      db.query("select finance_commit($1,$2,$3)", [
        cid,
        1,
        JSON.stringify({ audit_logs: [audit], invoices: [invoice] }),
      ]),
      /foreign key/,
    );
    assert.equal(
      (await db.query("select * from audit_logs where id=$1", ["a1"])).rows
        .length,
      0,
    );
    invoice.vendor_id = "v1";
    await db.query("select finance_commit($1,$2,$3)", [
      cid,
      1,
      JSON.stringify({ audit_logs: [audit], invoices: [invoice] }),
    ]);
    const snap = (
      await db.query<{ finance_snapshot: any }>("select finance_snapshot($1)", [
        cid,
      ])
    ).rows[0].finance_snapshot;
    assert.equal(snap.invoices.length, 1);
    assert.equal(snap.revision, 2);
    assert.equal(snap.audit_logs.length, 2);
    await assert.rejects(
      db.query("select finance_set_role($1,$2,$1,$3)", [uid, cid, "viewer"]),
      /last administrator/,
    );
  } finally {
    await db.close();
  }
});
