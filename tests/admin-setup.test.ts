import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("simple admin setup creates or promotes only the selected Auth user", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create schema auth;
      create table auth.users(id uuid primary key);
      create table public.profiles(id uuid primary key references auth.users, full_name text not null default '', role text, updated_at timestamptz default now());
      insert into auth.users values ('00000000-0000-4000-8000-000000000001'), ('00000000-0000-4000-8000-000000000002');
      insert into public.profiles(id,full_name,role) values ('00000000-0000-4000-8000-000000000002','Other user','student');`);
    const script = await readFile("supabase/admin-setup.sql", "utf8");
    const run = (id: string) =>
      db.exec(script.replaceAll("YOUR-USER-UUID", id));
    await assert.rejects(run("invalid"), /invalid input syntax for type uuid/);
    await assert.rejects(
      run("00000000-0000-4000-8000-000000000099"),
      /foreign key constraint/,
    );
    const admin = "00000000-0000-4000-8000-000000000001";
    await run(admin);
    await db.query(
      "update public.profiles set full_name='Existing name',role='student' where id=$1",
      [admin],
    );
    await run(admin);
    assert.deepEqual(
      (await db.query("select full_name,role from public.profiles order by id"))
        .rows,
      [
        { full_name: "Existing name", role: "super_admin" },
        { full_name: "Other user", role: "student" },
      ],
    );
  } finally {
    await db.close();
  }
});
