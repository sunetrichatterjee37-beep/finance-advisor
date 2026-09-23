import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
test("member management is service-only, verified-account-only, company-admin-only and audited", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);grant usage on schema auth,public to authenticated;`,
    );
    await db.exec(
      (await readFile("database/001_schema.sql", "utf8")).replace(
        "create extension if not exists pgcrypto;",
        "",
      ),
    );
    await db.exec(await readFile("database/002_members.sql", "utf8"));
    const admin = "00000000-0000-4000-8000-000000000001",
      member = "00000000-0000-4000-8000-000000000002";
    await db.query(
      "insert into auth.users values ($1,'admin@test.example',now(),'{}'),($2,'member@test.example',null,'{}')",
      [admin, member],
    );
    await db.query(
      "select finance_onboard($1,'Admin','admin@test.example','Company')",
      [admin],
    );
    const cid = (
      await db.query<{ company_id: string }>(
        "select company_id from user_roles",
      )
    ).rows[0].company_id;
    await assert.rejects(
      db.query(
        "select finance_add_member($1,$2,'member@test.example','finance')",
        [admin, cid],
      ),
      /verified account/,
    );
    await db.query(
      "update auth.users set email_confirmed_at=now() where id=$1",
      [member],
    );
    await assert.rejects(
      db.query(
        "select finance_add_member($1,$2,'member@test.example','finance')",
        [member, cid],
      ),
      /Administrator/,
    );
    await db.exec("set role authenticated");
    await assert.rejects(
      db.query(
        "select finance_add_member($1,$2,'member@test.example','admin')",
        [admin, cid],
      ),
      /permission denied/,
    );
    await db.exec("reset role");
    await db.query(
      "select finance_add_member($1,$2,'member@test.example','finance')",
      [admin, cid],
    );
    assert.equal(
      (
        await db.query<{ role: string }>(
          "select role from user_roles where user_id=$1",
          [member],
        )
      ).rows[0].role,
      "finance",
    );
    assert.equal(
      (
        await db.query(
          "select * from audit_logs where entity_type='user_roles'",
        )
      ).rows.length,
      1,
    );
    await assert.rejects(
      db.query(
        "select finance_add_member($1,$2,'member@test.example','admin')",
        [admin, cid],
      ),
      /already a company member/,
    );
  } finally {
    await db.close();
  }
});
