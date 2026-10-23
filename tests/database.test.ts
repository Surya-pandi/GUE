import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
test("migrations enforce privacy, role protection, booking workflows, and reports", async (t) => {
  const db = new PGlite({ extensions: { btree_gist, pgcrypto } });
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create schema storage;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth,storage to anon,authenticated,service_role;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;
 grant select,insert,delete on storage.objects to authenticated;`);
  for (const file of [
    "001_schema.sql",
    "002_workflows.sql",
    "003_storage_reports.sql",
    "004_hardening.sql",
    "005_discovery_and_reminders.sql",
    "006_upload_permissions.sql",
    "007_admin_management.sql",
    "008_admin_deletion.sql",
    "009_university_terminology.sql",
    "010_university_media.sql",
    "011_student_profile_details.sql",
    "012_optional_student_marks.sql",
    "013_student_district.sql",
    "014_university_setup.sql",
    "015_course_catalog_and_fees.sql",
    "016_course_selection.sql",
    "017_remove_document_setup.sql",
    "018_gallery_minimum_photos.sql",
    "019_automatic_gallery_photos.sql",
    "020_google_maps_short_links.sql",
    "021_automatic_university_publication.sql",
  ]) {
    if (file === "009_university_terminology.sql") {
      await db.exec(`
        insert into auth.users(id,email) values
          ('00000000-0000-4000-8000-000000000099','migration@test.invalid');
        insert into public.institutions(owner_user_id,name,slug,institution_type,official_email,city,state)
        values
          ('00000000-0000-4000-8000-000000000099','Private fixture','private-fixture','Private college','private@test.invalid','Test','Test'),
          ('00000000-0000-4000-8000-000000000099','Government fixture','government-fixture','Government college','government@test.invalid','Test','Test');
        insert into public.college_media(institution_id,storage_path,alt_text)
          select id,'migration/media/retained.png','Retained campus photograph'
          from public.institutions where slug='private-fixture';
      `);
    }
    await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
  }
  await t.test(
    "terminology migration converts existing institution types",
    async () => {
      assert.equal(
        (
          await db.query<{ old_table: string | null }>(
            "select to_regclass('public.college_media') as old_table",
          )
        ).rows[0].old_table,
        null,
      );
      assert.equal(
        (
          await db.query<{ alt_text: string }>(
            "select alt_text from public.university_media",
          )
        ).rows[0].alt_text,
        "Retained campus photograph",
      );
      assert.equal(
        (
          await db.query<{ relrowsecurity: boolean }>(
            "select relrowsecurity from pg_class where oid='public.university_media'::regclass",
          )
        ).rows[0].relrowsecurity,
        true,
      );
      assert.equal(
        (
          await db.query(
            "select relname from pg_class where relnamespace='public'::regnamespace and relname like '%college%'",
          )
        ).rows.length,
        0,
      );
      assert.equal(
        (
          await db.query(
            "select proname from pg_proc where pronamespace='public'::regnamespace and prosrc ilike '%college%'",
          )
        ).rows.length,
        0,
      );
      const { rows } = await db.query<{ institution_type: string }>(
        "select institution_type from public.institutions order by institution_type",
      );
      assert.deepEqual(
        rows.map((row) => row.institution_type),
        ["Government university", "Private university"],
      );
      await db.exec(`
      delete from public.institutions where owner_user_id='00000000-0000-4000-8000-000000000099';
      delete from auth.users where id='00000000-0000-4000-8000-000000000099';
    `);
    },
  );
  const student = "00000000-0000-4000-8000-000000000001",
    other = "00000000-0000-4000-8000-000000000002",
    owner = "00000000-0000-4000-8000-000000000003",
    admin = "00000000-0000-4000-8000-000000000004";
  await db.query(
    `insert into auth.users(id,email,raw_user_meta_data) values ($1,'student@test.invalid','{"full_name":"Student","role":"super_admin"}'),($2,'other@test.invalid','{}'),($3,'owner@test.invalid','{}'),($4,'admin@test.invalid','{}')`,
    [student, other, owner, admin],
  );
  await db.query(`update public.profiles set role='super_admin' where id=$1`, [
    admin,
  ]);
  async function asUser(id: string, role = "authenticated") {
    await db.exec("reset role");
    await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [id]);
    await db.exec(`set role ${role}`);
  }
  async function rpc(fn: string, args: unknown[]) {
    return db.query<{ result: string }>(
      `select public.${fn}(${args.map((_, i) => "$" + (i + 1)).join(",")}) as result`,
      args,
    );
  }
  await asUser(student);
  await t.test(
    "student details validate input, preserve roles and save only the current profile",
    async () => {
      const details = {
        full_name: "Test Student",
        year_passed: new Date().getFullYear(),
        marks: "475.5",
        cutoff: "",
        phone: "9876543210",
        parent_phone: "9876543211",
        id: other,
        role: "super_admin",
      };
      await assert.rejects(
        rpc("save_student_details", [{ ...details, marks: "-1" }]),
        /Check your name/,
      );
      await assert.rejects(
        rpc("save_student_details", [{ ...details, parent_phone: "bad" }]),
        /Check your name/,
      );
      await rpc("save_student_details", [{ ...details, marks: "" }]);
      assert.equal(
        (
          await db.query<{ marks: number | null }>(
            "select marks from public.profiles where id=auth.uid()",
          )
        ).rows[0].marks,
        null,
      );
      await rpc("save_student_details", [details]);
      const { rows } = await db.query<{
        role: string;
        cutoff: number | null;
        student_profile_completed_at: string | null;
      }>(
        "select role,cutoff,student_profile_completed_at from public.profiles where id=auth.uid()",
      );
      assert.equal(rows[0].role, "student");
      assert.equal(rows[0].cutoff, null);
      assert.ok(rows[0].student_profile_completed_at);
      await asUser(other);
      assert.equal(
        (
          await db.query<{ student_profile_completed_at: string | null }>(
            "select student_profile_completed_at from public.profiles where id=auth.uid()",
          )
        ).rows[0].student_profile_completed_at,
        null,
      );
      await asUser(admin);
      await assert.rejects(
        rpc("save_student_details", [details]),
        /student account/,
      );
      await asUser(student);
      await rpc("save_student_details", [{ ...details, cutoff: "185.5" }]);
      assert.equal(
        Number(
          (
            await db.query<{ cutoff: string }>(
              "select cutoff from public.profiles where id=auth.uid()",
            )
          ).rows[0].cutoff,
        ),
        185.5,
      );
    },
  );
  await t.test(
    "district is saved privately, preserved when omitted, and can be cleared",
    async () => {
      const payload = {
        full_name: "Test Student",
        district: " Coimbatore ",
        id: other,
      };
      await rpc("manage_record", ["profile", payload]);
      const district = async () =>
        (
          await db.query<{ district: string }>(
            "select district from public.profiles where id=auth.uid()",
          )
        ).rows[0].district;
      assert.equal(await district(), "Coimbatore");
      await rpc("manage_record", ["profile", { full_name: "Test Student" }]);
      assert.equal(await district(), "Coimbatore");
      await assert.rejects(
        rpc("manage_record", [
          "profile",
          { ...payload, district: "x".repeat(101) },
        ]),
        /check constraint/,
      );
      await asUser(other);
      assert.equal(await district(), "");
      assert.equal(
        (
          await db.query("select district from public.profiles where id=$1", [
            student,
          ])
        ).rows.length,
        0,
      );
      await asUser(student);
      await rpc("manage_record", ["profile", { ...payload, district: "" }]);
      assert.equal(await district(), "");
    },
  );
  await t.test("signup metadata cannot assign privileges", async () => {
    const { rows } = await db.query<{ role: string }>(
      "select role from public.profiles",
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].role, "student");
    await assert.rejects(
      db.exec("update public.profiles set role='super_admin'"),
      /permission denied/,
    );
    await assert.rejects(
      rpc("manage_record", [
        "verify",
        { institution_id: student, status: "approved" },
      ]),
      /Access denied/,
    );
  });
  await asUser(owner);
  const { rows: application } = await rpc("submit_institution", [
    {
      name: "Test institution",
      institution_type: "University",
      official_email: "university@test.invalid",
      city: "Test City",
      state: "Test State",
    },
  ]);
  const institution = application[0].result as string;
  await asUser("", "anon");
  await t.test(
    "anonymous visitors cannot see pending institutions or private tables",
    async () => {
      assert.equal(
        (await db.query("select * from public.institutions")).rows.length,
        0,
      );
      await assert.rejects(
        db.query("select * from public.profiles"),
        /permission denied/,
      );
      await assert.rejects(
        rpc("throttle", ["bypass", 100, 10]),
        /permission denied/,
      );
    },
  );
  await asUser(admin);
  await rpc("manage_record", [
    "verify",
    { institution_id: institution, status: "approved", notes: "Reviewed" },
  ]);
  await asUser(owner);
  await rpc("manage_record", [
    "slot",
    {
      institution_id: institution,
      kind: "counselling",
      starts_at: "2035-01-01T10:00:00Z",
      ends_at: "2035-01-01T10:30:00Z",
    },
  ]);
  await rpc("manage_record", [
    "slot",
    {
      institution_id: institution,
      kind: "visit",
      starts_at: "2035-01-02T10:00:00Z",
      ends_at: "2035-01-02T11:00:00Z",
      capacity: 3,
    },
  ]);
  const { rows: slots } = await db.query<{ id: string }>(
    "select id from public.counselling_slots",
  );
  const slot = slots[0].id;
  const { rows: visits } = await db.query<{ id: string }>(
    "select id from public.campus_visit_slots",
  );
  const visit = visits[0].id;
  await t.test("representative availability cannot overlap", async () => {
    await assert.rejects(
      rpc("manage_record", [
        "slot",
        {
          institution_id: institution,
          kind: "counselling",
          starts_at: "2035-01-01T10:15:00Z",
          ends_at: "2035-01-01T11:00:00Z",
        },
      ]),
      /exclusion constraint/,
    );
  });
  await asUser(student);
  const { rows: booked } = await rpc("book_slot", [
    "counselling",
    slot,
    "My question",
    1,
  ]);
  const booking = booked[0].result as string;
  await t.test("duplicate active booking is rejected", async () => {
    await assert.rejects(
      rpc("book_slot", ["counselling", slot, "Again", 1]),
      /booked/,
    );
  });
  await asUser(other);
  await t.test(
    "another student cannot read, alter, or overbook the first booking",
    async () => {
      assert.equal(
        (await db.query("select * from public.counselling_bookings")).rows
          .length,
        0,
      );
      await assert.rejects(
        rpc("change_booking", ["counselling", booking, "cancelled", "", ""]),
        /Access denied/,
      );
      await assert.rejects(
        rpc("book_slot", ["counselling", slot, "Other", 1]),
        /booked/,
      );
      await assert.rejects(rpc("booking_report", [{}]), /denied/);
    },
  );
  await asUser(student);
  await t.test("students cannot confirm their own bookings", async () => {
    await assert.rejects(
      rpc("change_booking", [
        "counselling",
        booking,
        "confirmed",
        "",
        "https://meet.google.com/abc-defg-hij",
      ]),
      /Changes are closed/,
    );
  });
  await asUser(owner);
  await t.test(
    "confirmation requires an approved real external URL",
    async () => {
      await assert.rejects(
        rpc("change_booking", [
          "counselling",
          booking,
          "confirmed",
          "",
          "https://evil.test/abc",
        ]),
        /approved HTTPS/,
      );
      await rpc("change_booking", [
        "counselling",
        booking,
        "confirmed",
        "Confirmed",
        "https://meet.google.com/abc-defg-hij",
      ]);
      await assert.rejects(
        rpc("change_booking", ["counselling", booking, "completed", "", ""]),
        /has started/,
      );
    },
  );
  await asUser(student);
  await rpc("change_booking", ["counselling", booking, "cancelled", "", ""]);
  await asUser(other);
  await t.test("cancellation releases capacity", async () => {
    await rpc("book_slot", ["counselling", slot, "Replacement", 1]);
  });
  await asUser(student);
  const { rows: visitBooked } = await rpc("book_slot", [
    "visit",
    visit,
    "Group of two",
    2,
  ]);
  await asUser(other);
  await t.test(
    "campus capacity counts visitors rather than booking rows",
    async () => {
      await assert.rejects(
        rpc("book_slot", ["visit", visit, "Too many", 2]),
        /not enough capacity/,
      );
      await rpc("book_slot", ["visit", visit, "Just me", 1]);
    },
  );
  await asUser(student);
  await rpc("change_booking", [
    "visit",
    visitBooked[0].result,
    "cancelled",
    "",
    "",
  ]);
  await t.test(
    "students cannot write institutions, slots, roles, or notifications directly",
    async () => {
      for (const table of [
        "institutions",
        "counselling_slots",
        "notifications",
      ])
        await assert.rejects(
          db.exec(`delete from public.${table}`),
          /permission denied/,
        );
      await assert.rejects(
        rpc("notify_user", [other, "Bad", "Bad", "test", null]),
        /permission denied/,
      );
    },
  );
  await asUser(owner);
  await t.test(
    "owners cannot approve themselves or grant admin roles through profile updates",
    async () => {
      await assert.rejects(
        rpc("manage_record", [
          "verify",
          { institution_id: institution, status: "approved" },
        ]),
        /Access denied/,
      );
      await rpc("manage_record", [
        "profile",
        { full_name: "Owner", role: "super_admin" },
      ]);
      const { rows } = await db.query<{ role: string }>(
        "select role from public.profiles",
      );
      assert.equal(rows[0].role, "institution_owner");
    },
  );
  await asUser(admin);
  await t.test(
    "admin reports aggregate real records over the selected period",
    async () => {
      const result = await rpc("booking_report", [
        { from: "2020-01-01", to: "2040-01-01" },
      ]);
      assert.ok(result.rows.length > 0);
    },
  );
  await asUser("", "anon");
  await t.test(
    "review notes are not exposed through public institution records",
    async () => {
      const { rows } = await db.query<{ verification_notes: string }>(
        "select verification_notes from public.institutions",
      );
      assert.equal(rows[0].verification_notes, "");
      await assert.rejects(
        db.query("select * from public.institution_reviews"),
        /permission denied/,
      );
    },
  );
  await asUser(owner);
  await t.test(
    "published course names become searchable only after review",
    async () => {
      await rpc("manage_record", [
        "course",
        {
          institution_id: institution,
          name: "Astrophysics",
          stream: "Arts & Science",
          eligibility: "Class 12",
        },
      ]);
      await asUser(admin);
      await rpc("manage_record", [
        "verify",
        {
          institution_id: institution,
          status: "approved",
          notes: "Private review outcome",
        },
      ]);
      await asUser("", "anon");
      const { rows } = await db.query(
        "select name from public.institutions where search_document @@ plainto_tsquery('english','Astrophysics')",
      );
      assert.equal(rows.length, 1);
    },
  );
  await asUser(owner);
  await t.test(
    "private document storage accepts an authorized owner and rejects another student",
    async () => {
      const path = `${institution}/document/test.pdf`;
      await db.query(
        "insert into storage.objects(bucket_id,name) values('institution-private-documents',$1)",
        [path],
      );
      await rpc("record_upload", [
        institution,
        path,
        "document",
        "Official evidence",
      ]);
      await asUser(student);
      assert.equal(
        (
          await db.query(
            "select * from storage.objects where bucket_id='institution-private-documents'",
          )
        ).rows.length,
        0,
      );
      await assert.rejects(
        db.query(
          "insert into storage.objects(bucket_id,name) values('institution-private-documents',$1)",
          [`${institution}/document/forged.pdf`],
        ),
        /row-level security/,
      );
      await assert.rejects(
        rpc("record_upload", [
          institution,
          path,
          "document",
          "Forged reference",
        ]),
        /not authorized/,
      );
    },
  );
  await asUser(owner);
  await t.test(
    "photos are available automatically for published universities while documents remain private",
    async () => {
      const path = `${institution}/media/campus.png`;
      await db.query(
        "insert into storage.objects(bucket_id,name) values('institution-private-documents',$1)",
        [path],
      );
      await rpc("record_upload", [
        institution,
        path,
        "media",
        "University campus",
      ]);
      const { rows } = await db.query<{ id: string }>(
        "select id from public.university_media where storage_path=$1",
        [path],
      );
      assert.equal(rows.length, 1);
      await asUser(student);
      assert.equal(
        (await db.query("select * from public.university_media")).rows.length,
        1,
      );
      assert.equal(
        (
          await db.query(
            "select * from storage.objects where bucket_id='institution-private-documents' and name=$1",
            [path],
          )
        ).rows.length,
        1,
      );
      assert.equal(
        (
          await db.query(
            "select * from storage.objects where bucket_id='institution-private-documents' and name like '%/document/%'",
          )
        ).rows.length,
        0,
      );
      await assert.rejects(
        rpc("record_upload", [
          institution,
          path,
          "media",
          "Unauthorized image",
        ]),
        /not authorized/,
      );
      await asUser(owner);
      assert.equal(
        (
          await db.query<{ cover_image_path: string }>(
            "select cover_image_path from public.institutions where id=$1",
            [institution],
          )
        ).rows[0].cover_image_path,
        path,
      );
      await asUser(owner);
    },
  );
  await t.test(
    "reminders enqueue once and cancellation cutoff is enforced",
    async () => {
      const begins = new Date(Date.now() + 3 * 3600000).toISOString();
      const ends = new Date(Date.now() + 4 * 3600000).toISOString();
      await rpc("manage_record", [
        "slot",
        {
          institution_id: institution,
          kind: "counselling",
          starts_at: begins,
          ends_at: ends,
        },
      ]);
      const { rows } = await db.query<{ id: string }>(
        "select id from public.counselling_slots where starts_at=$1",
        [begins],
      );
      await asUser(student);
      const { rows: created } = await rpc("book_slot", [
        "counselling",
        rows[0].id,
        "Reminder test",
        1,
      ]);
      await assert.rejects(
        rpc("change_booking", [
          "counselling",
          created[0].result,
          "cancelled",
          "",
          "",
        ]),
        /Changes are closed/,
      );
      await asUser(owner);
      await rpc("change_booking", [
        "counselling",
        created[0].result,
        "confirmed",
        "",
        "https://meet.google.com/abc-defg-hij",
      ]);
      await asUser("", "service_role");
      assert.equal((await rpc("queue_reminders", [])).rows[0].result, 1);
      assert.equal((await rpc("queue_reminders", [])).rows[0].result, 0);
    },
  );
  await asUser(owner);
  await rpc("manage_record", [
    "institution",
    {
      institution_id: institution,
      name: "Changed institution",
      city: "Test City",
      state: "Test State",
    },
  ]);
  await asUser("", "anon");
  await t.test(
    "profile edits remove an institution from public discovery pending review",
    async () => {
      assert.equal(
        (await db.query("select * from public.institutions")).rows.length,
        0,
      );
    },
  );
  await asUser(owner);
  await rpc("manage_record", [
    "staff",
    {
      institution_id: institution,
      email: "other@test.invalid",
      permissions: ["bookings"],
      designation: "Counsellor",
    },
  ]);
  await asUser(other);
  await t.test(
    "booking-only staff can see their pending institution and bookings but not documents or review notes",
    async () => {
      assert.equal(
        (await db.query("select * from public.institutions")).rows.length,
        1,
      );
      assert.ok(
        (await db.query("select * from public.counselling_bookings")).rows
          .length > 0,
      );
      assert.equal(
        (
          await db.query(
            "select * from public.institution_verification_documents",
          )
        ).rows.length,
        0,
      );
      assert.equal(
        (await db.query("select * from public.institution_reviews")).rows
          .length,
        0,
      );
      await assert.rejects(
        rpc("manage_record", [
          "institution",
          {
            institution_id: institution,
            name: "Unauthorized edit",
            city: "X",
            state: "Y",
          },
        ]),
        /Access denied/,
      );
      await assert.rejects(
        rpc("manage_record", [
          "staff",
          {
            institution_id: institution,
            email: "student@test.invalid",
            permissions: ["profile"],
          },
        ]),
        /Only the institution owner/,
      );
    },
  );
  await t.test(
    "only administrators can remove, restore, or permanently delete records",
    async () => {
      for (const account of [student, owner, other]) {
        await asUser(account);
        await assert.rejects(
          rpc("admin_listing_action", [
            institution,
            "remove",
            "Not authorized",
          ]),
          /Access denied/,
        );
        await assert.rejects(
          rpc("admin_listing_action", [
            institution,
            "restore",
            "Not authorized",
          ]),
          /Access denied/,
        );
        await assert.rejects(
          rpc("admin_delete_record", [
            "institution",
            institution,
            "Not authorized",
            "DELETE",
          ]),
          /Access denied/,
        );
        await assert.rejects(
          rpc("admin_delete_record", [
            "student",
            student,
            "Not authorized",
            "DELETE",
          ]),
          /Access denied/,
        );
        assert.equal(
          (await db.query("select * from public.admin_storage_cleanup")).rows
            .length,
          0,
        );
      }
      await asUser("", "anon");
      await assert.rejects(
        rpc("admin_delete_record", [
          "student",
          student,
          "Not authorized",
          "DELETE",
        ]),
        /permission denied/,
      );
    },
  );
  await t.test(
    "removed universities preserve bookings, block publication and restore to review",
    async () => {
      await asUser(admin);
      const before = (
        await db.query(
          "select id from public.counselling_bookings where institution_id=$1",
          [institution],
        )
      ).rows.length;
      await rpc("admin_listing_action", [
        institution,
        "remove",
        "Duplicate application",
      ]);
      const { rows } = await db.query<{
        removed_at: string;
        published_at: string | null;
        verification_status: string;
      }>(
        "select removed_at,published_at,verification_status from public.institutions where id=$1",
        [institution],
      );
      assert.ok(rows[0].removed_at);
      assert.equal(rows[0].published_at, null);
      assert.equal(rows[0].verification_status, "suspended");
      assert.equal(
        (
          await db.query(
            "select id from public.counselling_bookings where institution_id=$1",
            [institution],
          )
        ).rows.length,
        before,
      );
      await assert.rejects(
        rpc("manage_record", [
          "verify",
          { institution_id: institution, status: "approved" },
        ]),
        /removed_not_published/,
      );
      await asUser(student);
      assert.equal(
        (
          await db.query("select id from public.institutions where id=$1", [
            institution,
          ])
        ).rows.length,
        0,
      );
      await asUser(admin);
      await rpc("admin_listing_action", [
        institution,
        "restore",
        "Ready for another review",
      ]);
      assert.equal(
        (
          await db.query<{ verification_status: string }>(
            "select verification_status from public.institutions where id=$1",
            [institution],
          )
        ).rows[0].verification_status,
        "pending",
      );
      await assert.rejects(
        rpc("admin_listing_action", [
          institution,
          "restore",
          "Duplicate restore",
        ]),
        /not removed/,
      );
      assert.equal(
        (
          await db.query(
            "select id from public.audit_logs where entity_id=$1 and action in ('institution_remove','institution_restore')",
            [institution],
          )
        ).rows.length,
        2,
      );
    },
  );
  await t.test(
    "permanent deletion requires confirmation and protects privileged accounts",
    async () => {
      await asUser(admin);
      await assert.rejects(
        rpc("admin_delete_record", [
          "student",
          student,
          "Account requested deletion",
          "no",
        ]),
        /Type DELETE/,
      );
      await assert.rejects(
        rpc("admin_delete_record", ["student", student, "", "DELETE"]),
        /reason/,
      );
      await assert.rejects(
        rpc("admin_delete_record", [
          "student",
          admin,
          "Attempt self deletion",
          "DELETE",
        ]),
        /protected/,
      );
      await assert.rejects(
        rpc("admin_delete_record", [
          "student",
          owner,
          "Attempt owner deletion",
          "DELETE",
        ]),
        /protected/,
      );
      await assert.rejects(
        rpc("admin_delete_record", [
          "unknown",
          student,
          "Unknown kind",
          "DELETE",
        ]),
        /Unknown deletion target/,
      );
    },
  );
  await t.test(
    "student deletion removes authentication and dependent records with an audit trail",
    async () => {
      await db.exec("reset role");
      await db.query(
        "insert into storage.objects(bucket_id,name) values('user-avatars',$1)",
        [student + "/avatar.png"],
      );
      await asUser(student);
      await rpc("manage_record", ["delete_account", {}]);
      await asUser(admin);
      await rpc("admin_delete_record", [
        "student",
        student,
        "Student requested account removal",
        "DELETE",
      ]);
      for (const table of [
        "profiles",
        "account_deletion_requests",
        "counselling_bookings",
        "campus_visit_bookings",
        "saved_institutions",
        "student_interests",
      ]) {
        const column =
          table === "profiles"
            ? "id"
            : table === "account_deletion_requests"
              ? "user_id"
              : "student_id";
        assert.equal(
          (
            await db.query(`select * from public.${table} where ${column}=$1`, [
              student,
            ])
          ).rows.length,
          0,
          table,
        );
      }
      assert.equal(
        (
          await db.query(
            "select * from public.audit_logs where entity_id=$1 and action='student_permanently_deleted'",
            [student],
          )
        ).rows.length,
        1,
      );
      assert.equal(
        (
          await db.query(
            "select * from public.admin_storage_cleanup where bucket='user-avatars' and path=$1",
            [student + "/avatar.png"],
          )
        ).rows.length,
        1,
      );
      await db.exec("reset role");
      assert.equal(
        (await db.query("select * from auth.users where id=$1", [student])).rows
          .length,
        0,
      );
    },
  );
  await t.test(
    "university deletion removes dependent records and queues durable file cleanup",
    async () => {
      await db.exec("reset role");
      await db.query(
        "insert into storage.objects(bucket_id,name) values('institution-public-media',$1)",
        [institution + "/media/test.jpg"],
      );
      await asUser(admin);
      await rpc("admin_delete_record", [
        "institution",
        institution,
        "Permanent duplicate removal",
        "DELETE",
      ]);
      for (const table of [
        "institutions",
        "courses",
        "institution_staff",
        "institution_reviews",
        "institution_verification_documents",
        "counselling_slots",
        "campus_visit_slots",
        "counselling_bookings",
        "campus_visit_bookings",
        "contact_enquiries",
      ]) {
        const column = table === "institutions" ? "id" : "institution_id";
        assert.equal(
          (
            await db.query(`select * from public.${table} where ${column}=$1`, [
              institution,
            ])
          ).rows.length,
          0,
          table,
        );
      }
      assert.equal(
        (
          await db.query(
            "select * from public.audit_logs where entity_id=$1 and action='institution_permanently_deleted'",
            [institution],
          )
        ).rows.length,
        1,
      );
      assert.equal(
        (
          await db.query(
            "select * from public.admin_storage_cleanup where bucket='institution-public-media' and path=$1",
            [institution + "/media/test.jpg"],
          )
        ).rows.length,
        1,
      );
      assert.ok(
        (
          await db.query(
            "select * from storage.objects where bucket_id='institution-public-media' and name=$1",
            [institution + "/media/test.jpg"],
          )
        ).rows.length,
        "Files stay accessible for Storage API cleanup after deletion",
      );
      await db.exec("reset role");
      assert.equal(
        (await db.query("select * from auth.users where id=$1", [owner])).rows
          .length,
        1,
        "Institution owner's account is preserved",
      );
    },
  );
  await t.test(
    "pending file cleanup is visible and writable only to administrators",
    async () => {
      await asUser(other);
      assert.equal(
        (await db.query("select * from public.admin_storage_cleanup")).rows
          .length,
        0,
      );
      await db.exec("delete from public.admin_storage_cleanup");
      await asUser(admin);
      const jobs = (
        await db.query("select * from public.admin_storage_cleanup")
      ).rows;
      assert.ok(
        jobs.length >= 2,
        "Non-admin deletion does not acknowledge any cleanup jobs",
      );
    },
  );
  await t.test(
    "university setup requires saved details and uploads, preserves categories, and rejects other users",
    async () => {
      await db.exec("reset role");
      const setupOwner = "00000000-0000-4000-8000-000000000088";
      await db.query(
        "insert into auth.users(id,email) values($1,'setup@test.invalid')",
        [setupOwner],
      );
      await asUser(setupOwner);
      const { rows } = await rpc("submit_institution", [
        {
          name: "Setup University",
          institution_type: "University",
          official_email: "setup@test.invalid",
          city: "Test City",
          state: "Test State",
        },
      ]);
      const id = rows[0].result;
      const status = async () =>
        (
          await db.query<{
            result: {
              profile: boolean;
              courses: boolean;
              gallery: boolean;
              documents: boolean;
              complete: boolean;
            };
          }>("select public.university_setup_status($1) as result", [id])
        ).rows[0].result;
      assert.deepEqual(await status(), {
        profile: false,
        courses: false,
        gallery: false,
        documents: false,
        complete: false,
      });
      await assert.rejects(
        rpc("complete_university_setup_step", [id, "finish"]),
        /Complete your profile/,
      );
      await assert.rejects(
        rpc("complete_university_setup_step", [id, "profile"]),
        /overview/,
      );
      await rpc("manage_record", [
        "institution",
        {
          institution_id: id,
          name: "Setup University",
          description: "A university overview",
          city: "Test City",
          state: "Test State",
          address: "123 Campus Road",
          phone: "9876543210",
        },
      ]);
      await rpc("complete_university_setup_step", [id, "profile"]);
      assert.equal((await status()).profile, true);
      await rpc("manage_record", [
        "course",
        { institution_id: id, name: "Computer Science", stream: "Engineering" },
      ]);
      for (const category of [
        "hostel",
        "infrastructure",
        "lab",
        "library",
        "sports",
        "other",
        "campus",
      ]) {
        const path = `${id}/media/${category}.png`;
        await db.query(
          "insert into storage.objects(bucket_id,name) values('institution-private-documents',$1)",
          [path],
        );
        await assert.rejects(
          rpc("record_categorized_upload", [
            id,
            path,
            "media",
            "Sample photograph",
            "invalid",
          ]),
          /valid gallery category/,
        );
        await asUser(student);
        await assert.rejects(
          rpc("record_categorized_upload", [
            id,
            path,
            "media",
            "Sample photograph",
            category,
          ]),
          /not authorized/,
        );
        await assert.rejects(
          rpc("complete_university_setup_step", [id, "finish"]),
          /access denied/,
        );
        await asUser(setupOwner);
        await rpc("record_categorized_upload", [
          id,
          path,
          "media",
          "Sample photograph",
          category,
        ]);
        const saved = await db.query<{
          media_category: string;
          is_published: boolean;
        }>(
          "select media_category,is_published from public.university_media where storage_path=$1",
          [path],
        );
        assert.equal(saved.rows[0].media_category, category);
        assert.equal(saved.rows[0].is_published, true);
        assert.equal((await status()).gallery, false);
      }
      await assert.rejects(
        rpc("complete_university_setup_step", [id, "finish"]),
        /at least 3 photos/,
      );
      for (const category of [
        "campus",
        "hostel",
        "infrastructure",
        "lab",
        "library",
        "sports",
        "other",
      ]) {
        for (const number of [2, 3]) {
          assert.equal((await status()).gallery, false);
          const path = `${id}/media/${category}-${number}.png`;
          await db.query(
            "insert into storage.objects(bucket_id,name) values('institution-private-documents',$1)",
            [path],
          );
          await rpc("record_categorized_upload", [
            id,
            path,
            "media",
            "Additional university photo",
            category,
          ]);
        }
      }
      assert.equal((await status()).gallery, true);
      assert.equal((await status()).documents, false);
      await rpc("complete_university_setup_step", [id, "finish"]);
      assert.equal((await status()).complete, true);
      const path = `${id}/document/verification.pdf`;
      await db.query(
        "insert into storage.objects(bucket_id,name) values('institution-private-documents',$1)",
        [path],
      );
      await rpc("record_categorized_upload", [
        id,
        path,
        "document",
        "University certificate",
        "campus",
      ]);
      await rpc("complete_university_setup_step", [id, "finish"]);
      assert.equal((await status()).complete, true);
      const publication = await db.query<{
        verification_status: string;
        published_at: string | null;
      }>(
        "select verification_status,published_at from public.institutions where id=$1",
        [id],
      );
      assert.equal(publication.rows[0].verification_status, "approved");
      assert.ok(publication.rows[0].published_at);
    },
  );
  await t.test(
    "course quota fee ranges validate and persist through the authorized workflow",
    async () => {
      await db.exec("reset role");
      const setupOwner = "00000000-0000-4000-8000-000000000088";
      const { rows: institutions } = await db.query<{ id: string }>(
        "select id from public.institutions where owner_user_id=$1",
        [setupOwner],
      );
      const institution_id = institutions[0].id;
      await asUser(setupOwner);
      const payload = {
        institution_id,
        name: "Pharmacy",
        stream: "Pharmacy",
        degree_type: "B.Pharm.",
        counselling_fee_min: "50000",
        counselling_fee_max: "75000",
        management_fee_min: "100000",
        management_fee_max: "150000",
        fee_period: "Per year",
      };
      await rpc("manage_record", ["course", payload]);
      const { rows } = await db.query<{
        id: string;
        counselling_fee_min: string;
        management_fee_max: string;
        published_fee_amount: string;
      }>(
        "select * from public.courses where institution_id=$1 and name='Pharmacy'",
        [institution_id],
      );
      assert.equal(Number(rows[0].counselling_fee_min), 50000);
      assert.equal(Number(rows[0].management_fee_max), 150000);
      assert.equal(Number(rows[0].published_fee_amount), 50000);
      for (const invalid of [
        { counselling_fee_max: "40000" },
        { counselling_fee_min: "-1" },
        { management_fee_max: "" },
        { fee_period: "invalid" },
      ]) {
        await assert.rejects(
          rpc("manage_record", ["course", { ...payload, ...invalid }]),
          /check constraint/,
        );
      }
      await asUser(student);
      await assert.rejects(
        rpc("manage_record", ["course", { ...payload, id: rows[0].id }]),
        /Access denied/,
      );
      await asUser(setupOwner);
      await rpc("manage_record", [
        "course",
        {
          ...payload,
          id: rows[0].id,
          counselling_fee_min: "",
          counselling_fee_max: "",
          management_fee_min: "0",
          management_fee_max: "0",
          fee_period: "Entire course",
        },
      ]);
      const updated = (
        await db.query<{
          counselling_fee_min: null;
          management_fee_min: string;
          fee_period: string;
          is_published: boolean;
        }>("select * from public.courses where id=$1", [rows[0].id])
      ).rows[0];
      assert.equal(updated.counselling_fee_min, null);
      assert.equal(Number(updated.management_fee_min), 0);
      assert.equal(updated.fee_period, "Entire course");
      assert.equal(updated.is_published, true);
      const listing = (
        await db.query<{
          verification_status: string;
          published_at: string | null;
        }>(
          "select verification_status,published_at from public.institutions where id=$1",
          [institution_id],
        )
      ).rows[0];
      assert.equal(listing.verification_status, "approved");
      assert.ok(listing.published_at);
    },
  );
  await t.test(
    "multiple programme selections save atomically without duplicates or cross-university edits",
    async () => {
      await db.exec("reset role");
      const ownerId = "00000000-0000-4000-8000-000000000088";
      const id = (
        await db.query<{ id: string }>(
          "select id from public.institutions where owner_user_id=$1",
          [ownerId],
        )
      ).rows[0].id;
      const programmes = [
        {
          name: "Data Science",
          stream: "Engineering",
          degree_type: "B.Tech.",
          counselling_fee_min: "100",
          counselling_fee_max: "200",
        },
        {
          name: "Data Science",
          stream: "Engineering",
          degree_type: "M.Tech.",
          management_fee_min: "300",
          management_fee_max: "400",
        },
        { name: "Accounting", stream: "Commerce", degree_type: "B.Com." },
      ];
      await asUser(ownerId);
      assert.equal(
        (await rpc("save_course_selection", [id, programmes])).rows[0].result,
        3,
      );
      assert.equal(
        (await rpc("save_course_selection", [id, programmes])).rows[0].result,
        0,
      );
      const count = async () =>
        (
          await db.query(
            "select id from public.courses where institution_id=$1",
            [id],
          )
        ).rows.length;
      const before = await count();
      await assert.rejects(
        rpc("save_course_selection", [
          id,
          [
            {
              name: "Rollback test",
              stream: "Engineering",
              degree_type: "B.E.",
            },
            {
              name: "Invalid",
              stream: "Engineering",
              degree_type: "B.E.",
              management_fee_min: "200",
              management_fee_max: "100",
            },
          ],
        ]),
        /check constraint/,
      );
      assert.equal(await count(), before);
      await assert.rejects(
        rpc("save_course_selection", [id, []]),
        /between 1 and 100/,
      );
      await assert.rejects(
        rpc("save_course_selection", [
          id,
          [{ name: "No degree", stream: "Engineering" }],
        ]),
        /Choose a degree/,
      );
      await asUser(student);
      await assert.rejects(
        rpc("save_course_selection", [id, programmes]),
        /Access denied/,
      );
    },
  );
  await t.test(
    "tour workflow accepts Maps share links and preserves permission checks",
    async () => {
      await db.exec("reset role");
      const ownerId = "00000000-0000-4000-8000-000000000088";
      const id = (
        await db.query<{ id: string }>(
          "select id from public.institutions where owner_user_id=$1",
          [ownerId],
        )
      ).rows[0].id;
      const payload = {
        institution_id: id,
        title: "Campus tour",
        tour_url: "https://maps.app.goo.gl/example",
      };
      await asUser(ownerId);
      await rpc("manage_record", ["tour", payload]);
      const tours = (
        await db.query<{ is_published: boolean }>(
          "select is_published from public.institution_tours where institution_id=$1",
          [id],
        )
      ).rows;
      assert.ok(tours.length > 0 && tours.every((tour) => tour.is_published));
      for (const tour_url of [
        "http://maps.app.goo.gl/example",
        "https://maps.app.goo.gl.evil.test/example",
        "https://maps.app.goo.gl@evil.test/example",
      ])
        await assert.rejects(
          rpc("manage_record", ["tour", { ...payload, tour_url }]),
          /approved tour URL/,
        );
      await asUser(student);
      await assert.rejects(
        rpc("manage_record", ["tour", payload]),
        /media access/,
      );
    },
  );
  await db.close();
});
