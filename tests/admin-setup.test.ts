import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("UUID admin setup validates the account and creates or updates its profile", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create schema auth;
      create table auth.users(id uuid primary key, email_confirmed_at timestamptz, raw_user_meta_data jsonb);
      create table public.profiles(id uuid primary key references auth.users, full_name text, role text, updated_at timestamptz default now());
      create table public.audit_logs(actor_user_id uuid, action text, entity_type text, entity_id uuid, metadata jsonb);
      insert into auth.users values
        ('00000000-0000-4000-8000-000000000001', now(), '{"full_name":"Administrator"}'),
        ('00000000-0000-4000-8000-000000000002', null, '{}');
    `);
    const script = await readFile("supabase/admin-setup.sql", "utf8");
    const run = (uuid: string) =>
      db.exec(
        script.replace(
          "admin_user_uuid text := 'REPLACE_WITH_ADMIN_USER_UUID'",
          `admin_user_uuid text := '${uuid}'`,
        ),
      );
    for (const [uuid, message] of [
      ["invalid", /Invalid UUID/],
      [
        "00000000-0000-4000-8000-000000000099",
        /No Supabase Authentication user/,
      ],
      ["00000000-0000-4000-8000-000000000002", /Confirm this account/],
    ] as const) {
      await assert.rejects(run(uuid), message);
      await db.exec("rollback");
    }
    const admin = "00000000-0000-4000-8000-000000000001";
    await run(admin);
    assert.deepEqual(
      (await db.query("select full_name,role from public.profiles")).rows,
      [{ full_name: "Administrator", role: "super_admin" }],
    );
    await db.exec(
      "update public.profiles set full_name='Existing name', role='student'",
    );
    await run(admin);
    assert.deepEqual(
      (await db.query("select full_name,role from public.profiles")).rows,
      [{ full_name: "Existing name", role: "super_admin" }],
    );
    assert.equal(
      (await db.query("select * from public.audit_logs")).rows.length,
      2,
    );
  } finally {
    await db.close();
  }
});
